import { pb } from "./pocketbase";
import { fetchProductByBarcode } from "./openFoodFacts";

// Barcode resolution chain (CLAUDE.md): local cache -> Open Food Facts ->
// optional paid fallback (not implemented, skipped) -> manual entry.
// Stops at the first hit. A hit still needs mapping to a generic item if
// this is the first time *this household* has seen the product.
export async function resolveBarcode(barcode) {
  const cached = await findCachedProduct(barcode);
  if (cached) {
    return cached.generic_item
      ? { status: "resolved", product: cached }
      : { status: "needs_mapping", product: cached };
  }

  const offProduct = await fetchProductByBarcode(barcode);
  if (offProduct) {
    const created = await pb.collection("products").create(offProduct);
    return { status: "needs_mapping", product: created };
  }

  return { status: "not_found", barcode };
}

async function findCachedProduct(barcode) {
  try {
    return await pb
      .collection("products")
      .getFirstListItem(pb.filter("barcode = {:barcode}", { barcode }), {
        expand: "generic_item",
      });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
