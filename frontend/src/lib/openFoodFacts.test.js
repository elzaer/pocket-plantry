import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchProductByBarcode } from "./openFoodFacts";

describe("fetchProductByBarcode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null on a 404 (OFF's actual not-found response)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    const result = await fetchProductByBarcode("0000000000000");
    expect(result).toBeNull();
  });

  it("returns null when status: 0 is returned with a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 0 }),
      }),
    );

    const result = await fetchProductByBarcode("0000000000000");
    expect(result).toBeNull();
  });

  it("normalizes a matched product", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: "Peanut Butter",
            brands: "Acme",
            quantity: "500 g",
            image_url: "https://example.com/img.jpg",
          },
        }),
      }),
    );

    const result = await fetchProductByBarcode("1234567890123");
    expect(result).toEqual({
      barcode: "1234567890123",
      name: "Peanut Butter",
      brand: "Acme",
      pack_size: 500,
      pack_unit: "g",
      image_url: "https://example.com/img.jpg",
      source: "open_food_facts",
    });
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(fetchProductByBarcode("123")).rejects.toThrow();
  });
});
