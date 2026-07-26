/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const mealPlans = app.findCollectionByNameOrId("meal_plans");

  const collection = new Collection({
    name: "meals",
    type: "base",
    fields: [
      {
        name: "meal_plan",
        type: "relation",
        required: true,
        collectionId: mealPlans.id,
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
        name: "meal_date",
        type: "date",
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_meals_meal_plan ON meals (meal_plan)",
    ],
    // household-scoping happens through the meal_plan relation — a meal has
    // no direct household field (DB.md).
    listRule: "meal_plan.household = @request.auth.household",
    viewRule: "meal_plan.household = @request.auth.household",
    createRule: "meal_plan.household = @request.auth.household",
    updateRule: "meal_plan.household = @request.auth.household",
    deleteRule: "meal_plan.household = @request.auth.household",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("meals");
  app.delete(collection);
});
