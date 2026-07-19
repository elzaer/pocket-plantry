/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const genericItems = app.findCollectionByNameOrId("generic_items");

  const collection = new Collection({
    name: "products",
    type: "base",
    // Global shared catalog, not household-scoped — barcodes resolve the
    // same product for every household (CLAUDE.md: product resolution chain).
    fields: [
      {
        name: "barcode",
        type: "text",
        required: true,
        max: 64,
      },
      {
        name: "name",
        type: "text",
        required: true,
        max: 200,
      },
      {
        name: "brand",
        type: "text",
        max: 150,
      },
      {
        // Not used for stock logic yet — future quantity work.
        name: "pack_size",
        type: "number",
      },
      {
        name: "pack_unit",
        type: "text",
        max: 30,
      },
      {
        // Null until mapped during manual entry.
        name: "generic_item",
        type: "relation",
        collectionId: genericItems.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        name: "image_url",
        type: "url",
        max: 500,
      },
      {
        name: "source",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["open_food_facts", "fallback_api", "manual"],
      },
      {
        name: "contributed_to_off",
        type: "bool",
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_products_barcode ON products (barcode)",
      "CREATE INDEX idx_products_generic_item ON products (generic_item)",
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("products");
  app.delete(collection);
});
