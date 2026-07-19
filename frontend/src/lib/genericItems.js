import { pb } from "./pocketbase";

export async function fetchGenericItems(householdId) {
  return pb.collection("generic_items").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    sort: "name",
  });
}

// picked is either { mode: "existing", id } or { mode: "new", name }
// (see GenericItemPicker) — returns the generic_item id to link a product to.
export async function resolveGenericItemId(householdId, picked) {
  if (picked.mode === "existing") return picked.id;

  const created = await pb.collection("generic_items").create({
    household: householdId,
    name: picked.name,
  });
  return created.id;
}
