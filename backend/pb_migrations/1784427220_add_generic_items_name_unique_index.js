/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Before this migration, nothing stopped the same household from ending up
  // with multiple generic_items rows for the same ingredient (e.g. "Broccoli"
  // added twice from two different pickers). Merge those into one canonical
  // record per (household, name) — reassigning every reference, and falling
  // back to deleting the now-redundant reference if reassigning it would
  // collide with an existing uniqueness constraint (pantry_stock,
  // household_preferences, and open shopping_list_items are all unique per
  // generic_item already) — so the unique index added below can actually be
  // created.
  const items = app.findAllRecords("generic_items");
  const groups = new Map();
  for (const item of items) {
    const key = item.get("household") + "::" + item.get("name").trim().toLowerCase();
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

  const collection = app.findCollectionByNameOrId("generic_items");
  collection.indexes = [
    ...collection.indexes,
    "CREATE UNIQUE INDEX idx_generic_items_household_name ON generic_items (household, name COLLATE NOCASE)",
  ];
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("generic_items");
  collection.indexes = collection.indexes.filter(
    (idx) => !idx.includes("idx_generic_items_household_name"),
  );
  app.save(collection);
});
