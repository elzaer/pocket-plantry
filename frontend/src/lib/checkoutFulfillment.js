import { pb } from "./pocketbase";

async function getFirstOrNull(collection, filter) {
  try {
    return await pb.collection(collection).getFirstListItem(filter);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Epic 0's checkout story: a scanned product resolves to its generic item,
// marks any matching open shopping list entry fulfilled, and always logs
// to pantry stock (CLAUDE.md / ROADMAP.md).
export async function logCheckoutScan({ householdId, genericItemId, productId }) {
  const openListItem = await getFirstOrNull(
    "shopping_list_items",
    pb.filter("household = {:h} && generic_item = {:g} && status = 'open'", {
      h: householdId,
      g: genericItemId,
    }),
  );
  if (openListItem) {
    await pb.collection("shopping_list_items").update(openListItem.id, {
      status: "fulfilled",
      fulfilled_by_product: productId,
      fulfilled_at: new Date().toISOString(),
    });
  }

  const stock = await getFirstOrNull(
    "pantry_stock",
    pb.filter("household = {:h} && generic_item = {:g}", {
      h: householdId,
      g: genericItemId,
    }),
  );
  if (stock) {
    await pb.collection("pantry_stock").update(stock.id, {
      product: productId,
      has_stock: true,
      source: "scan",
    });
  } else {
    await pb.collection("pantry_stock").create({
      household: householdId,
      generic_item: genericItemId,
      product: productId,
      has_stock: true,
      source: "scan",
    });
  }

  return { fulfilledListItem: Boolean(openListItem) };
}
