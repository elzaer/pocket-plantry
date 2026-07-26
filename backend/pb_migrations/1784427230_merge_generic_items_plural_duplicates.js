/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Follow-up to 1784427220: that migration only merged exact (trimmed,
  // case-insensitive) name duplicates, since a DB unique index can't safely
  // encode plural-insensitivity. This merges the remaining cases the same
  // way the frontend now matches them at pick-time (see
  // normalizeGenericItemName in frontend/src/lib/genericItems.js) — e.g. a
  // pre-existing "Potato" and "Potatoes" pair for the same household.
  function normalize(name) {
    const s = name.trim().toLowerCase();
    if (s.endsWith("es")) return s.slice(0, -2);
    if (s.endsWith("s")) return s.slice(0, -1);
    return s;
  }

  const items = app.findAllRecords("generic_items");
  const groups = new Map();
  for (const item of items) {
    const key = item.get("household") + "::" + normalize(item.get("name"));
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  const referencingCollections = [
    "products",
    "household_preferences",
    "shopping_list_items",
    "pantry_stock",
    "meal_items",
  ];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => (a.get("created") < b.get("created") ? -1 : 1));
    const [canonical, ...duplicates] = group;
    for (const dup of duplicates) {
      for (const collectionName of referencingCollections) {
        const referencing = app.findRecordsByFilter(
          collectionName,
          "generic_item = {:id}",
          "",
          0,
          0,
          { id: dup.id },
        );
        for (const record of referencing) {
          record.set("generic_item", canonical.id);
          try {
            app.save(record);
          } catch (_) {
            app.delete(record);
          }
        }
      }
      app.delete(dup);
    }
  }
}, (_app) => {
  // Not reversible — merged records can't be un-merged.
});
