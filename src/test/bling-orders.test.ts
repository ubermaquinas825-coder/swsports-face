import { describe, expect, it } from "vitest";
import { buildBlingSaleOrder } from "@/lib/bling-orders";

const config = { warehouseId: 1, checkAtCheckout: true, mappings: [{ productId: "gato-divertido", sku: "SW-BAL-005", blingId: 55 }] };
describe("Bling sales order", () => {
  it("uses the store order id as the duplicate guard and catalog price R$ 49,90", () => {
    const order = buildBlingSaleOrder({ orderId: "abc", contactId: 9, date: "2026-10-22", items: [{ id: "gato-divertido", name: "Gato Divertido", qty: 2, unit_price_cents: 4990 }], freightCents: 1645, config, appmaxOrderId: "77", serviceName: "PAC", cep: "01310100" });
    expect(order.numeroLoja).toBe("abc");
    expect(order.itens[0]).toMatchObject({ produto: { id: 55 }, quantidade: 2, valor: 49.9 });
    expect(order.transporte.frete).toBe(16.45);
  });
  it("refuses products without a Bling link", () => {
    expect(() => buildBlingSaleOrder({ orderId: "a", contactId: 1, date: "2026-10-22", items: [{ id: "boca-de-beijo", name: "Boca de Beijo", qty: 1, unit_price_cents: 4990 }], freightCents: 0, config, appmaxOrderId: "1", serviceName: "", cep: "" })).toThrow();
  });
});
