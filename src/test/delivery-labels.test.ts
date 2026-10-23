import { describe, expect, it } from "vitest";
import { buildSuperFreteCart, deliveryAddressSchema, labelPriceAcceptable } from "@/lib/delivery";

const raw = { name: "Ana Souza", document: "123.456.789-01", email: "ana@ex.com", phone: "(34) 99999-1111", street: "Rua A", number: "10", complement: "", district: "Centro", city: "Uberlândia", state: "mg" };

describe("delivery address", () => {
  it("requires first and last name", () => {
    expect(deliveryAddressSchema.safeParse({ ...raw, name: "Ana" }).success).toBe(false);
  });
  it("requires an 11 or 14 digit document", () => {
    expect(deliveryAddressSchema.safeParse({ ...raw, document: "123" }).success).toBe(false);
    expect(deliveryAddressSchema.parse(raw).document).toBe("12345678901");
  });
  it("normalizes UF to uppercase", () => {
    expect(deliveryAddressSchema.parse(raw).state).toBe("MG");
  });
});

describe("SuperFrete label", () => {
  it("ships to the quoted CEP with the order id as tag", () => {
    const body = buildSuperFreteCart({ orderId: "ord-1", originCep: "38408562", cep: "01310100", serviceId: "1", address: deliveryAddressSchema.parse(raw), items: [{ name: "Gato", qty: 1, unit_price_cents: 4990 }], pkg: { weightKg: 0.15, heightCm: 10, widthCm: 15, lengthCm: 20 }, subtotalCents: 4990 });
    expect(body.to.postal_code).toBe("01310100");
    expect(body.tag).toBe("ord-1");
    expect(body.service).toBe(1);
    expect(body.options.insurance_value).toBe(49.9);
  });
  it("refuses to pay a label far above the freight charged", () => {
    expect(labelPriceAcceptable(1619, 1700)).toBe(true);
    expect(labelPriceAcceptable(1619, 2500)).toBe(false);
  });
});
