import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron/sync-orders")({ server: { handlers: { POST: async ({ request }) => {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { syncPaidOrders } = await import("@/lib/bling-orders.server");
  const result = await syncPaidOrders();
  return Response.json({ checked: result.checked, exported: result.exported, failures: result.errors.length }, { status: result.errors.length ? 503 : 200 });
} } } });
