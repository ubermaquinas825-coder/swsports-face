import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetryableSyncError } from "@/lib/financial-errors";
import { FinancialMaintenanceError } from "@/lib/financial-maintenance.server";

const { from, rpc, recover, reconcile, token } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), recover: vi.fn(), reconcile: vi.fn(), token: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from, rpc } }));
vi.mock("@/lib/payment-reconciliation.server", () => ({ reconcileAppmaxOrder: reconcile }));
vi.mock("@/lib/bling.server", () => ({ getBlingAccessToken: token }));
vi.mock("@/lib/checkout.server", () => ({ authenticateAppmax: vi.fn() }));
vi.mock("@/lib/bling-recovery.server", () => ({ recoverStaleBlingOrders: recover }));
vi.mock("@/lib/labels.server", () => ({ issuePendingLabels: vi.fn().mockResolvedValue({ issued: 0, errors: [] }) }));
import { exportOrderToBling, syncPaidOrders } from "@/lib/bling-orders.server";

// Preserve the complete filter chain so tests verify both outcome and fencing.
function query(result: unknown) {
  const q = { select: vi.fn(), update: vi.fn(), eq: vi.fn(), is: vi.fn(), not: vi.fn(), or: vi.fn(), gt: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
  for (const key of ["select", "update", "eq", "is", "not", "or", "gt", "order"] as const) q[key].mockReturnValue(q);
  q.limit.mockResolvedValue(result); q.maybeSingle.mockResolvedValue(result);
  return q;
}
beforeEach(() => recover.mockResolvedValue({ inspected: 0, errors: [] }));
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Sync database failures", () => {
  it("rejects a pending-query failure without consulting providers", async () => {
    from.mockReturnValue(query({ data: null, error: { message: "db unavailable" } }));
    await expect(syncPaidOrders()).rejects.toThrow("consultar os pagamentos pendentes");
    expect(reconcile).not.toHaveBeenCalled(); expect(token).not.toHaveBeenCalled();
  });
  it("rejects a queue-query failure rather than returning empty success", async () => {
    from.mockReturnValueOnce(query({ data: [], error: null })).mockReturnValueOnce(query({ data: null, error: { message: "db unavailable" } }));
    await expect(syncPaidOrders()).rejects.toThrow("consultar a fila");
  });
  it("reports individual reconciliation failures explicitly", async () => {
    from.mockReturnValueOnce(query({ data: [{ id: "order" }], error: null })).mockReturnValueOnce(query({ data: [], error: null }));
    reconcile.mockRejectedValue(new Error("reconciliation write failed"));
    await expect(syncPaidOrders()).resolves.toEqual({ labels: 0, checked: 0, exported: 0, errors: ["reconciliation write failed"], retryableFailures: 0, recovered: 0 });
  });
  it("distinguishes a legitimate empty queue from a database failure", async () => {
    from.mockReturnValue(query({ data: [], error: null }));
    await expect(syncPaidOrders()).resolves.toEqual({ labels: 0, checked: 0, exported: 0, errors: [], retryableFailures: 0, recovered: 0 });
  });
  it("classifies safe read retries separately from manual review failures", async () => {
    from.mockReturnValueOnce(query({ data: [{ id: "order" }], error: null })).mockReturnValueOnce(query({ data: [], error: null }));
    reconcile.mockRejectedValue(new RetryableSyncError("temporary provider failure"));
    await expect(syncPaidOrders()).resolves.toMatchObject({ checked: 0, exported: 0, retryableFailures: 1, errors: ["temporary provider failure"] });
  });
  it("does not classify recovered ambiguous creations as automatically retryable", async () => {
    recover.mockResolvedValue({ inspected: 1, errors: ["held for review"] });
    from.mockReturnValue(query({ data: [], error: null }));
    await expect(syncPaidOrders()).resolves.toMatchObject({ retryableFailures: 0, recovered: 1, errors: ["held for review"] });
  });
  it("stops the batch on maintenance without selecting the export queue", async () => {
    from.mockReturnValueOnce(query({ data: [{ id: "order" }], error: null }));
    reconcile.mockImplementation(async () => {
      vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
      throw new FinancialMaintenanceError();
    });
    await expect(syncPaidOrders()).rejects.toBeInstanceOf(FinancialMaintenanceError);
    expect(from).toHaveBeenCalledOnce(); expect(rpc).not.toHaveBeenCalled(); expect(token).not.toHaveBeenCalled();
  });
});

