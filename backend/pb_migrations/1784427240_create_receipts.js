/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const households = app.findCollectionByNameOrId("households");

  const collection = new Collection({
    name: "receipts",
    type: "base",
    // Epic 5: format-agnostic receipt header. raw_import_source is future-
    // proofing for CSV/OCR fast-follows (DB.md) — MVP only ever writes
    // "manual_paste" (ROADMAP.md: retailer parsing explicitly deferred).
    fields: [
      {
        name: "household",
        type: "relation",
        required: true,
        collectionId: households.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      { name: "store_name", type: "text", max: 150 },
      { name: "purchased_at", type: "date" },
      {
        name: "raw_import_source",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["photo_ocr", "csv", "manual_paste"],
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_receipts_household ON receipts (household)"],
    listRule: "@request.auth.household = household",
    viewRule: "@request.auth.household = household",
    createRule: "@request.auth.household = household",
    updateRule: "@request.auth.household = household",
    deleteRule: "@request.auth.household = household",
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("receipts"));
});
