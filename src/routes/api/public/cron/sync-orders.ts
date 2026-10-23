import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { RetryableSyncError } from "@/lib/financial-errors";

export const Route = createFileRoute("/api/public/cron/sync-orders")({ server: { handlers: { POST: async ({ request }) => {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { financialMaintenanceResponse, FinancialMaintenanceError } = await import("@/lib/financial-maintenance.server");
  const maintenance = financialMaintenanceResponse();
  if (maintenance) return maintenance;
  const { syncPaidOrders } = await import("@/lib/bling-orders.server");
  try {
    const result = await syncPaidOrders();
    const { syncShippingLabels } = await import("@/lib/shipping-labels.server");
    const labels = await syncShippingLabels();
    const retryable = result.retryableFailures;
    const failures = result.errors.length + labels.errors.length;
    return Response.json({ checked: result.checked, exported: result.exported, recovered: result.recovered, labelsIssued: labels.issued,
      failures, retryableFailures: retryable, manualReviewFailures: failures - retryable,
      ok: failures === 0 }, {
      status: retryable ? 503 : failures ? 207 : 200,
      headers: retryable ? { "Retry-After": "60" } : {},
    });
  } catch (error) {
    if (error instanceof FinancialMaintenanceError) return error.toResponse();
    if (!(error instanceof RetryableSyncError)) throw error;
    return Response.json({ ok: false, failures: 1, retryableFailures: 1 }, { status: 503, headers: { "Retry-After": "60" } });
  }
} } } });
