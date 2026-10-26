import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetryableSyncError } from "@/lib/financial-errors";
const { sync, authenticate } = vi.hoisted(() => ({ sync: vi.fn(), authenticate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/payment-sync.server", () => ({ syncPayments: sync }));
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
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("Payment-only scheduler", () => {
  it("reports payment results without export or automatic label actions", async () => {
    sync.mockResolvedValue({ checked: 2, approved: 1, failed: 0, errors: [] });
    const response = await run();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      paymentsChecked: 2,
      paymentsApproved: 1,
      paymentsFailed: 0,
      failures: 0,
      ok: true,
    });
  });
  it("returns retryable status without exposing provider error text", async () => {
    sync.mockResolvedValue({ checked: 1, approved: 0, failed: 0, errors: ["private error"] });
    const response = await run();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private error");
  });
  it("does not turn an unexpected failure into success", async () => {
    sync.mockRejectedValue(new Error("database unavailable"));
    await expect(run()).rejects.toThrow("database unavailable");
  });
  it("requests retry for temporary database failure", async () => {
    sync.mockRejectedValue(new RetryableSyncError("temporary"));
    expect((await run()).status).toBe(503);
  });
  it("authenticates before payment access", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await run()).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
});
