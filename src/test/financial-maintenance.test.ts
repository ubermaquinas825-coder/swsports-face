import { afterEach, describe, expect, it, vi } from "vitest";
import { assertFinancialOperationsEnabled, financialMaintenanceResponse, isFinancialMaintenanceEnabled } from "@/lib/financial-maintenance.server";

afterEach(() => vi.unstubAllEnvs());

describe("Financial maintenance configuration", () => {
  it.each([undefined, "false", " FALSE "])("preserves operation for %s", (value) => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", value);
    expect(isFinancialMaintenanceEnabled()).toBe(false);
    expect(assertFinancialOperationsEnabled).not.toThrow();
    expect(financialMaintenanceResponse()).toBeNull();
  });

  it.each(["true", " TRUE ", "", "0", "flase"])("blocks operation for %s", async (value) => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", value);
    expect(isFinancialMaintenanceEnabled()).toBe(true);
    expect(assertFinancialOperationsEnabled).toThrow("manutenção");
    const response = financialMaintenanceResponse()!;
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toMatchObject({ ok: false, maintenance: true, code: "FINANCIAL_MAINTENANCE" });
  });

  it("reads the runtime switch at every admission instead of caching it", () => {
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
    expect(assertFinancialOperationsEnabled).not.toThrow();
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "true");
    expect(assertFinancialOperationsEnabled).toThrow("manutenção");
    vi.stubEnv("SWSPORTS_FINANCIAL_MAINTENANCE", "false");
    expect(assertFinancialOperationsEnabled).not.toThrow();
  });
});
