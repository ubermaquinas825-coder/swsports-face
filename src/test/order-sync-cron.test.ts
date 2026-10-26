import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetryableSyncError } from "@/lib/financial-errors";

const { syncPayments, syncTracking, authenticate } = vi.hoisted(() => ({
  syncPayments: vi.fn(),
  syncTracking: vi.fn(),
  authenticate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/payment-sync.server", () => ({ syncPayments }));
vi.mock("@/lib/shipping-tracking.server", () => ({ syncMelhorEnvioTracking: syncTracking }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: authenticate }));

import { Route } from "@/routes/api/public/cron/sync-orders";

const handler = (
  Route as unknown as {
    server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } };
  }
).server.handlers.POST;
const run = () => handler({ request: new Request("https://local.test", { method: "POST" }) });

beforeEach(() => {
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
  authenticate.mockResolvedValue(null);
  syncPayments.mockResolvedValue({ checked: 0, approved: 0, failed: 0, held: 0, errors: [] });
  syncTracking.mockResolvedValue({ checked: 0, updated: 0, errors: [] });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("ERP daily scheduler", () => {
  it("reports payment and Melhor Envio tracking results without label purchases", async () => {
    syncPayments.mockResolvedValue({ checked: 2, approved: 1, failed: 0, held: 1, errors: [] });
    syncTracking.mockResolvedValue({ checked: 3, updated: 2, errors: [] });
    const response = await run();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      paymentsChecked: 2,
      paymentsApproved: 1,
      paymentsFailed: 0,
      paymentsHeldForReview: 1,
      trackingChecked: 3,
      trackingUpdated: 2,
      trackingFailures: 0,
      failures: 0,
      ok: true,
    });
  });

  it("does not count a safely held historical payment as a cron failure", async () => {
    syncPayments.mockResolvedValue({ checked: 1, approved: 0, failed: 0, held: 1, errors: [] });
    const response = await run();
    expect(response.status).toBe(200);
    expect((await response.json()).paymentsHeldForReview).toBe(1);
  });

  it("returns retryable status without exposing provider error text", async () => {
    syncTracking.mockResolvedValue({ checked: 1, updated: 0, errors: ["private provider error"] });
    const response = await run();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private provider error");
  });

  it("does not turn an unexpected failure into success", async () => {
    syncPayments.mockRejectedValue(new Error("database unavailable"));
    await expect(run()).rejects.toThrow("database unavailable");
  });

  it("requests retry for temporary database failure", async () => {
    syncPayments.mockRejectedValue(new RetryableSyncError("temporary"));
    expect((await run()).status).toBe(503);
  });

  it("authenticates before payment or tracking access", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await run()).status).toBe(401);
    expect(syncPayments).not.toHaveBeenCalled();
    expect(syncTracking).not.toHaveBeenCalled();
  });
});
