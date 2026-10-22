import { describe, expect, it, vi, afterEach } from "vitest";
const rpc = vi.fn(); const update = vi.fn(); const single = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc, from: () => ({ select: () => ({ eq: () => ({ single }) }), update }) } }));
vi.mock("@/lib/checkout.server", () => ({ authenticateAppmax: async () => "test-token" }));
import { reconcileAppmaxOrder } from "@/lib/payment-reconciliation.server";
const order = { id: "local", payment_link_id: "link", provider_payment_id: null, subtotal_cents: 4990, discount_cents: 0, freight_cents: 1474 };
const approved = (id: number) => new Response(JSON.stringify({ data: { order: { id, status: "aprovado", total_paid: 6464 }, payment: { paid_at: "2026-10-22" } } }));
describe("Appmax reconciliation safety", () => {
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
  function setup() {
    rpc.mockResolvedValue({ data: true, error: null }); single.mockResolvedValue({ data: order, error: null }); update.mockReturnValue({ eq: async () => ({ error: null }) });
  }
  it("does not run concurrent checks when the database lease is held", async () => {
    rpc.mockResolvedValue({ data: false, error: null }); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await reconcileAppmaxOrder("local")).toEqual({ checked: false }); expect(fetcher).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it("uses saved link membership and keeps approved payment blocked for ERP fulfillment", async () => {
    setup(); const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ order: { id: 12 } }], meta: { total_pages: 1 } }))).mockResolvedValueOnce(approved(12)); vi.stubGlobal("fetch", fetcher);
    await reconcileAppmaxOrder("local");
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.appmax.com.br/v1/payment-link/link/orders?page=1");
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.appmax.com.br/v1/orders/12");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ provider_payment_id: "12", payment_status: "approved", bling_sync_status: "blocked" }));
  });
  it("holds multiple approved orders rather than exporting twice", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ order: { id: 12 } }, { order: { id: 13 } }], meta: { total_pages: 1 } }))).mockResolvedValueOnce(approved(12)).mockResolvedValueOnce(approved(13)));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Mais de um pedido pago");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ bling_sync_status: "reconciliation_required" }));
    expect(update.mock.calls.some(([row]) => row.payment_status === "approved")).toBe(false);
  });
  it("does not confirm payment on an API failure", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-error", { status: 403 })));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("403");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ bling_sync_status: "reconciliation_required" }));
    expect(JSON.stringify(update.mock.calls)).not.toContain("private-error");
  });
});