/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");

  const collection = new Collection({
    name: "generic_items",
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
        name: "name",
        type: "text",
        required: true,
        max: 150,
      },
      {
        name: "category",
        type: "text",
        max: 100,
      },
      {
        // Future-proofing, unused by any current logic — CLAUDE.md.
        name: "default_unit",
        type: "text",
        max: 30,
      },
      {
        // Marks membership in the Epic 2 recurring-requirements list.
        name: "is_recurring",
        type: "bool",
      },
    ],
    indexes: [
      "CREATE INDEX idx_generic_items_household ON generic_items (household)",
    ],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("generic_items");
  app.delete(collection);
});
