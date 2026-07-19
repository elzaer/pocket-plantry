import { useState } from "react";
import { pb } from "../../lib/pocketbase";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

// A product resolved (from cache or Open Food Facts) but this household
// hasn't mapped it to a generic item yet — map it now (CLAUDE.md story 3).
export function GenericItemMapper({ product, householdId, onMapped }) {
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setSubmitting(true);
    try {
      const genericItemId = await resolveGenericItemId(householdId, picked);
      const updated = await pb.collection("products").update(product.id, {
        generic_item: genericItemId,
      });
      onMapped(updated, picked.name);
    } catch (err) {
      setError(err.message || "Couldn't save mapping");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{product.name || product.barcode}</h2>
      <p>New product — map it to a generic item.</p>
      <GenericItemPicker
        householdId={householdId}
        value={picked}
        onChange={setPicked}
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting || !picked}>
        {submitting ? "Saving…" : "Save mapping"}
      </button>
    </form>
  );
}
