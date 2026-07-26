/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");

  const collection = new Collection({
    name: "meal_plans",
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
        name: "week_start_date",
        type: "date",
        required: true,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_meal_plans_household_week ON meal_plans (household, week_start_date)",
    ],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("meal_plans");
  app.delete(collection);
});
