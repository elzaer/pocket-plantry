/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");
  const genericItems = app.findCollectionByNameOrId("generic_items");
  const products = app.findCollectionByNameOrId("products");

  const collection = new Collection({
    name: "pantry_stock",
    type: "base",
    // has/doesn't-have per generic item, no quantity (CLAUDE.md: no pack-size
    // normalization). Written to by the Epic 0 checkout-scan flow; manual
    // "walk the pantry" adjustments land here too (Epic 3).
    fields: [
      {
        name: "household",
        type: "relation",
        required: true,
        collectionId: households.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      {
        name: "generic_item",
        type: "relation",
        required: true,
        collectionId: genericItems.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      {
        name: "product",
        type: "relation",
        collectionId: products.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        name: "has_stock",
        type: "bool",
      },
      {
        name: "source",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["scan", "receipt_import", "manual_adjustment"],
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_pantry_stock_household_item ON pantry_stock (household, generic_item)",
    ],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pantry_stock");
  app.delete(collection);
});
