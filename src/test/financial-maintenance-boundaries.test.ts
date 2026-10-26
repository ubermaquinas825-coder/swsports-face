import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { database, request, authenticate } = vi.hoisted(() => ({
  database: vi.fn(),
  request: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn };
    return b;
  },
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: database, rpc: database },
}));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: authenticate }));
import { createMercadoPagoCheckout } from "@/lib/checkout.functions";
import { saveShippingConfig, verifyShippingIntegrations } from "@/lib/shipping.functions";
import { checkPayments } from "@/lib/payment-reconciliation.functions";
import { prepareSuperfreteCart } from "@/lib/superfrete-cart.server";
import { syncPayments } from "@/lib/payment-sync.server";
import { Route } from "@/routes/api/public/cron/sync-orders";
const invoke = (fn: unknown) =>
  (fn as (args: unknown) => Promise<unknown>)({
    data: {},
    context: { userId: "admin", supabase: { from: database, rpc: database } },
  });
const cron = (
  Route as unknown as {
    server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } };
  }
).server.handlers.POST;
beforeEach(() => {
  vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
  vi.stubGlobal("fetch", request);
  authenticate.mockResolvedValue(null);
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Active financial maintenance boundaries", () => {
  it.each(
    Object.entries({
      createMercadoPagoCheckout,
      saveShippingConfig,
      verifyShippingIntegrations,
      checkPayments,
    }),
  )("blocks %s before external calls", async (_name, fn) => {
    await expect(invoke(fn)).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("blocks cart preparation and payment scheduler during maintenance", async () => {
    await expect(prepareSuperfreteCart("id")).rejects.toThrow("manutenção");
    await expect(syncPayments()).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled();
  });
  it("keeps cron authentication before maintenance", async () => {
    authenticate.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await cron({ request: new Request("https://local.test") })).status).toBe(401);
    expect(database).not.toHaveBeenCalled();
  });
  it("returns maintenance without invoking financial providers", async () => {
    const response = await cron({ request: new Request("https://local.test") });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ maintenance: true });
    expect(database).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
