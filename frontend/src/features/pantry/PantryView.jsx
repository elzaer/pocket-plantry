import { useEffect, useState } from "react";
import { fetchPantryCatalog, upsertPantryStock } from "../../lib/pantryStock";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function PantryView({ householdId }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPantryCatalog(householdId)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load pantry stock");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, reloadKey]);

  async function toggleStock(item) {
    setError(null);
    try {
      await upsertPantryStock({
        householdId,
        genericItemId: item.genericItemId,
        hasStock: !item.hasStock,
        source: "manual_adjustment",
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't update stock");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setAdding(true);
    try {
      const genericItemId = await resolveGenericItemId(householdId, picked);
      await upsertPantryStock({
        householdId,
        genericItemId,
        hasStock: true,
        source: "manual_adjustment",
      });
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
      <h1>Pantry</h1>
      {error && <p role="alert">{error}</p>}

      {catalog === null && <p>Loading…</p>}
      {catalog?.length === 0 && <p>No generic items yet — add one below.</p>}
      {catalog?.map((item) => (
        <div key={item.genericItemId} className="pantry-row">
          <span>{item.name}</span>
          <span>{item.hasStock ? "In stock" : "Out of stock"}</span>
          <button type="button" onClick={() => toggleStock(item)}>
            Mark {item.hasStock ? "out of stock" : "in stock"}
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
          {adding ? "Adding…" : "Add to pantry"}
        </button>
      </form>
    </div>
  );
}
