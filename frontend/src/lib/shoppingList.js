import { pb } from "./pocketbase";
import { startOfWeek, fetchOrCreateMealPlan } from "./mealPlans";
import { fetchMealItemsForPlan, weeklyGenericItemsFrom } from "./mealItems";
import { fetchRequirements } from "./genericItems";
import { fetchPantryStock } from "./pantryStock";

export async function fetchShoppingList(householdId) {
  return pb.collection("shopping_list_items").getFullList({
    filter: pb.filter("household = {:h}", { h: householdId }),
    expand: "generic_item,fulfilled_by_product",
    sort: "-created",
  });
}

// Manually adding a requirement, ahead of Epic 4's generation logic — the
// unique-open-per-generic-item index (DB.md) rejects a duplicate; callers
// should catch that and surface it as "already on the list".
export async function addManualRequirement({ householdId, genericItemId }) {
  return pb.collection("shopping_list_items").create({
    household: householdId,
    generic_item: genericItemId,
    source: "manual",
    status: "open",
  });
}

// Epic 4: reconciles the shopping list against this week's meal plan +
// recurring requirements, minus current stock. Both directions: adds newly
// needed items, AND removes open meal_plan/requirement entries no longer
// needed. Manual entries (source: "manual") are never touched by removal.
//
// Concurrency note: the create/delete loops below MUST stay sequential
// (for...of + await), not Promise.all/map. PocketBase auto-cancels
// concurrent requests to the same collection+method by default; parallel
// creates in the same run would abort each other with a non-400 error that
// the catch below deliberately does not swallow, silently dropping a
// legitimately-needed item. The 400/404 tolerance below exists for real
// concurrent runs (two tabs, rapid reloads) — React StrictMode's dev-only
// double-invoke doesn't even need it, since PocketBase's same-key
// auto-cancel already kills the stale run's first read before it reaches a
// write.
export async function generateShoppingList(householdId) {
  const plan = await fetchOrCreateMealPlan(householdId, startOfWeek());
  const mealItems = await fetchMealItemsForPlan(plan.id);
  const mealPlanNeeds = weeklyGenericItemsFrom(mealItems);
  const requirements = await fetchRequirements(householdId);
  const stockRows = await fetchPantryStock(householdId);
  const inStock = new Set(stockRows.filter((r) => r.has_stock).map((r) => r.generic_item));

  const origins = new Map(); // generic_item id -> Set("meal_plan" | "requirement")
  for (const item of mealPlanNeeds) {
    if (inStock.has(item.id)) continue;
    origins.set(item.id, (origins.get(item.id) || new Set()).add("meal_plan"));
  }
  for (const item of requirements) {
    if (inStock.has(item.id)) continue;
    origins.set(item.id, (origins.get(item.id) || new Set()).add("requirement"));
  }

  const existing = await fetchShoppingList(householdId);
  const openItems = existing.filter((i) => i.status === "open");
  const openByGenericItem = new Map(openItems.map((i) => [i.generic_item, i]));

  for (const [genericItemId, sources] of origins) {
    if (openByGenericItem.has(genericItemId)) continue;
    const source = sources.has("meal_plan") ? "meal_plan" : "requirement";
    try {
      await pb.collection("shopping_list_items").create({
        household: householdId,
        generic_item: genericItemId,
        source,
        status: "open",
      });
    } catch (err) {
      if (err.status !== 400) throw err; // unique-open-index race, already exists
    }
  }

  for (const item of openItems) {
    if (item.source === "manual") continue;
    if (origins.has(item.generic_item)) continue;
    try {
      await pb.collection("shopping_list_items").delete(item.id);
    } catch (err) {
      if (err.status !== 404) throw err; // already deleted by a concurrent run
    }
  }

  return fetchShoppingList(householdId);
}
