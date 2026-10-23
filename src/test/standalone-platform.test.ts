import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { superfreteConfigured, superfreteRequest } from "@/lib/superfrete.server";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

beforeEach(() => {
  for (const key of ["VERCEL", "SUPERFRETE_API_TOKEN", "SUPERFRETE_CONTACT_EMAIL", "LOVABLE_API_KEY", "UDC_SUPERFRETE_API_KEY", "CRON_SECRET", "LOVABLE_CRON_SECRET", "LOVABLE_CRON_SECRET_PREVIOUS"]) vi.stubEnv(key, "");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Standalone SuperFrete", () => {
  it("uses the official production API and token without the Lovable gateway", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("SUPERFRETE_API_TOKEN", "synthetic-test-token");
    vi.stubEnv("SUPERFRETE_CONTACT_EMAIL", "test@example.com");
    const request = vi.fn().mockResolvedValue(new Response("[]")); vi.stubGlobal("fetch", request);
    expect(superfreteConfigured()).toBe(true);
    await superfreteRequest("calculator", undefined, { test: true });
    expect(request).toHaveBeenCalledWith("https://api.superfrete.com/api/v0/calculator", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ Authorization: "Bearer synthetic-test-token", "User-Agent": "SW Sports/1.0 (test@example.com)" }),
    }));
    expect(request.mock.calls[0]?.[1]?.headers).not.toHaveProperty("X-Connection-Api-Key");
  });
  it("does not silently depend on a Lovable connector in Vercel", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("LOVABLE_API_KEY", "legacy"); vi.stubEnv("UDC_SUPERFRETE_API_KEY", "legacy");
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    expect(superfreteConfigured()).toBe(false);
    await expect(superfreteRequest("user", "test@example.com")).rejects.toThrow("indisponível");
    expect(request).not.toHaveBeenCalled();
  });
  it("preserves the existing gateway deployment while migrating", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "legacy"); vi.stubEnv("UDC_SUPERFRETE_API_KEY", "connector");
    const request = vi.fn().mockResolvedValue(new Response("{}")); vi.stubGlobal("fetch", request);
    await superfreteRequest("user", "test@example.com");
    expect(request).toHaveBeenCalledWith("https://connector-gateway.lovable.dev/udc_superfrete/api/v0/user", expect.objectContaining({ method: "GET", headers: expect.objectContaining({ "X-Connection-Api-Key": "connector" }) }));
  });
});

describe("Vercel scheduler authentication", () => {
  it("accepts Vercel's authenticated GET request and rejects the old deployment's secret", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("CRON_SECRET", "new-cron-secret"); vi.stubEnv("LOVABLE_CRON_SECRET", "old-cron-secret");
    const request = (token: string) => new Request("https://swsports.com.br/api/public/cron/sync-orders", { headers: { Authorization: `Bearer ${token}` } });
    expect(await authenticateCronRequest(request("new-cron-secret"))).toBeNull();
    expect((await authenticateCronRequest(request("old-cron-secret")))?.status).toBe(401);
  });
  it("rejects unauthenticated cron requests", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("CRON_SECRET", "test-secret");
    expect((await authenticateCronRequest(new Request("https://swsports.com.br/api/public/cron/sync-orders")))?.status).toBe(401);
  });
});
