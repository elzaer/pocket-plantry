import { pb } from "./pocketbase";

// One query for every ingredient across every meal in a plan, grouped
// client-side by meal — avoids an N+1 fetch per meal.
export async function fetchMealItemsForPlan(mealPlanId) {
  return pb.collection("meal_items").getFullList({
    filter: pb.filter("meal.meal_plan = {:p}", { p: mealPlanId }),
    expand: "generic_item",
    sort: "created",
  });
}

// Ingredients default to "one unit of the matching generic item" — no
// quantity captured yet (ROADMAP.md Epic 1 / CLAUDE.md future-proofing).
export async function addMealItem({ mealId, genericItemId }) {
  return pb.collection("meal_items").create({
    meal: mealId,
    generic_item: genericItemId,
  });
}

export async function removeMealItem(mealItemId) {
  return pb.collection("meal_items").delete(mealItemId);
}

// Epic 1 acceptance: a saved meal plan can be reduced to a flat list of
// generic item ids needed for the week. Takes the meal_items already fetched
// by fetchMealItemsForPlan rather than re-fetching them.
export function weeklyGenericItemsFrom(items) {
  const seen = new Map();
  for (const item of items) {
    if (item.expand?.generic_item) {
      seen.set(item.generic_item, item.expand.generic_item);
    }
  }
  return [...seen.values()];
}
