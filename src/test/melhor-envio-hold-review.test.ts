import { beforeEach, describe, expect, it, vi } from "vitest";

const { role, from, read, verify, select, eq } = vi.hoisted(() => ({
  role: vi.fn(),
  from: vi.fn(),
  read: vi.fn(),
  verify: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { validator: () => builder, middleware: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/mercadopago.server", () => ({ verifyMercadoPagoStoredOrder: verify }));

import { checkMelhorEnvioPaymentHold } from "@/lib/melhor-envio-cart.functions";

const base = {
  id: "test-order",
  payment_status: "approved",
  payment_link_id: "mp:payment",
  provider_payment_id: "pay-1",
  subtotal_cents: 10000,
  discount_cents: 0,
  freight_cents: 1500,
  bling_sync_status: "reconciliation_required",
  bling_sync_error: "Valor total divergente; revisão manual necessária.",
};
const invoke = () =>
  (checkMelhorEnvioPaymentHold as unknown as (input: unknown) => Promise<{ verified: boolean; message: string }>)({
    context: { userId: "admin", supabase: { rpc: role } },
    data: { orderId: "test-order" },
  });

beforeEach(() => {
  vi.resetAllMocks();
  role.mockResolvedValue({ data: true, error: null });
  read.mockResolvedValue({ data: base, error: null });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ single: read });
  from.mockReturnValue({ select });
});

describe("Blocked Melhor Envio admin payment check", () => {
  it("rejects non-admins before accessing orders", async () => {
    role.mockResolvedValue({ data: false, error: null });
    await expect(invoke()).rejects.toThrow("administrativo");
    expect(from).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("confirms a matching Mercado Pago payment but does not release the hold", async () => {
    verify.mockResolvedValue({ state: "approved", providerPaymentId: "pay-1" });
    await expect(invoke()).resolves.toMatchObject({ verified: true, message: expect.stringContaining("continua bloqueada") });
    expect(from).toHaveBeenCalledWith("shipping_orders");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("bling_sync_error"));
    expect(verify).toHaveBeenCalledOnce();
    expect(base.bling_sync_status).toBe("reconciliation_required");
  });

  it("refuses a mismatched payment identity", async () => {
    verify.mockResolvedValue({ state: "approved", providerPaymentId: "another-payment" });
    await expect(invoke()).resolves.toMatchObject({ verified: false, message: expect.stringContaining("permanece bloqueada") });
  });

  it("does not call Mercado Pago for Appmax orders", async () => {
    read.mockResolvedValue({ data: { ...base, payment_link_id: "appmax:abc" }, error: null });
    await expect(invoke()).resolves.toMatchObject({ verified: false, message: expect.stringContaining("Appmax") });
    expect(verify).not.toHaveBeenCalled();
  });

  it("does not release the hold when the provider times out", async () => {
    verify.mockRejectedValue(new Error("network"));
    await expect(invoke()).resolves.toMatchObject({ verified: false, message: expect.stringContaining("permanece bloqueada") });
  });
});
