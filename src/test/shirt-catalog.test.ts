import { describe, expect, it } from "vitest";
import { productFor, shirtModels, shirtVariantFor, unitPriceCents, productTitle, type ShirtModel } from "@/lib/products";

describe("Shirt catalog readiness", () => {
  const ready: ShirtModel = {
    ...shirtModels[0]!, image: "/fixture.webp", sizes: ["M", "G"], checkoutReady: true,
  };

  it("uses the owner-confirmed price for all three source references", () => {
    expect(shirtModels.map((model) => model.reference).sort()).toEqual(["01", "02", "03"]);
    expect(shirtModels.every((model) => model.priceCents === 7990)).toBe(true);
  });

  it("preserves the confirmed selectable sizes and excludes PP from reference 03", () => {
    const completeSizes = ["PP", "P", "M", "G", "GG", "XG", "XGG"];
    expect(shirtModels.find((model) => model.reference === "01")?.sizes).toEqual(completeSizes);
    expect(shirtModels.find((model) => model.reference === "02")?.sizes).toEqual(completeSizes);
    const diagonal = shirtModels.find((model) => model.reference === "03")!;
    expect(diagonal.sizes).toEqual(completeSizes.slice(1));
    expect(shirtVariantFor({ ...diagonal, image: "/fixture.webp", checkoutReady: true }, "PP")).toBeUndefined();
  });

  it("uses the photographed measurements only for references 01 and 03", () => {
    const expected = [["PP", 49, 66], ["P", 50, 68], ["M", 52, 70], ["G", 55, 76], ["GG", 57, 79], ["XG", 60, 80], ["XGG", 62, 84]];
    for (const reference of ["01", "03"]) {
      expect(shirtModels.find((model) => model.reference === reference)?.sizeChart?.map(({ size, widthCm, heightCm }) => [size, widthCm, heightCm])).toEqual(expected);
    }
    expect(shirtModels.find((model) => model.reference === "02")?.sizeChart).toBeNull();
  });

  it("records DrySport/unisex specifications and limits the slim claim to reference 02", () => {
    for (const model of shirtModels) {
      expect(model.features).toEqual(expect.arrayContaining([
        { label: "Marca", value: "SW SPORTS" }, { label: "Tecido", value: "DrySport" },
        { label: "Modelo", value: "Unissex" }, { label: "Proteção solar", value: "UV 50+" },
      ]));
      expect(model.features.some(({ value }) => value === "Slim")).toBe(model.reference === "02");
    }
  });

  it("creates distinct sized SKUs and requires a confirmed size/photo/readiness", () => {
    const medium = shirtVariantFor(ready, "M")!;
    const large = shirtVariantFor(ready, "G")!;
    expect(medium.id).not.toBe(large.id);
    expect(unitPriceCents(medium)).toBe(7990);
    expect(productTitle(large)).toContain("Tamanho G");
    expect(shirtVariantFor(ready, "")).toBeUndefined();
    expect(shirtVariantFor(ready, "GG")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, image: null }, "M")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, checkoutReady: false }, "M")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, priceCents: 0 }, "M")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, priceCents: 7990.5 }, "M")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, sizes: [""] }, "")).toBeUndefined();
    expect(shirtVariantFor({ ...ready, sizes: ["M", "m"] }, "M")).toBeUndefined();
  });

  it("does not accept unfinished listings or unsized shirts in a real checkout", () => {
    for (const model of shirtModels.filter((model) => !model.checkoutReady)) {
      expect(productFor(model.id)).toBeUndefined();
      expect(productFor(`${model.id}-m`)).toBeUndefined();
    }
    expect(unitPriceCents(productFor("gato-divertido")!)).toBe(4990);
  });
});
