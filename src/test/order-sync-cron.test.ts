import { RetryableSyncError } from "@/lib/financial-errors";
import { FinancialMaintenanceError } from "@/lib/financial-maintenance.server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sync, reconcilePayments, authenticate } = vi.hoisted(() => ({
  sync: vi.fn(),
  reconcilePayments: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/mercadopago-reconciliation.server", () => ({ reconcilePendingMercadoPagoOrders: reconcilePayments }));
vi.mock("@/lib/bling-orders.server", () => ({ syncPaidOrders: sync }));
vi.mock("@/lib/shipping-labels.server", () => ({ syncShippingLabels: async () => ({ issued: 0, errors: [] }) }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: authenticate }));
import { Route } from "@/routes/api/public/cron/sync-orders";

// The router factory above exposes the handler without starting a server.
const handler = (Route as unknown as { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } }).server.handlers.POST;

beforeEach(() => {
  reconcilePayments.mockResolvedValue({ checked: 0, approved: 0, failed: 0, errors: [] });
});
afterEach(() => vi.resetAllMocks());

describe("Order synchronization cron", () => {
  it("returns non-success for partial failures without exposing internal errors", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockResolvedValue({ checked: 1, exported: 0, errors: ["database write failed"], retryableFailures: 1, recovered: 0 });
    const response = await handler({ request: new Request("https://local.invalid/api/public/cron/sync-orders", { method: "POST" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      paymentsChecked: 0,
      paymentsApproved: 0,
      paymentsFailed: 0,
      checked: 1,
      exported: 0,
      recovered: 0,
      labelsIssued: 0,
      failures: 1,
      retryableFailures: 1,
      manualReviewFailures: 0,
      ok: false,
    });
  });

  it("includes Mercado Pago reconciliation failures in bounded scheduler retries", async () => {
    authenticate.mockResolvedValue(null);
    reconcilePayments.mockResolvedValue({ checked: 2, approved: 1, failed: 0, errors: ["temporary Mercado Pago read failure"] });
    sync.mockResolvedValue({ checked: 0, exported: 0, errors: [], retryableFailures: 0, recovered: 0 });
    const response = await handler({ request: new Request("https://local.invalid", { method: "POST" }) });
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toMatchObject({ paymentsChecked: 2, paymentsApproved: 1, failures: 1, retryableFailures: 1, ok: false });
  });

  it("does not convert a database exception into successful counters", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockRejectedValue(new Error("database read failed"));
    await expect(handler({ request: new Request("https://local.invalid", { method: "POST" }) })).rejects.toThrow("database read failed");
  });

  it("returns success when the cycle completes without failures", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockResolvedValue({ checked: 0, exported: 0, errors: [], retryableFailures: 0, recovered: 0 });
    expect((await handler({ request: new Request("https://local.invalid", { method: "POST" }) })).status).toBe(200);
  });

  it("does not request scheduler retries for manual-only failures", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockResolvedValue({ checked: 0, exported: 0, recovered: 1, errors: ["manual review required"], retryableFailures: 0 });
    const response = await handler({ request: new Request("https://local.invalid", { method: "POST" }) });
    expect(response.status).toBe(207);
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(await response.json()).toMatchObject({ ok: false, failures: 1, retryableFailures: 0, manualReviewFailures: 1 });
  });

  it("requests bounded retries for a temporary batch query failure", async () => {
    authenticate.mockResolvedValue(null);
    sync.mockRejectedValue(new RetryableSyncError("database unavailable"));
    const response = await handler({ request: new Request("https://local.invalid", { method: "POST" }) });
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toEqual({ ok: false, failures: 1, retryableFailures: 1 });
  });

  it("preserves cron authentication before any synchronization", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await handler({ request: new Request("https://local.invalid", { method: "POST" }) })).status).toBe(401);
    expect(reconcilePayments).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("reports maintenance during a batch without classifying it as manual review", async () => {
    authenticate.mockResolvedValue(null);
    reconcilePayments.mockRejectedValue(new FinancialMaintenanceError());
    const response = await handler({ request: new Request("https://local.invalid", { method: "POST" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, maintenance: true, code: "FINANCIAL_MAINTENANCE" });
    expect(sync).not.toHaveBeenCalled();
  });
});
