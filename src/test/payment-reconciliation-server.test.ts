import { describe, expect, it, vi, afterEach } from "vitest";
const rpc = vi.fn(); const single = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc, from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } }));
vi.mock("@/lib/checkout.server", () => ({ authenticateAppmax: async () => "test-token" }));
import { reconcileAppmaxOrder } from "@/lib/payment-reconciliation.server";
const order = { id: "local", payment_link_id: "link", provider_payment_id: null, subtotal_cents: 4990, discount_cents: 0, freight_cents: 1474, financial_revision: "lease-revision" };
const approved = (id: number) => new Response(JSON.stringify({ data: { order: { id, status: "aprovado", total_paid: 6464 }, payment: { paid_at: "2026-10-22 20:00:00" } } }));
describe("Appmax reconciliation safety", () => {
  afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
  function setup() {
    rpc.mockImplementation(async (name: string) => ({ data: name === "claim_appmax_check_v2" ? "lease-revision" : true, error: null })); single.mockResolvedValue({ data: order, error: null });
  }
  it("does not run concurrent checks when the database lease is held", async () => {
    rpc.mockResolvedValue({ data: null, error: null }); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await reconcileAppmaxOrder("local")).toEqual({ checked: false }); expect(fetcher).not.toHaveBeenCalled(); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("uses saved link membership and queues approved payment for Bling export", async () => {
    setup(); const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ order: { id: 12 } }], meta: { total_pages: 1 } }))).mockResolvedValueOnce(approved(12)); vi.stubGlobal("fetch", fetcher);
    await reconcileAppmaxOrder("local");
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.appmax.com.br/v1/payment-link/link/orders?page=1");
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.appmax.com.br/v1/orders/12");
    expect(rpc).toHaveBeenLastCalledWith("commit_appmax_check", expect.objectContaining({ _expected_revision: "lease-revision", _provider_payment_id: "12", _payment_state: "approved", _inconclusive: false }));
  });
  it("holds multiple approved orders rather than exporting twice", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ order: { id: 12 } }, { order: { id: 13 } }], meta: { total_pages: 1 } }))).mockResolvedValueOnce(approved(12)).mockResolvedValueOnce(approved(13)));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Mais de um pedido pago");
    expect(rpc).toHaveBeenLastCalledWith("commit_appmax_check", expect.objectContaining({ _inconclusive: true, _expected_revision: "lease-revision" }));
    expect(rpc.mock.calls.some(([, args]) => args?._payment_state === "approved")).toBe(false);
  });
  it("does not confirm payment on an API failure", async () => {
    setup(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-error", { status: 403 })));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("403");
    expect(rpc).toHaveBeenLastCalledWith("commit_appmax_check", expect.objectContaining({ _inconclusive: true, _expected_revision: "lease-revision" }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("private-error");
  });
  it("reports a claim database error before calling Appmax", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("iniciar a conferência");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([false, null])("does not report a rejected commit (%s) as checked", async (data) => {
    setup();
    rpc.mockResolvedValueOnce({ data: "lease-revision", error: null }).mockResolvedValueOnce({ data, error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [], meta: { total_pages: 1 } }))));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Conferência não aplicada");
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("does not retry writes after a commit database error", async () => {
    setup();
    rpc.mockResolvedValueOnce({ data: "lease-revision", error: null }).mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [], meta: { total_pages: 1 } }))));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("salvar a conferência");
    expect(rpc).toHaveBeenCalledTimes(2);
  });
  it("refuses to use a snapshot from another lease", async () => {
    setup(); single.mockResolvedValue({ data: { ...order, financial_revision: "newer" }, error: null });
    rpc.mockResolvedValueOnce({ data: "lease-revision", error: null }).mockResolvedValueOnce({ data: false, error: null });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("Nenhum estado foi sobrescrito");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports failure to persist manual review instead of swallowing it", async () => {
    setup();
    rpc.mockResolvedValueOnce({ data: "lease-revision", error: null }).mockResolvedValueOnce({ data: null, error: { message: "write failed" } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-error", { status: 403 })));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("registrar a revisão manual");
  });
  it("does not approve a payment with malformed paid_at", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ order: { id: 12 } }], meta: { total_pages: 1 } }))).mockResolvedValueOnce(new Response(JSON.stringify({ data: { order: { id: 12, status: "aprovado", total_paid: 6464 }, payment: { paid_at: "invalid" } } }))));
    await expect(reconcileAppmaxOrder("local")).rejects.toThrow("data ou valor divergente");
    expect(rpc).toHaveBeenLastCalledWith("commit_appmax_check", expect.objectContaining({ _inconclusive: true, _payment_state: null }));
  });
});
