import {
  assertFinancialOperationsEnabled,
  FinancialMaintenanceError,
} from "./financial-maintenance.server";
import { reconcilePendingMercadoPagoOrders } from "./mercadopago-reconciliation.server";
import { reconcileAppmaxOrder } from "./payment-reconciliation.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { RetryableSyncError } from "./financial-errors";

// Payments only. No ERP exports, stock mutations or label purchases.
export async function syncPayments() {
  assertFinancialOperationsEnabled();
  const mp = await reconcilePendingMercadoPagoOrders();
  const pending = await supabaseAdmin
    .from("shipping_orders")
    .select("id")
    .not("payment_link_id", "is", null)
    .not("payment_link_id", "like", "mp:%")
    .eq("payment_status", "pending")
    .not("bling_sync_status", "in", "(blocked,reconciliation_required)")
    .or(`appmax_next_check_at.is.null,appmax_next_check_at.lte.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(5);
  if (pending.error)
    throw new RetryableSyncError("Não foi possível consultar os pagamentos pendentes.");
  let checked = mp.checked;
  const errors = [...mp.errors];
  for (const row of pending.data ?? []) {
    try {
      if ((await reconcileAppmaxOrder(row.id)).checked) checked++;
    } catch (error) {
      if (error instanceof FinancialMaintenanceError) throw error;
      errors.push("Pagamento pendente de conferência.");
    }
  }
  return { checked, approved: mp.approved, failed: mp.failed, errors };
}
