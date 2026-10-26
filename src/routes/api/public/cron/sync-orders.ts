import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { RetryableSyncError } from "@/lib/financial-errors";

async function synchronize({ request }: { request: Request }) {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { financialMaintenanceResponse, FinancialMaintenanceError } =
    await import("@/lib/financial-maintenance.server");
  const maintenance = financialMaintenanceResponse();
  if (maintenance) return maintenance;

  try {
    const [{ syncPayments }, { syncMelhorEnvioTracking }] = await Promise.all([
      import("@/lib/payment-sync.server"),
      import("@/lib/shipping-tracking.server"),
    ]);
    const payments = await syncPayments();
    const tracking = await syncMelhorEnvioTracking();
    const failures = payments.errors.length + tracking.errors.length;
    return Response.json(
      {
        paymentsChecked: payments.checked,
        paymentsApproved: payments.approved,
        paymentsFailed: payments.failed,
        paymentsHeldForReview: payments.held,
        trackingChecked: tracking.checked,
        trackingUpdated: tracking.updated,
        trackingFailures: tracking.errors.length,
        failures,
        ok: failures === 0,
      },
      { status: failures ? 503 : 200, headers: failures ? { "Retry-After": "60" } : {} },
    );
  } catch (error) {
    if (error instanceof FinancialMaintenanceError) return error.toResponse();
    if (!(error instanceof RetryableSyncError)) throw error;
    return Response.json(
      { ok: false, failures: 1 },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}

export const Route = createFileRoute("/api/public/cron/sync-orders")({
  server: { handlers: { GET: synchronize, POST: synchronize } },
});
