import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { products, productFor, UNIT_PRICE } from "@/lib/products";
import { cartLinesSchema, checkoutCartKey, currentShipping } from "@/lib/checkout";
import { choosePackage, defaultShippingConfig, validatedTotal } from "@/lib/shipping";
import manifest from "../../docs/balaclavas-asset-manifest.json";

describe("Uploaded balaclava catalog", () => {
  it.each(manifest)(
    "preserves the original image bytes and accepts $product_id at 4990 centavos",
    ({ product_id, url, bytes, sha256 }) => {
      const product = productFor(product_id);
      expect(product?.image).toBe(url);
      const file = readFileSync(resolve(process.cwd(), "public", url.slice(1)));
      expect(file.byteLength).toBe(bytes);
      expect(createHash("sha256").update(file).digest("hex")).toBe(sha256);
      expect(cartLinesSchema.safeParse([{ id: product_id, qty: 1 }]).success).toBe(true);
      expect(validatedTotal([{ id: product_id, qty: 1 }], 0, 0)).toBe(4990);
      expect(UNIT_PRICE).toBe(49.9);
    },
  );

  it("accepts a mixed seven-model cart while still rejecting invalid and duplicate entries", () => {
    const lines = [products[0], ...manifest.map(({ product_id }) => productFor(product_id)!)].map(
      ({ id }) => ({ id, qty: 1 }),
    );
    expect(cartLinesSchema.safeParse(lines).success).toBe(true);
    expect(validatedTotal(lines, 0, 1234)).toBe(36164);
    expect(cartLinesSchema.safeParse([...lines, lines[0]]).success).toBe(false);
    expect(cartLinesSchema.safeParse([{ id: "unknown-product", qty: 1 }]).success).toBe(false);
    expect(cartLinesSchema.safeParse([{ id: lines[0].id, qty: 101 }]).success).toBe(false);
  });

  it("keeps packaging limits and freight invalidation intact for the larger catalog", () => {
    expect(choosePackage(products.length, defaultShippingConfig)).toBeNull();
    const id = manifest[0].product_id;
    const lines = [{ id, qty: 1 }];
    const selection = {
      cep: "38408562",
      cartKey: checkoutCartKey(lines),
      option: { id: "fixture", name: "Test", company: "Test", priceCents: 1234, deliveryDays: 3 },
    };
    expect(currentShipping(selection, lines)).toEqual(selection);
    expect(currentShipping(selection, [{ id, qty: 2 }])).toBeNull();
  });
});
