import { describe, expect, it } from "vitest";
import { assertStockAvailable, blingInventoryConfigSchema, projectWarehouseStock, matchBlingCatalog } from "@/lib/bling-inventory";
import { products } from "@/lib/products";
describe("Bling stock safeguards", () => {
  const config = { warehouseId: 5, checkAtCheckout: false, mappings: [{ productId: "gato-divertido", sku: "SW-BAL-005", blingId: 101 }] };
  it("uses virtual stock only in the selected warehouse, not other warehouses", () => {
    expect(projectWarehouseStock({ data: [{ produto: { id: 101 }, saldoFisicoTotal: 99, depositos: [{ id: 5, saldoVirtual: 2 }, { id: 8, saldoVirtual: 97 }] }] }, 5)).toEqual([{ blingId: 101, available: 2 }]);
  });
  it("blocks purchasing more units than confirmed stock", () => {
    expect(() => assertStockAvailable([{ id: "gato-divertido", qty: 3 }], config, [{ blingId: 101, available: 2 }])).toThrow();
    expect(() => assertStockAvailable([{ id: "gato-divertido", qty: 2 }], config, [{ blingId: 101, available: 2 }])).not.toThrow();
  });
  it("blocks missing mappings or balances instead of inventing availability", () => {
    expect(() => assertStockAvailable([{ id: "boca-de-beijo", qty: 1 }], config, [{ blingId: 101, available: 2 }])).toThrow();
    expect(() => assertStockAvailable([{ id: "gato-divertido", qty: 1 }], config, [])).toThrow();
  });
  it("requires all six models and a warehouse before enabling checkout checks", () => {
    expect(blingInventoryConfigSchema.safeParse({ ...config, checkAtCheckout: true }).success).toBe(false);
  });
  it("rejects duplicate product or SKU mappings", () => {
    expect(blingInventoryConfigSchema.safeParse({ ...config, mappings: [...config.mappings, ...config.mappings] }).success).toBe(false);
  });
  it("matches existing models by returned names rather than SKU order", () => {
    const rows = products.map((p, i) => ({ id: 100 + i, name: p.name, sku: `SW-BAL-00${i + 1}` })).reverse();
    expect(matchBlingCatalog(rows).find((m) => m.productId === "gato-divertido")).toEqual({ productId: "gato-divertido", sku: "SW-BAL-005", blingId: 104 });
  });
  it("does not assign an ambiguous or missing ERP model", () => {
    expect(() => matchBlingCatalog([])).toThrow();
    const rows = products.map((p, i) => ({ id: 100 + i, name: p.name, sku: `SW-BAL-00${i + 1}` }));
    expect(() => matchBlingCatalog([...rows, { id: 200, name: "Gato Divertido", sku: "another" }])).toThrow();
  });
});