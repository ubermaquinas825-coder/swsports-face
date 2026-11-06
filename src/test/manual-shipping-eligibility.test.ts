import { describe, expect, it } from "vitest";
import { manualShippingHold, manualShippingReviewReason, LEGACY_SETUP_FAILURE } from "@/lib/manual-shipping-eligibility";
const order = {
  payment_status: "approved",
  payment_link_id: "mp:order",
  bling_sync_status: "reconciliation_required",
  bling_sync_error: LEGACY_SETUP_FAILURE,
};
describe("Manual shipping ERP eligibility", () => {
  it("allows only the exact pre-API Bling configuration error for Mercado Pago", () =>
    expect(manualShippingHold(order)).toBeNull());
  it.each([
    { payment_status: "failed" },
    { payment_status: "pending" },
    { payment_link_id: "appmax-link" },
    { bling_sync_status: "blocked" },
    { bling_sync_status: "processing" },
    { bling_sync_error: null },
    { bling_sync_error: "Envio ao Bling falhou: timeout" },
    { bling_sync_error: "Pagamento divergente" },
  ])("keeps other financial and ambiguous cases blocked: %o", (change) =>
    expect(manualShippingHold({ ...order, ...change })).not.toBeNull(),
  );
});
describe("Admin shipping hold explanation", () => {
  it("explains the actual stored failure without relaxing the hold", () => {
    const held = { ...order, bling_sync_error: "Divergência de pagamento" };
    expect(manualShippingHold(held)).not.toBeNull();
    expect(manualShippingReviewReason(held)).toBe("Divergência de pagamento");
  });
  it("hides historical reasons when there is no active hold", () =>
    expect(manualShippingReviewReason(order)).toBeNull());
  it("returns a useful message when no reason was persisted", () =>
    expect(manualShippingReviewReason({ ...order, bling_sync_error: null })).toContain("motivo não foi registrado"));
  it("normalizes line breaks and truncates administrative diagnostics", () =>
    expect(manualShippingReviewReason({ ...order, bling_sync_error: "Erro\\n" + "x".repeat(600) })).toHaveLength(350));
});
