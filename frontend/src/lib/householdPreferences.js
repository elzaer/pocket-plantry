import { pb } from "./pocketbase";

export async function fetchPreferredProducts(householdId) {
  return pb.collection("household_preferences").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    expand: "preferred_product",
  });
}

export function preferredProductByGenericItem(preferences) {
  return new Map(preferences.map((pref) => [pref.generic_item, pref]));
}

// Create-or-update, mirroring pantryStock.js's upsertPantryStock exactly.
export async function setPreferredProduct({ householdId, genericItemId, productId }) {
  const existing = await getFirstOrNull(
    pb.filter("household = {:h} && generic_item = {:g}", {
      h: householdId,
      g: genericItemId,
    }),
  );

  return existing
    ? pb.collection("household_preferences").update(existing.id, { preferred_product: productId })
    : pb.collection("household_preferences").create({
        household: householdId,
        generic_item: genericItemId,
        preferred_product: productId,
      });
}

async function getFirstOrNull(filter) {
  try {
    return await pb.collection("household_preferences").getFirstListItem(filter);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
