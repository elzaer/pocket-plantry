import { pb } from "./pocketbase";
import { fetchGenericItems } from "./genericItems";

export async function fetchPantryStock(householdId) {
  return pb.collection("pantry_stock").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    expand: "generic_item,product",
    sort: "-updated",
  });
}

// Full-catalog view for Epic 3's "walk the pantry" pass: every generic item
// the household tracks, merged with its pantry_stock row if one exists.
// Items never scanned/adjusted default to hasStock: false — this is what
// makes "reliably reflects has/doesn't-have for EVERY generic item" true
// structurally, instead of only showing items that already have a row.
export async function fetchPantryCatalog(householdId) {
  const [items, stockRows] = await Promise.all([
    fetchGenericItems(householdId),
    fetchPantryStock(householdId),
  ]);
  const stockByItem = new Map(stockRows.map((row) => [row.generic_item, row]));
  return items.map((item) => {
    const stock = stockByItem.get(item.id);
    return {
      genericItemId: item.id,
      name: item.name,
      hasStock: stock?.has_stock ?? false,
    };
  });
}

// has/doesn't-have per generic item, no quantity (CLAUDE.md). Finds the
// existing row for this household+generic_item and updates it, or creates
// one — used by both the checkout-scan flow and manual pantry adjustments.
export async function upsertPantryStock({
  householdId,
  genericItemId,
  productId,
  hasStock,
  source,
}) {
  const existing = await getFirstOrNull(
    "pantry_stock",
    pb.filter("household = {:h} && generic_item = {:g}", {
      h: householdId,
      g: genericItemId,
    }),
  );

  const data = {
    has_stock: hasStock,
    source,
    ...(productId ? { product: productId } : {}),
  };

  return existing
    ? pb.collection("pantry_stock").update(existing.id, data)
    : pb.collection("pantry_stock").create({
        household: householdId,
        generic_item: genericItemId,
        ...data,
      });
}

async function getFirstOrNull(collection, filter) {
  try {
    return await pb.collection(collection).getFirstListItem(filter);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
