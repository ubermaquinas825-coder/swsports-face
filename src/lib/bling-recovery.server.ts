import { assertFinancialOperationsEnabled, FinancialMaintenanceError } from "./financial-maintenance.server";
import { z } from "zod";
import { getBlingAccessToken } from "./bling.server";
import { RetryableSyncError } from "./financial-errors";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["shipping_orders"]["Row"];
async function readBling(path: string) {
  const response = await fetch(`https://api.bling.com.br/Api/v3/${path}`, {
    method: "GET", headers: { Authorization: `Bearer ${await getBlingAccessToken()}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Consulta de recuperação Bling indisponível. Mantenha o bloqueio.");
  return response.json() as Promise<unknown>;
}

// Recovery never creates ERP contacts/orders or requeues an uncertain creation.
export async function inspectHeldBlingOrder(order: Order) {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let outcome: "found" | "not_found" | "ambiguous" | "lookup_failed" = "lookup_failed";
  let blingId: number | null = null;
  try {
    const rows = z.object({ data: z.array(z.object({ id: z.number().int().positive() })).max(2) })
      .parse(await readBling(`pedidos/vendas?pagina=1&limite=2&numerosLojas[]=${encodeURIComponent(order.id)}`)).data;
    outcome = rows.length === 0 ? "not_found" : "ambiguous";
    if (rows.length === 1 && rows[0]) {
      const detail = z.object({ data: z.object({ id: z.number().int().positive(), numeroLoja: z.string() }) })
        .parse(await readBling(`pedidos/vendas/${rows[0].id}`)).data;
      if (detail.id === rows[0].id && detail.numeroLoja === order.id) { outcome = "found"; blingId = detail.id; }
    }
  } catch { outcome = "lookup_failed"; }
  const recorded = await supabaseAdmin.rpc("record_bling_recovery", {
    _order_id: order.id, _expected_revision: order.financial_revision, _outcome: outcome, _bling_order_id: blingId,
  });
  if (recorded.error || !recorded.data) throw new Error("Não foi possível registrar a recuperação sem sobrescrever uma decisão mais recente.");
  return { outcome, blingId };
}

export async function recoverStaleBlingOrders() {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const stale = await supabaseAdmin.rpc("quarantine_stale_bling_orders");
  if (stale.error) throw new RetryableSyncError("Não foi possível identificar processamentos Bling interrompidos.");
  const errors: string[] = [];
  let inspected = 0;
  for (const order of stale.data ?? []) {
    try {
      const result = await inspectHeldBlingOrder(order);
      inspected++;
      errors.push(result.outcome === "found" ? "Pedido Bling localizado; requer resolução administrativa auditada." : "Recuperação Bling inconclusiva; não recriar o pedido.");
    } catch (error) {
      if (error instanceof FinancialMaintenanceError) throw error;
      errors.push("Recuperação Bling exige conferência manual; não repetir criações externas.");
    }
  }
  return { inspected, errors };
}
