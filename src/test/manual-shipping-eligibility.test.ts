import { describe, expect, it } from "vitest";
import { manualShippingHold, LEGACY_SETUP_FAILURE } from "@/lib/manual-shipping-eligibility";
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
