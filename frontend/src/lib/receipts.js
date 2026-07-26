import { pb } from "./pocketbase";
import { resolveGenericItemId } from "./genericItems";
import { logFulfillment } from "./checkoutFulfillment";

// Splits pasted receipt text into one raw line per non-blank row — the
// entire "parsing" MVP does (retailer CSV/OCR parsing is an explicit
// fast-follow, not in scope here).
function splitLines(rawText) {
  return rawText.split("\n").map((line) => line.trim()).filter(Boolean);
}

// Creates one receipt plus one receipt_line_items row per pasted line, all
// starting in "needs_mapping". PocketBase auto-cancels a request when
// another request to the same collection+method fires before it resolves
// (already bit this codebase twice) — a paste can produce many creates in
// one call, so this MUST stay a sequential for...of loop, not Promise.all.
export async function createReceiptFromPaste({ householdId, storeName, rawText }) {
  const lines = splitLines(rawText);
  if (lines.length === 0) {
    throw new Error("Paste at least one line from the receipt.");
  }

  const receipt = await pb.collection("receipts").create({
    household: householdId,
    store_name: storeName || null,
    raw_import_source: "manual_paste",
  });

  for (const line of lines) {
    await pb.collection("receipt_line_items").create({
      receipt: receipt.id,
      raw_text: line,
      resolution_status: "needs_mapping",
    });
  }

  return receipt;
}

// One query for every receipt + line item across the household, grouped
// client-side by receipt — mirrors PlannerView's itemsByMeal pattern.
export async function fetchReceiptsWithLineItems(householdId) {
  const [receipts, lineItems] = await Promise.all([
    pb.collection("receipts").getFullList({
      filter: pb.filter("household = {:h}", { h: householdId }),
      sort: "-created",
    }),
    pb.collection("receipt_line_items").getFullList({
      filter: pb.filter("receipt.household = {:h}", { h: householdId }),
      expand: "matched_generic_item,matched_product",
      sort: "created",
    }),
  ]);

  const lineItemsByReceipt = new Map();
  for (const item of lineItems) {
    const list = lineItemsByReceipt.get(item.receipt) || [];
    list.push(item);
    lineItemsByReceipt.set(item.receipt, list);
  }

  return receipts.map((receipt) => ({
    receipt,
    lineItems: lineItemsByReceipt.get(receipt.id) || [],
  }));
}

// Put-away: resolves a receipt line to a generic item and immediately runs
// it through the same fulfillment logic as a live scan — resolving *is* the
// put-away action here, no separate confirmation step. picked is
// { mode: "existing", id } or { mode: "new", name } from GenericItemPicker.
export async function resolveReceiptLineItem({ householdId, lineItem, picked }) {
  const genericItemId = await resolveGenericItemId(householdId, picked);

  await pb.collection("receipt_line_items").update(lineItem.id, {
    matched_generic_item: genericItemId,
    resolution_status: "matched",
  });

  return logFulfillment({
    householdId,
    genericItemId,
    productId: lineItem.matched_product || undefined,
    source: "receipt_import",
  });
}

export async function skipReceiptLineItem(lineItem) {
  return pb.collection("receipt_line_items").update(lineItem.id, {
    resolution_status: "skipped",
  });
}
