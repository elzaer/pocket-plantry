import { pb } from "./pocketbase";

// Monday of the week containing `date` (Epic 1 works in whole weeks).
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export async function fetchOrCreateMealPlan(householdId, weekStartDate) {
  const dateStr = toDateOnly(weekStartDate);
  const nextDay = new Date(weekStartDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = toDateOnly(nextDay);
  try {
    // Exact equality against a date field needs PocketBase's fully
    // normalized datetime string, not a date-only one — a range comparison
    // sidesteps that instead of depending on its exact stored format.
    return await pb
      .collection("meal_plans")
      .getFirstListItem(
        pb.filter(
          "household = {:h} && week_start_date >= {:start} && week_start_date < {:end}",
          { h: householdId, start: dateStr, end: nextDayStr },
        ),
      );
  } catch (err) {
    if (err.status !== 404) throw err;
    return pb.collection("meal_plans").create({
      household: householdId,
      week_start_date: dateStr,
    });
  }
}
