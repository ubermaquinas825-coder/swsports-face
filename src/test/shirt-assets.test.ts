import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shirtModels } from "@/lib/products";
import manifest from "../../docs/camisetas-asset-manifest.json";

describe("Original shirt photographs", () => {
  it.each(manifest.assets)("preserves PNG bytes and dimensions from $original_filename", (asset) => {
    expect(asset.target_path).toMatch(new RegExp(`^public/products/camisetas/ref-${asset.reference}-[a-z-]+\\.png$`));
    const bytes = readFileSync(resolve(process.cwd(), asset.target_path));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
    expect(bytes.readUInt32BE(16)).toBe(asset.width);
    expect(bytes.readUInt32BE(20)).toBe(asset.height);
    expect(bytes.byteLength).toBe(asset.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  });

  it("accounts for 13 uploaded files as 12 unique original photos and one duplicate", () => {
    expect(manifest.input_files).toBe(13);
    expect(manifest.assets).toHaveLength(13);
    expect(new Set(manifest.assets.map((asset) => asset.original_filename)).size).toBe(13);
    expect(manifest.unique_assets).toBe(12);
    expect(new Set(manifest.assets.map((asset) => asset.target_path)).size).toBe(12);
    const duplicates = manifest.assets.filter((asset) => asset.duplicate_of);
    expect(duplicates).toHaveLength(1);
    for (const duplicate of duplicates) {
      const original = manifest.assets.find((asset) => asset.original_filename === duplicate.duplicate_of);
      expect(original).toBeDefined();
      expect(duplicate.target_path).toBe(original!.target_path);
      expect(duplicate.sha256).toBe(original!.sha256);
      expect(duplicate.bytes).toBe(original!.bytes);
    }
  });

  it("connects the correct reference photos to every gallery and keeps checkout blocked", () => {
    const expectedCounts: Record<string, number> = { "01": 5, "02": 5, "03": 2 };
    const linkedPhotos = new Set<string>();
    for (const model of shirtModels) {
      expect(model.gallery).toHaveLength(expectedCounts[model.reference]!);
      expect(model.image).toBe(model.gallery[0]!.src);
      expect(model.image).toBe(`/products/camisetas/ref-${model.reference}-frente.png`);
      expect(model.checkoutReady).toBe(false);
      expect(new Set(model.gallery.map((photo) => photo.src)).size).toBe(model.gallery.length);
      for (const photo of model.gallery) {
        const asset = manifest.assets.find((entry) => `/${entry.target_path.slice("public/".length)}` === photo.src);
        expect(asset?.reference).toBe(model.reference);
        expect(photo.src).toMatch(new RegExp(`^/products/camisetas/ref-${model.reference}-[a-z-]+\\.png$`));
        expect(photo.alt).toContain(`Ref. ${model.reference}`);
        expect(photo.label.trim()).not.toBe("");
        linkedPhotos.add(photo.src);
      }
    }
    expect(linkedPhotos.size).toBe(12);
  });

  it.each(["01", "02", "03"])("provides a ZIP archive for reference %s", (reference) => {
    const archive = readFileSync(resolve(process.cwd(), `public/products/camisetas/arquivos/ref-${reference}.zip`));
    expect(archive.byteLength).toBeGreaterThan(22);
    expect(archive.subarray(0, 4).toString("hex")).toBe("504b0304");
  });
});
