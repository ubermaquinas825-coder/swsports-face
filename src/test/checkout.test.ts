import { describe, expect, it } from "vitest";
import { cartLinesSchema, checkoutCartKey, currentShipping } from "@/lib/checkout";
import { validatedTotal } from "@/lib/shipping";

describe("Appmax checkout rules", () => {
  const lines = [{ id: "gato-divertido", qty: 1 }];
  it("charges the confirmed R$49.90 unit price plus selected freight", () => {
    expect(validatedTotal(lines, 0, 1234)).toBe(6224);
  });
  it("invalidates freight after quantities change", () => {
    const selection = { cep: "38408562", cartKey: checkoutCartKey(lines), option: { id: "1", name: "PAC", company: "Correios", priceCents: 1234, deliveryDays: 3 } };
    expect(currentShipping(selection, lines)).toEqual(selection);
    expect(currentShipping(selection, [{ id: "gato-divertido", qty: 2 }])).toBeNull();
  });
  it("rejects unknown products and duplicate cart entries before provider calls", () => {
    expect(cartLinesSchema.safeParse([{ id: "invented", qty: 1 }]).success).toBe(false);
    expect(cartLinesSchema.safeParse([...lines, ...lines]).success).toBe(false);
  });
});