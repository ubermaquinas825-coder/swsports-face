import { createFileRoute } from "@tanstack/react-router";
import { RetryableSyncError } from "@/lib/financial-errors";
import { appmaxWebhookEnvelope, shouldReconcileNow, tryAcquireSyncSlot } from "@/lib/appmax-webhook";

// Appmax expects a webhook answer in under 5 seconds and redelivers otherwise.
// The reconciliation may legitimately take longer, so it gets a bounded slice
// and the one-minute schedule remains the guarantee that anything unfinished is
// completed. The notification itself never decides a financial state.
const SYNC_BUDGET_MS = 4_000;

export const Route = createFileRoute("/api/public/webhooks/appmax")({ server: { handlers: { POST: async ({ request }) => {
  const { financialMaintenanceResponse, FinancialMaintenanceError } = await import("@/lib/financial-maintenance.server");
  const maintenance = financialMaintenanceResponse();
  if (maintenance) return maintenance;

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ ok: false, code: "INVALID_JSON" }, { status: 400 }); }

  const parsed = appmaxWebhookEnvelope.safeParse(payload);
  if (!parsed.success) return Response.json({ ok: false, code: "INVALID_ENVELOPE" }, { status: 400 });
  if (!shouldReconcileNow(parsed.data)) return Response.json({ ok: true });

  // The verified payload is never forwarded: it only asks the store to re-read
  // its own pending orders through the authenticated providers.
  if (!tryAcquireSyncSlot()) return Response.json({ ok: true });

  const { syncPaidOrders } = await import("@/lib/bling-orders.server");
  const settled = await Promise.race([
    syncPaidOrders().then((result) => ({ kind: "done" as const, result })).catch((error: unknown) => ({ kind: "error" as const, error })),
    new Promise<{ kind: "budget" }>((resolve) => { setTimeout(() => resolve({ kind: "budget" }), SYNC_BUDGET_MS); }),
  ]);

  if (settled.kind === "budget") return Response.json({ ok: true });
  if (settled.kind === "error") {
    if (settled.error instanceof FinancialMaintenanceError) return settled.error.toResponse();
    if (settled.error instanceof RetryableSyncError) {
      return Response.json({ ok: false, code: "RETRY_LATER" }, { status: 503, headers: { "Retry-After": "60" } });
    }
    throw settled.error;
  }
  if (settled.result.retryableFailures > 0) {
    return Response.json({ ok: false, code: "RETRY_LATER" }, { status: 503, headers: { "Retry-After": "60" } });
  }
  return Response.json({ ok: true });
} } } });
