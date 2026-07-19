import { pb } from "./pocketbase";

export async function fetchMeals(mealPlanId) {
  return pb.collection("meals").getFullList({
    filter: pb.filter("meal_plan = {:p}", { p: mealPlanId }),
    sort: "created",
  });
}

export async function createMeal({ mealPlanId, name, mealDate }) {
  return pb.collection("meals").create({
    meal_plan: mealPlanId,
    name,
    meal_date: mealDate || null,
  });
}

export async function deleteMeal(mealId) {
  return pb.collection("meals").delete(mealId);
}
