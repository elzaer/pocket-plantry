/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const meals = app.findCollectionByNameOrId("meals");
  const genericItems = app.findCollectionByNameOrId("generic_items");

  const collection = new Collection({
    name: "meal_items",
    type: "base",
    fields: [
      {
        name: "meal",
        type: "relation",
        required: true,
        collectionId: meals.id,
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
        // Future-proofing, unused by any current logic — CLAUDE.md / ROADMAP.md
        // Epic 1. Every ingredient defaults to "1 of the generic item".
        name: "quantity",
        type: "number",
      },
      {
        name: "unit",
        type: "text",
        max: 30,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_meal_items_meal ON meal_items (meal)",
    ],
    // household-scoping traverses meal -> meal_plan -> household.
    listRule: "meal.meal_plan.household = @request.auth.household",
    viewRule: "meal.meal_plan.household = @request.auth.household",
    createRule: "meal.meal_plan.household = @request.auth.household",
    updateRule: "meal.meal_plan.household = @request.auth.household",
    deleteRule: "meal.meal_plan.household = @request.auth.household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("meal_items");
  app.delete(collection);
});
