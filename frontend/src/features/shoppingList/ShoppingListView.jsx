import { useEffect, useState } from "react";
import { fetchShoppingList, addManualRequirement } from "../../lib/shoppingList";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function ShoppingListView({ householdId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchShoppingList(householdId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load the shopping list");
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, reloadKey]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setAdding(true);
    try {
      const genericItemId = await resolveGenericItemId(householdId, picked);
      await addManualRequirement({ householdId, genericItemId });
      setPicked(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(
        err.status === 400
          ? "That item is already on the list."
          : err.message || "Couldn't add item",
      );
    } finally {
      setAdding(false);
    }
  }

  const open = items?.filter((item) => item.status === "open") ?? [];
  const fulfilled = items?.filter((item) => item.status === "fulfilled") ?? [];

  return (
    <div>
      <h1>Shopping list</h1>
      {error && <p role="alert">{error}</p>}

      {items === null && <p>Loading…</p>}

      {items !== null && (
        <>
          <h2>Open</h2>
          {open.length === 0 && <p>Nothing needed right now.</p>}
          {open.map((item) => (
            <div key={item.id} className="list-row">
              <span>{item.expand?.generic_item?.name || "Unknown item"}</span>
              <span>({item.source})</span>
            </div>
          ))}

          {fulfilled.length > 0 && (
            <>
              <h2>Fulfilled</h2>
              {fulfilled.map((item) => (
                <div key={item.id} className="list-row">
                  <span>{item.expand?.generic_item?.name || "Unknown item"}</span>
                  <span>
                    via {item.expand?.fulfilled_by_product?.name || "unknown product"}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <form onSubmit={handleAdd}>
        <h2>Add to list</h2>
        <GenericItemPicker
          householdId={householdId}
          value={picked}
          onChange={setPicked}
        />
        <button type="submit" disabled={adding || !picked}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
