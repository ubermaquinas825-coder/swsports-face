import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "@/lib/products";
import manifest from "../../docs/product-image-variants.json";

describe("Responsive catalog assets", () => {
  it.each(products)(
    "provides every display size for $id without fetching an original",
    ({ id }) => {
      const entry = manifest.images.find((image) => image.id === id);
      expect(entry).toBeDefined();
      expect(entry!.variants.map((image) => image.width).sort((a, b) => a - b)).toEqual([
        96, 400, 800,
      ]);
      for (const variant of entry!.variants) {
        expect(variant.url).toMatch(/^\/products\/optimized\/[a-z0-9-]+\.webp$/);
        const data = readFileSync(resolve(process.cwd(), "public", variant.url.slice(1)));
        expect(data.toString("ascii", 0, 4)).toBe("RIFF");
        expect(data.toString("ascii", 8, 12)).toBe("WEBP");
        expect(data.byteLength).toBe(variant.bytes);
        expect(createHash("sha256").update(data).digest("hex")).toBe(variant.sha256);
      }
    },
  );

  it("keeps the whole 400px catalog smaller than the previous original catalog", () => {
    expect(manifest.catalog400Bytes).toBeLessThan(manifest.originalCatalogBytes);
    expect(manifest.selectors96Bytes).toBeLessThan(manifest.catalog400Bytes);
  });
});
