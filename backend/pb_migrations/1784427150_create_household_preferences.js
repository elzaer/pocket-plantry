/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");
  const genericItems = app.findCollectionByNameOrId("generic_items");
  const products = app.findCollectionByNameOrId("products");

  const collection = new Collection({
    name: "household_preferences",
    type: "base",
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
        name: "preferred_product",
        type: "relation",
        required: true,
        collectionId: products.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_household_preferences_household_item ON household_preferences (household, generic_item)",
    ],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("household_preferences");
  app.delete(collection);
});
