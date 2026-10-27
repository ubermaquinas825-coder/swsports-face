// Runtime-only admission control. Never use a VITE_* variable for this switch.
// This is not a distributed drain signal and cannot fence older deployments.
export const FINANCIAL_MAINTENANCE_MESSAGE = "Operações temporariamente indisponíveis para manutenção. Tente novamente mais tarde.";

export function isPreviewEnvironment(): boolean {
  return process.env["VERCEL_ENV"] === "preview";
}

export function isFinancialMaintenanceEnabled(): boolean {
  // Vercel Preview must never mutate production financial, stock or logistics state.
  // This remains a second line of defense even when production-only secrets are
  // correctly scoped out of Preview deployments.
  if (isPreviewEnvironment()) return true;

  const value = process.env["SWSPORTS_FINANCIAL_MAINTENANCE"];
  // Preserve existing deployments until the operator deliberately enables it.
  if (value === undefined) return false;
  // Fail closed for an empty or unrecognized value, rather than silently resume.
  return value.trim().toLowerCase() !== "false";
}

export class FinancialMaintenanceError extends Error {
  constructor() {
    super(FINANCIAL_MAINTENANCE_MESSAGE);
    this.name = "FinancialMaintenanceError";
  }

  toResponse(): Response {
    return Response.json({ ok: false, maintenance: true, code: "FINANCIAL_MAINTENANCE", message: this.message }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}

export function assertFinancialOperationsEnabled(): void {
  if (isFinancialMaintenanceEnabled()) throw new FinancialMaintenanceError();
}

export function financialMaintenanceResponse(): Response | null {
  if (!isFinancialMaintenanceEnabled()) return null;
  return new FinancialMaintenanceError().toResponse();
}
