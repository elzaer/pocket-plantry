import { useEffect, useState } from "react";
import {
  fetchRequirements,
  setGenericItemRecurring,
  resolveGenericItemId,
} from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function RequirementsView({ householdId }) {
  const [requirements, setRequirements] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchRequirements(householdId)
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load requirements");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, reloadKey]);

  async function removeRequirement(item) {
    setError(null);
    try {
      await setGenericItemRecurring(item.id, false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't remove item");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setAdding(true);
    try {
      const genericItemId = await resolveGenericItemId(householdId, picked);
      await setGenericItemRecurring(genericItemId, true);
      setPicked(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't add item");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <h1>Requirements</h1>
      {error && <p role="alert">{error}</p>}

      {requirements === null && <p>Loading…</p>}
      {requirements?.length === 0 && <p>Nothing on the list yet.</p>}
      {requirements?.map((item) => (
        <div key={item.id} className="list-row">
          <span>{item.name}</span>
          <button type="button" onClick={() => removeRequirement(item)}>
            Remove
          </button>
        </div>
      ))}

      <form onSubmit={handleAdd}>
        <h2>Add item</h2>
        <GenericItemPicker
          householdId={householdId}
          value={picked}
          onChange={setPicked}
        />
        <button type="submit" disabled={adding || !picked}>
          {adding ? "Adding…" : "Add to requirements"}
        </button>
      </form>
    </div>
  );
}
