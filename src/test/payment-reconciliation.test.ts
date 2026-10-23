import { describe, expect, it } from "vitest";
import { evaluateAppmaxPayment, isValidAppmaxPaidAt } from "@/lib/payment-reconciliation";
const response = (status: string, total_paid = 6464) => ({ data: { order: { id: 12, status, total_paid }, payment: { paid_at: "2026-10-22 20:00:00" } } });
describe("Appmax authoritative payment gate", () => {
  it("accepts confirmed R$49.90 plus R$14.74 freight only from approved API status", () => {
    expect(evaluateAppmaxPayment(response("aprovado"), 12, 6464)).toEqual({ state: "approved", status: "aprovado" });
  });
  it("rejects a different paid amount", () => { expect(() => evaluateAppmaxPayment(response("integrado", 4990), 12, 6464)).toThrow(); });
  it("holds bank authorization and integration review rather than fulfilling", () => {
    for (const status of ["pendente", "autorizado", "pendente_integracao", "pendente_integracao_em_analise", "unknown"]) expect(evaluateAppmaxPayment(response(status), 12, 6464).state).toBe("pending");
  });
  it("does not fulfill refunded payment even with positive paid amount and date", () => { expect(evaluateAppmaxPayment(response("estornado"), 12, 6464).state).toBe("failed"); });
  it("blocks refund indication even when status still says approved", () => { expect(evaluateAppmaxPayment({ data: { ...response("aprovado").data, refund: { refunded_at: "2026-10-22" } } }, 12, 6464).state).toBe("failed"); });
  it("rejects unrelated order identifier", () => { expect(() => evaluateAppmaxPayment(response("aprovado"), 13, 6464)).toThrow(); });
  it("requires a payment timestamp", () => { expect(() => evaluateAppmaxPayment({ data: { order: { id: 12, status: "aprovado", total_paid: 6464 } } }, 12, 6464)).toThrow(); });
  it.each(["not-a-date", "", "2026-10-22", "2026-02-29 20:00:00", "2026-04-31T12:00:00Z", "2026-13-01T12:00:00Z", "2026-10-22T24:00:00Z", "2026-10-22T12:60:00Z", "2026-10-22T12:00:60Z", "2026-10-22T12:00:00+14:01", "2026-10-22T12:00:00-03:60", "2026-10-22T12:00:00Zjunk", null])("rejects an invalid paid_at: %s", (paid_at) => {
    const value = response("aprovado");
    expect(() => evaluateAppmaxPayment({ data: { ...value.data, payment: { paid_at } } }, 12, 6464)).toThrow("data ou valor divergente");
  });
  it.each(["2026-10-22 20:00:00", "2026-10-22T20:00:00Z", "2026-10-22T20:00:00.123456-03:00", "2024-02-29T23:59:59+14:00"]) ("accepts a complete valid payment timestamp: %s", (paid_at) => {
    expect(isValidAppmaxPaidAt(paid_at)).toBe(true);
    expect(evaluateAppmaxPayment({ data: { ...response("aprovado").data, payment: { paid_at } } }, 12, 6464).state).toBe("approved");
  });
});
