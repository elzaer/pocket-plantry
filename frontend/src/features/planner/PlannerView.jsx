import { useEffect, useState } from "react";
import { startOfWeek, addWeeks, fetchOrCreateMealPlan } from "../../lib/mealPlans";
import { fetchMeals, createMeal, deleteMeal } from "../../lib/meals";
import {
  fetchMealItemsForPlan,
  addMealItem,
  removeMealItem,
  fetchWeeklyGenericItems,
} from "../../lib/mealItems";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

function formatWeek(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PlannerView({ householdId }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [mealName, setMealName] = useState("");
  const [mealDate, setMealDate] = useState("");
  const [addingMeal, setAddingMeal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOrCreateMealPlan(householdId, weekStart)
      .then((plan) =>
        Promise.all([
          fetchMeals(plan.id),
          fetchMealItemsForPlan(plan.id),
          fetchWeeklyGenericItems(plan.id),
        ]).then(([meals, items, weeklyItems]) => {
          if (cancelled) return;
          const itemsByMeal = new Map();
          for (const item of items) {
            const list = itemsByMeal.get(item.meal) || [];
            list.push(item);
            itemsByMeal.set(item.meal, list);
          }
          setData({ plan, meals, itemsByMeal, weeklyItems });
        }),
      )
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load meal plan");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, weekStart, reloadKey]);

  async function handleAddMeal(e) {
    e.preventDefault();
    if (!mealName.trim() || !data) return;
    setError(null);
    setAddingMeal(true);
    try {
      await createMeal({
        mealPlanId: data.plan.id,
        name: mealName.trim(),
        mealDate: mealDate || null,
      });
      setMealName("");
      setMealDate("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't add meal");
    } finally {
      setAddingMeal(false);
    }
  }

  async function handleDeleteMeal(mealId) {
    setError(null);
    try {
      await deleteMeal(mealId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't remove meal");
    }
  }

  async function handleAddIngredient(mealId, picked) {
    setError(null);
    const genericItemId = await resolveGenericItemId(householdId, picked);
    await addMealItem({ mealId, genericItemId });
    setReloadKey((k) => k + 1);
  }

  async function handleRemoveIngredient(mealItemId) {
    setError(null);
    try {
      await removeMealItem(mealItemId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't remove ingredient");
    }
  }

  return (
    <div>
      <h1>Planner</h1>
      <nav>
        <button type="button" onClick={() => setWeekStart((d) => addWeeks(d, -1))}>
          ← Prev week
        </button>
        <span>Week of {formatWeek(weekStart)}</span>
        <button type="button" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
          Next week →
        </button>
      </nav>

      {error && <p role="alert">{error}</p>}
      {data === null && <p>Loading…</p>}

      {data && (
        <>
          {data.meals.length === 0 && <p>No meals planned yet.</p>}
          {data.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              items={data.itemsByMeal.get(meal.id) || []}
              householdId={householdId}
              onDelete={() => handleDeleteMeal(meal.id)}
              onAddIngredient={(picked) => handleAddIngredient(meal.id, picked)}
              onRemoveIngredient={handleRemoveIngredient}
            />
          ))}

          <form onSubmit={handleAddMeal}>
            <h2>Add meal</h2>
            <label>
              Name
              <input
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g. Tuesday dinner"
                required
              />
            </label>
            <label>
              Date (optional)
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
              />
            </label>
            <button type="submit" disabled={addingMeal || !mealName.trim()}>
              {addingMeal ? "Adding…" : "Add meal"}
            </button>
          </form>

          <h2>This week you need</h2>
          {data.weeklyItems.length === 0 && <p>Nothing planned yet.</p>}
          {data.weeklyItems.map((item) => (
            <div key={item.id} className="list-row">
              <span>{item.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function MealCard({ meal, items, householdId, onDelete, onAddIngredient, onRemoveIngredient }) {
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setAdding(true);
    try {
      await onAddIngredient(picked);
      setPicked(null);
    } catch (err) {
      setError(err.message || "Couldn't add ingredient");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="meal-card">
      <h2>{meal.name}</h2>
      {meal.meal_date && <p>{meal.meal_date.slice(0, 10)}</p>}
      <button type="button" onClick={onDelete}>
        Remove meal
      </button>

      {items.length === 0 && <p>No ingredients yet.</p>}
      {items.map((item) => (
        <div key={item.id} className="list-row">
          <span>{item.expand?.generic_item?.name || "Unknown item"}</span>
          <button type="button" onClick={() => onRemoveIngredient(item.id)}>
            Remove
          </button>
        </div>
      ))}

      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <GenericItemPicker householdId={householdId} value={picked} onChange={setPicked} />
        <button type="submit" disabled={adding || !picked}>
          {adding ? "Adding…" : "Add ingredient"}
        </button>
      </form>
    </div>
  );
}
