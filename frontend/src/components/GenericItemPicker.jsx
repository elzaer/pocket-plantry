import { useEffect, useId, useState } from "react";
import { fetchGenericItems, normalizeGenericItemName } from "../lib/genericItems";

// Free-text input backed by a datalist of the household's existing generic
// items. Typing a match (case/whitespace/simple-plural-insensitive — see
// normalizeGenericItemName) selects it; anything else is treated as a new
// generic item to create on submit.
export function GenericItemPicker({ householdId, value, onChange }) {
  const [items, setItems] = useState([]);
  const datalistId = useId();

  // PocketBase auto-cancels an in-flight request when another request to the
  // same collection+method fires before it resolves (cancel key doesn't
  // consider filters). Multiple pickers can mount at once (one per meal in
  // the planner), so each needs its own requestKey to avoid cancelling its
  // siblings' fetches.
  useEffect(() => {
    let cancelled = false;
    fetchGenericItems(householdId, { requestKey: `generic-items-picker-${datalistId}` })
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled && !err?.isAbort) {
          console.error("Couldn't load generic items", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, datalistId]);

  function handleInput(e) {
    const text = e.target.value;
    const normalized = normalizeGenericItemName(text);
    const match = items.find(
      (item) => normalizeGenericItemName(item.name) === normalized,
    );
    onChange(
      match
        ? { mode: "existing", id: match.id, name: match.name }
        : { mode: "new", name: text },
    );
  }

  return (
    <label>
      Generic item
      <input
        list={datalistId}
        value={value?.name ?? ""}
        onChange={handleInput}
        placeholder="e.g. Peanut butter"
        required
      />
      <datalist id={datalistId}>
        {items.map((item) => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>
      {value?.mode === "new" && value.name && (
        <span> (new generic item)</span>
      )}
    </label>
  );
}
