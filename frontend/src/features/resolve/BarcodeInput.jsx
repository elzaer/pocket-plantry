import { useState } from "react";

// Manual barcode entry for now — a camera-based scanner can replace/augment
// this input later without changing the resolution flow it feeds into.
export function BarcodeInput({ onSubmit, disabled }) {
  const [barcode, setBarcode] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!barcode.trim()) return;
    onSubmit(barcode.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Barcode
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          inputMode="numeric"
          autoFocus
          disabled={disabled}
        />
      </label>
      <button type="submit" disabled={disabled}>
        Look up
      </button>
    </form>
  );
}
