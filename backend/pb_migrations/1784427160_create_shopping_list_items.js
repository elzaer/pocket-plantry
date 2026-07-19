/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");
  const genericItems = app.findCollectionByNameOrId("generic_items");
  const products = app.findCollectionByNameOrId("products");

  const collection = new Collection({
    name: "shopping_list_items",
    type: "base",
    // Table only — list *generation* is Epic 4. Exists now because Epic 0's
    // checkout-scan flow marks open entries fulfilled (CLAUDE.md / ROADMAP.md).
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
        name: "source",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["meal_plan", "requirement", "manual"],
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["open", "fulfilled"],
      },
      {
        name: "fulfilled_by_product",
        type: "relation",
        collectionId: products.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        name: "fulfilled_at",
        type: "date",
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_shopping_list_open_item ON shopping_list_items (household, generic_item) WHERE status = 'open'",
    ],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("shopping_list_items");
  app.delete(collection);
});
