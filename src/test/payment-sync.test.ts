import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { from, reconcile, legacy } = vi.hoisted(() => ({
  from: vi.fn(),
  reconcile: vi.fn(),
  legacy: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/mercadopago-reconciliation.server", () => ({
  reconcilePendingMercadoPagoOrders: reconcile,
}));
vi.mock("@/lib/payment-reconciliation.server", () => ({ reconcileAppmaxOrder: legacy }));
import { syncPayments } from "@/lib/payment-sync.server";
beforeEach(() => {
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
  reconcile.mockResolvedValue({ checked: 2, approved: 1, failed: 0, held: 1, errors: [] });
  const q = {
    select: () => q,
    not: () => q,
    eq: () => q,
    or: () => q,
    order: () => q,
    limit: async () => ({ data: [{ id: "legacy-order" }], error: null }),
  };
  from.mockReturnValue(q);
  legacy.mockResolvedValue({ checked: true });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("Payment-only processing", () => {
  it("reconciles new and legacy payments without touching ERP settings or export queues", async () => {
    await expect(syncPayments()).resolves.toMatchObject({ checked: 3, approved: 1, held: 1, errors: [] });
    expect(legacy).toHaveBeenCalledWith("legacy-order");
    expect(from.mock.calls).toEqual([["shipping_orders"]]);
  });
  it("reports partial payment failures without reporting success", async () => {
    legacy.mockRejectedValue(new Error("temporary"));
    expect((await syncPayments()).errors).toHaveLength(1);
  });
  it("blocks all calls during maintenance", async () => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
    await expect(syncPayments()).rejects.toThrow("manutenção");
    expect(reconcile).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
