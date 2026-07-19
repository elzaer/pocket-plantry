import { pb } from "./pocketbase";

export async function fetchShoppingList(householdId) {
  return pb.collection("shopping_list_items").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    expand: "generic_item,fulfilled_by_product",
    sort: "-created",
  });
}

// Manually adding a requirement, ahead of Epic 4's generation logic — the
// unique-open-per-generic-item index (DB.md) rejects a duplicate; callers
// should catch that and surface it as "already on the list".
export async function addManualRequirement({ householdId, genericItemId }) {
  return pb.collection("shopping_list_items").create({
    household: householdId,
    generic_item: genericItemId,
    source: "manual",
    status: "open",
  });
}
