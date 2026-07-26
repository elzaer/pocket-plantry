import { useEffect, useState } from "react";
import {
  createReceiptFromPaste,
  fetchReceiptsWithLineItems,
  resolveReceiptLineItem,
  skipReceiptLineItem,
} from "../../lib/receipts";
import { GenericItemPicker } from "../../components/GenericItemPicker";

export function ReceiptImportView({ householdId }) {
  const [receipts, setReceipts] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReceiptsWithLineItems(householdId)
      .then((data) => {
        if (!cancelled) setReceipts(data);
      })
      .catch((err) => {
        if (!cancelled && !err?.isAbort) {
          setError(err.message || "Couldn't load receipts");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, reloadKey]);

  async function handleImport(e) {
    e.preventDefault();
    if (!rawText.trim()) return;
    setError(null);
    setImporting(true);
    try {
      await createReceiptFromPaste({ householdId, storeName: storeName.trim(), rawText });
      setStoreName("");
      setRawText("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Couldn't import receipt");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h1>Receipts</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleImport}>
        <h2>Import a receipt</h2>
        <label>
          Store (optional)
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Woolworths" />
        </label>
        <label>
          Paste receipt lines (one item per line)
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={"2x Full cream milk 2L\nPeanut butter smooth 500g\n..."}
            required
          />
        </label>
        <button type="submit" disabled={importing || !rawText.trim()}>
          {importing ? "Importing…" : "Import"}
        </button>
      </form>

      {receipts === null && <p>Loading…</p>}
      {receipts?.length === 0 && <p>No receipts imported yet.</p>}
      {receipts?.map(({ receipt, lineItems }) => (
        <ReceiptCard
          key={receipt.id}
          receipt={receipt}
          lineItems={lineItems}
          householdId={householdId}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      ))}
    </div>
  );
}

// Reuses .meal-card (bordered card container) — same visual pattern as
// PlannerView's MealCard, no new CSS needed.
function ReceiptCard({ receipt, lineItems, householdId, onChanged }) {
  const needsMapping = lineItems.filter((li) => li.resolution_status === "needs_mapping");
  const resolved = lineItems.filter((li) => li.resolution_status !== "needs_mapping");

  return (
    <div className="meal-card">
      <h2>{receipt.store_name || "Receipt"}</h2>
      <p>{new Date(receipt.created).toLocaleDateString()}</p>

      {needsMapping.map((lineItem) => (
        <LineItemResolver key={lineItem.id} lineItem={lineItem} householdId={householdId} onChanged={onChanged} />
      ))}

      {resolved.map((lineItem) => (
        <div key={lineItem.id} className="list-row">
          <span>{lineItem.raw_text}</span>
          <span>
            {lineItem.resolution_status === "skipped"
              ? "Skipped"
              : `Matched: ${lineItem.expand?.matched_generic_item?.name || "unknown item"}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineItemResolver({ lineItem, householdId, onChanged }) {
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleResolve(e) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    setBusy(true);
    try {
      await resolveReceiptLineItem({ householdId, lineItem, picked });
      onChanged();
    } catch (err) {
      setError(err.message || "Couldn't resolve this line");
      setBusy(false);
    }
  }

  async function handleSkip() {
    setError(null);
    setBusy(true);
    try {
      await skipReceiptLineItem(lineItem);
      onChanged();
    } catch (err) {
      setError(err.message || "Couldn't skip this line");
      setBusy(false);
    }
  }

  return (
    <div className="list-row">
      <span>{lineItem.raw_text}</span>
      <form onSubmit={handleResolve}>
        <GenericItemPicker householdId={householdId} value={picked} onChange={setPicked} />
        <button type="submit" disabled={busy || !picked}>
          {busy ? "Resolving…" : "Resolve"}
        </button>
        <button type="button" onClick={handleSkip} disabled={busy}>
          Skip
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
