import { useEffect, useState } from "react";
import { fetchPantryStock, upsertPantryStock } from "../../lib/pantryStock";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function PantryView({ householdId }) {
  const [stock, setStock] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPantryStock(householdId)
      .then((data) => {
        if (!cancelled) setStock(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load pantry stock");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, reloadKey]);

  async function toggleStock(row) {
    setError(null);
    try {
      await upsertPantryStock({
        householdId,
        genericItemId: row.generic_item,
        hasStock: !row.has_stock,
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

      {stock === null && <p>Loading…</p>}
      {stock?.length === 0 && <p>Nothing tracked yet.</p>}
      {stock?.map((row) => (
        <div key={row.id} className="pantry-row">
          <span>{row.expand?.generic_item?.name || "Unknown item"}</span>
          <span>{row.has_stock ? "In stock" : "Out of stock"}</span>
          <button type="button" onClick={() => toggleStock(row)}>
            Mark {row.has_stock ? "out of stock" : "in stock"}
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
