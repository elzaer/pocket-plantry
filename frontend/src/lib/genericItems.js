import { pb } from "./pocketbase";

export async function fetchGenericItems(householdId, options = {}) {
  return pb.collection("generic_items").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    sort: "name",
    ...options,
  });
}

// Case/whitespace/simple-plural-insensitive key for comparing generic item
// names — "Broccoli", "broccoli ", "Carrots" vs "carrot", and "Potato" vs
// "Potatoes" should all reconcile to the same generic item instead of
// creating duplicates. Simple suffix-stripping, not real stemming — good
// enough for household grocery nouns, not guaranteed for every word.
export function normalizeGenericItemName(name) {
  const s = name.trim().toLowerCase();
  if (s.endsWith("es")) return s.slice(0, -2);
  if (s.endsWith("s")) return s.slice(0, -1);
  return s;
}

async function findMatchingGenericItem(householdId, name) {
  const normalized = normalizeGenericItemName(name);
  const items = await fetchGenericItems(householdId);
  return items.find((item) => normalizeGenericItemName(item.name) === normalized) || null;
}

// picked is either { mode: "existing", id } or { mode: "new", name }
// (see GenericItemPicker) — returns the generic_item id to link a product to.
// Re-checks against the household's current generic items (rather than
// trusting the picker's possibly-stale snapshot) before creating, so the
// same ingredient typed from two different pickers reconciles to one record.
export async function resolveGenericItemId(householdId, picked) {
  if (picked.mode === "existing") return picked.id;

  const name = picked.name.trim();
  const match = await findMatchingGenericItem(householdId, name);
  if (match) return match.id;

  try {
    const created = await pb.collection("generic_items").create({
      household: householdId,
      name,
    });
    return created.id;
  } catch (err) {
    // Someone else (or another tab) created the same item in the race
    // between the check above and this create — the household's unique
    // index rejected it, so fall back to the record that won.
    const retryMatch = await findMatchingGenericItem(householdId, name);
    if (retryMatch) return retryMatch.id;
    throw err;
  }
}