describe("Bling export state fencing", () => {
  const order = { id: "order", financial_revision: "claimed-revision" };
  function existingOrder(finalResult: unknown) {
    const claim = query({ data: order, error: null });
    const settings = query({ data: { config: { warehouseId: 1, checkAtCheckout: false, mappings: [] } }, error: null });
    const final = query(finalResult);
    rpc.mockReturnValueOnce(claim);
    from.mockReturnValueOnce(settings).mockReturnValueOnce(final);
    token.mockResolvedValue("fixture-token");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 42 }] })));
    vi.stubGlobal("fetch", fetcher);
    return { final, fetcher };
  }
  function expectFenced(q: ReturnType<typeof query>) {
    expect(q.eq).toHaveBeenCalledWith("financial_revision", "claimed-revision");
    expect(q.eq).toHaveBeenCalledWith("bling_sync_status", "processing");
    expect(q.eq).toHaveBeenCalledWith("payment_status", "approved");
    expect(q.is).toHaveBeenCalledWith("bling_order_id", null);
  }
  it("throws when claiming the export fails in the database", async () => {
    rpc.mockReturnValue(query({ data: null, error: { message: "db unavailable" } }));
    await expect(exportOrderToBling("order")).rejects.toThrow("adquirir o pedido");
    expect(token).not.toHaveBeenCalled();
  });
  it("does not export when another worker owns the order", async () => {
    rpc.mockReturnValue(query({ data: null, error: null }));
    await expect(exportOrderToBling("order")).resolves.toEqual({ exported: false });
    expect(token).not.toHaveBeenCalled();
  });
  it("only marks synced with the revision acquired by this export", async () => {
    const { final, fetcher } = existingOrder({ data: { id: "order" }, error: null });
    await expect(exportOrderToBling("order")).resolves.toEqual({ exported: true, blingOrderId: 42 });
    expectFenced(final);
    // An existing ERP order is read, never recreated, in this local fixture.
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBeUndefined();
  });
  it("can finish an admitted export but refuses a new one after maintenance starts", async () => {
    const { final, fetcher } = existingOrder({ data: { id: "order" }, error: null });
    fetcher.mockImplementationOnce(async () => {
      vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
      return new Response(JSON.stringify({ data: [{ id: 42 }] }));
    });
    await expect(exportOrderToBling("order")).resolves.toEqual({ exported: true, blingOrderId: 42 });
    expect(final.update).toHaveBeenCalledWith(expect.objectContaining({ bling_sync_status: "synced" }));
    await expect(exportOrderToBling("another-order")).rejects.toBeInstanceOf(FinancialMaintenanceError);
    expect(rpc).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledOnce();
  });
  it("cannot overwrite a newer hold with synced or a failure flag", async () => {
    const { final } = existingOrder({ data: null, error: null });
    const flagged = query({ data: null, error: null }); from.mockReturnValueOnce(flagged);
    await expect(exportOrderToBling("order")).rejects.toThrow("Nenhum estado foi sobrescrito");
    expectFenced(final); expectFenced(flagged);
  });
  it("surfaces failure to persist the export result", async () => {
    existingOrder({ data: null, error: { message: "write failed" } });
    from.mockReturnValueOnce(query({ data: { id: "order" }, error: null }));
    await expect(exportOrderToBling("order")).rejects.toThrow("registrar o número");
  });
  it("surfaces a database failure while recording manual review", async () => {
    rpc.mockReturnValueOnce(query({ data: order, error: null }));
    from.mockReturnValueOnce(query({ data: null, error: { message: "read failed" } })).mockReturnValueOnce(query({ data: null, error: { message: "flag failed" } }));
    await expect(exportOrderToBling("order")).rejects.toThrow("registrar a revisão manual");
  });
  it("does not select the first of multiple existing ERP orders or issue another creation", async () => {
    const { final, fetcher } = existingOrder({ data: { id: "order" }, error: null });
    fetcher.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 42 }, { id: 43 }] })));
    await expect(exportOrderToBling("order")).rejects.toThrow("Mais de um pedido Bling");
    expect(fetcher).toHaveBeenCalledOnce(); expect(final.update).toHaveBeenCalledWith(expect.objectContaining({ bling_sync_status: "reconciliation_required" }));
  });
});
