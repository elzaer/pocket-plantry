/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const receipts = app.findCollectionByNameOrId("receipts");
  const products = app.findCollectionByNameOrId("products");
  const genericItems = app.findCollectionByNameOrId("generic_items");

  const collection = new Collection({
    name: "receipt_line_items",
    type: "base",
    fields: [
      {
        name: "receipt",
        type: "relation",
        required: true,
        collectionId: receipts.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      { name: "raw_text", type: "text", required: true, max: 500 },
      {
        // Optional — MVP's manual-paste import never auto-matches a
        // barcode. Left null unless a future CSV/OCR fast-follow resolves
        // one at import time.
        name: "matched_product",
        type: "relation",
        collectionId: products.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        // Set by the put-away flow when the user resolves this line.
        name: "matched_generic_item",
        type: "relation",
        collectionId: genericItems.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "quantity", type: "number" }, // future-proofing, unused today
      { name: "price", type: "number" }, // future-proofing, unused today
      {
        name: "resolution_status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["matched", "needs_mapping", "skipped"],
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_receipt_line_items_receipt ON receipt_line_items (receipt)"],
    // household-scoping traverses receipt -> household, same pattern as
    // meal_items' meal -> meal_plan -> household chain.
    listRule: "receipt.household = @request.auth.household",
    viewRule: "receipt.household = @request.auth.household",
    createRule: "receipt.household = @request.auth.household",
    updateRule: "receipt.household = @request.auth.household",
    deleteRule: "receipt.household = @request.auth.household",
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("receipt_line_items"));
});
