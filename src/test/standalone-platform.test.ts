import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

beforeEach(() => {
  for (const key of ["VERCEL", "CRON_SECRET", "LOVABLE_CRON_SECRET", "LOVABLE_CRON_SECRET_PREVIOUS"]) vi.stubEnv(key, "");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

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
