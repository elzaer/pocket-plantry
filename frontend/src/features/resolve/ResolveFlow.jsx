import { useState } from "react";
import { resolveBarcode } from "../../lib/resolveProduct";
import { logCheckoutScan } from "../../lib/checkoutFulfillment";
import { BarcodeInput } from "./BarcodeInput";
import { GenericItemMapper } from "./GenericItemMapper";
import { ManualEntryForm } from "./ManualEntryForm";

export function ResolveFlow({ householdId }) {
  const [state, setState] = useState({ status: "idle" });
  const [checkoutResult, setCheckoutResult] = useState(null);

  async function handleLookup(barcode) {
    setState({ status: "loading" });
    setCheckoutResult(null);
    try {
      const result = await resolveBarcode(barcode);
      if (result.status === "resolved") {
        setState({
          status: "resolved",
          product: result.product,
          genericItemName: result.product.expand?.generic_item?.name,
        });
      } else if (result.status === "needs_mapping") {
        setState({ status: "needs_mapping", product: result.product });
      } else {
        setState({ status: "not_found", barcode });
      }
    } catch (err) {
      setState({ status: "error", message: err.message || "Lookup failed" });
    }
  }

  function reset() {
    setState({ status: "idle" });
    setCheckoutResult(null);
  }

  async function handleLogToPantry(product) {
    setCheckoutResult({ status: "logging" });
    try {
      const result = await logCheckoutScan({
        householdId,
        genericItemId: product.generic_item,
        productId: product.id,
      });
      setCheckoutResult({ status: "done", ...result });
    } catch (err) {
      setCheckoutResult({
        status: "error",
        message: err.message || "Couldn't log to pantry",
      });
    }
  }

  return (
    <div>
      {state.status !== "idle" && (
        <button type="button" onClick={reset}>
          ← Scan another
        </button>
      )}

      {(state.status === "idle" || state.status === "loading") && (
        <BarcodeInput onSubmit={handleLookup} disabled={state.status === "loading"} />
      )}

      {state.status === "error" && (
        <p role="alert">{state.message}</p>
      )}

      {state.status === "needs_mapping" && (
        <GenericItemMapper
          product={state.product}
          householdId={householdId}
          onMapped={(product, genericItemName) =>
            setState({ status: "resolved", product, genericItemName })
          }
        />
      )}

      {state.status === "not_found" && (
        <ManualEntryForm
          barcode={state.barcode}
          householdId={householdId}
          onCreated={(product) => {
            setState({ status: "resolved", product });
          }}
        />
      )}

      {state.status === "resolved" && (
        <div>
          <h2>{state.product.name || state.product.barcode}</h2>
          {state.product.brand && <p>{state.product.brand}</p>}
          {state.genericItemName && <p>Mapped to: {state.genericItemName}</p>}

          {checkoutResult?.status !== "done" && (
            <button
              type="button"
              onClick={() => handleLogToPantry(state.product)}
              disabled={checkoutResult?.status === "logging"}
            >
              {checkoutResult?.status === "logging"
                ? "Logging…"
                : "Log to pantry"}
            </button>
          )}
          {checkoutResult?.status === "done" && (
            <p>
              Added to pantry stock
              {checkoutResult.fulfilledListItem
                ? " and marked the shopping list entry fulfilled."
                : "."}
            </p>
          )}
          {checkoutResult?.status === "error" && (
            <p role="alert">{checkoutResult.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
