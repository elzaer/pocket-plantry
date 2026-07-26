import { useEffect, useState } from "react";
import { generateShoppingList, addManualRequirement } from "../../lib/shoppingList";
import { resolveGenericItemId } from "../../lib/genericItems";
import { fetchProducts, productsByGenericItem } from "../../lib/products";
import {
  fetchPreferredProducts,
  preferredProductByGenericItem,
  setPreferredProduct,
} from "../../lib/householdPreferences";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function ShoppingListView({ householdId }) {
  const [items, setItems] = useState(null);
  const [productsByItem, setProductsByItem] = useState(new Map());
  const [preferredByItem, setPreferredByItem] = useState(new Map());
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      generateShoppingList(householdId),
      fetchProducts(),
      fetchPreferredProducts(householdId),
    ])
      .then(([shoppingItems, products, preferences]) => {
        if (cancelled) return;
        setItems(shoppingItems);
        setProductsByItem(productsByGenericItem(products));
        setPreferredByItem(preferredProductByGenericItem(preferences));
      })
      .catch((err) => {
        if (!cancelled && !err?.isAbort) {
          setError(err.message || "Couldn't load the shopping list");
        }
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
              <PreferredProductPicker
                householdId={householdId}
                genericItemId={item.generic_item}
                candidates={productsByItem.get(item.generic_item) || []}
                preference={preferredByItem.get(item.generic_item)}
                onChanged={() => setReloadKey((k) => k + 1)}
              />
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

// Only rendered for OPEN rows — fulfilled rows already show the actual SKU
// used via fulfilled_by_product. Renders nothing if there are no candidate
// products for this generic item yet.
function PreferredProductPicker({ householdId, genericItemId, candidates, preference, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (candidates.length === 0) return null;

  async function handleChange(e) {
    const productId = e.target.value;
    if (!productId) return;
    setError(null);
    setSaving(true);
    try {
      await setPreferredProduct({ householdId, genericItemId, productId });
      onChanged();
    } catch (err) {
      setError(err.message || "Couldn't save preference");
      setSaving(false);
    }
  }

  return (
    <label>
      Preferred product
      <select value={preference?.preferred_product || ""} onChange={handleChange} disabled={saving}>
        <option value="">Choose…</option>
        {candidates.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      {error && <p role="alert">{error}</p>}
    </label>
  );
}
