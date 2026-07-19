import { useEffect, useState } from "react";
import { fetchGenericItems } from "../lib/genericItems";

// Free-text input backed by a datalist of the household's existing generic
// items. Typing an exact (case-insensitive) match selects it; anything else
// is treated as a new generic item to create on submit.
export function GenericItemPicker({ householdId, value, onChange }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchGenericItems(householdId).then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  function handleInput(e) {
    const text = e.target.value;
    const match = items.find(
      (item) => item.name.toLowerCase() === text.toLowerCase(),
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
        list="generic-items-datalist"
        value={value?.name ?? ""}
        onChange={handleInput}
        placeholder="e.g. Peanut butter"
        required
      />
      <datalist id="generic-items-datalist">
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
