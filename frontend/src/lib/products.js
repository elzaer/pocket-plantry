import { pb } from "./pocketbase";

// products is a small, slow-growing GLOBAL catalog (not household-scoped).
// Fetching everything and grouping client-side matches this codebase's
// established convention (pantryStock.js's fetchPantryCatalog).
export async function fetchProducts(options = {}) {
  return pb.collection("products").getFullList({
    sort: "name",
    ...options,
  });
}

// products[] -> Map<generic_item id, product[]>, so a shopping list row can
// look up candidates in O(1). Products with no generic_item mapped yet are
// excluded — they aren't a candidate for anything.
export function productsByGenericItem(products) {
  const map = new Map();
  for (const product of products) {
    if (!product.generic_item) continue;
    const list = map.get(product.generic_item) || [];
    list.push(product);
    map.set(product.generic_item, list);
  }
  return map;
}
