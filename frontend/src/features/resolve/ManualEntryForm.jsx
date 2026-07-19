import { useState } from "react";
import { pb } from "../../lib/pocketbase";
import { resolveGenericItemId } from "../../lib/genericItems";
import { GenericItemPicker } from "../../components/GenericItemPicker";

// Resolution chain step 4: nothing matched locally or on Open Food Facts.
// Manual entry maps to a generic item in the same form (CLAUDE.md story 3).
// The created record (source: "manual") is picked up server-side to be
// contributed back to Open Food Facts.
export function ManualEntryForm({ barcode, householdId, onCreated }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [packSize, setPackSize] = useState("");
  const [packUnit, setPackUnit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
      const product = await pb.collection("products").create({
        barcode,
        name,
        brand,
        pack_size: packSize ? Number(packSize) : null,
        pack_unit: packUnit,
        image_url: imageUrl,
        source: "manual",
        generic_item: genericItemId,
      });
      onCreated(product);
    } catch (err) {
      setError(err.message || "Couldn't save product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>New product</h2>
      <p>Barcode {barcode} wasn't found — enter it manually.</p>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Brand
        <input value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>
      <label>
        Pack size
        <input
          type="number"
          step="any"
          value={packSize}
          onChange={(e) => setPackSize(e.target.value)}
        />
      </label>
      <label>
        Pack unit
        <input value={packUnit} onChange={(e) => setPackUnit(e.target.value)} />
      </label>
      <label>
        Image URL
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </label>
      <GenericItemPicker
        householdId={householdId}
        value={picked}
        onChange={setPicked}
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting || !picked}>
        {submitting ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}
