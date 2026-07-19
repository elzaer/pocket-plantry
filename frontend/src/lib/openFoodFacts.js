const OFF_READ_URL = "https://world.openfoodfacts.org/api/v2/product";

const FIELDS = "code,product_name,brands,quantity,image_url";

// Best-effort split of OFF's freeform "500 g" / "1 L" quantity string.
// pack_size/pack_unit aren't used by any stock logic yet (CLAUDE.md), so
// leaving them blank when unparseable is fine.
function parseQuantity(quantity) {
  if (!quantity) return { packSize: null, packUnit: null };
  const match = quantity.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
  if (!match) return { packSize: null, packUnit: null };
  return { packSize: Number(match[1]), packUnit: match[2] };
}

// Looks up a barcode against Open Food Facts (public read, no auth).
// Returns a product shape ready to prefill the local cache, or null if OFF
// has no record for this barcode — resolution chain step 2 (CLAUDE.md).
export async function fetchProductByBarcode(barcode) {
  const res = await fetch(
    `${OFF_READ_URL}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
  );
  // OFF's v2 API responds 404 (not 200 + status:0) when a barcode has no match.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed (${res.status})`);
  }
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const { packSize, packUnit } = parseQuantity(data.product.quantity);
  return {
    barcode,
    name: data.product.product_name || "",
    brand: data.product.brands || "",
    pack_size: packSize,
    pack_unit: packUnit,
    image_url: data.product.image_url || "",
    source: "open_food_facts",
  };
}
