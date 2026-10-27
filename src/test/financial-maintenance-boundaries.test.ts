import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { database, request, authenticate } = vi.hoisted(() => ({
  database: vi.fn(),
  request: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const b = { middleware: () => b, validator: () => b, inputValidator: () => b, handler: (fn: unknown) => fn };
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
import { beginMelhorEnvioAuthorization, saveShippingConfig, verifyShippingIntegrations } from "@/lib/shipping.functions";
import { checkPayments } from "@/lib/payment-reconciliation.functions";
import { resetMelhorEnvioShipping } from "@/lib/melhor-envio-cart.functions";
import { prepareMelhorEnvioCart } from "@/lib/melhor-envio-cart.server";
import { syncPayments } from "@/lib/payment-sync.server";
import { Route as CronRoute } from "@/routes/api/public/cron/sync-orders";
import { Route as OAuthAuthorizeRoute } from "@/routes/api/melhor-envio/authorize";
const invoke = (fn: unknown) =>
  (fn as (args: unknown) => Promise<unknown>)({
    data: {},
    context: { userId: "admin", supabase: { from: database, rpc: database } },
  });
const cron = (
  CronRoute as unknown as {
    server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } };
  }
).server.handlers.POST;
const publicOAuthAuthorize = (
  OAuthAuthorizeRoute as unknown as {
    server: { handlers: { GET: () => Promise<Response> } };
  }
).server.handlers.GET;
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
      beginMelhorEnvioAuthorization,
      saveShippingConfig,
      verifyShippingIntegrations,
      checkPayments,
      resetMelhorEnvioShipping,
    }),
  )("blocks %s before external calls", async (_name, fn) => {
    await expect(invoke(fn)).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("does not expose the Melhor Envio OAuth state through a public initiator", async () => {
    vi.stubEnv("MELHOR_ENVIO_OAUTH_STATE", "must-not-be-exposed");
    const response = await publicOAuthAuthorize();
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("must-not-be-exposed");
    expect(database).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("blocks Melhor Envio cart preparation and payment scheduler during maintenance", async () => {
    await expect(prepareMelhorEnvioCart("00000000-0000-4000-8000-000000000000")).rejects.toThrow("manutenção");
    await expect(syncPayments()).rejects.toThrow("manutenção");
    expect(database).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
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
