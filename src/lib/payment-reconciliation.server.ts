import { z } from "zod";
import { authenticateAppmax } from "./checkout.server";
import { evaluateAppmaxPayment } from "./payment-reconciliation";

const linksSchema = z.object({ data: z.array(z.object({ order: z.object({ id: z.number().int().positive() }) })).max(100), meta: z.object({ total_pages: z.number().int().min(1).max(20) }) });
async function readAppmax(path: string, token: string) {
  const response = await fetch(`https://api.appmax.com.br/v1/${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Consulta Appmax recusada (HTTP ${response.status}).`);
  return response.json() as Promise<unknown>;
}
export async function reconcileAppmaxOrder(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.rpc("claim_appmax_check", { _order_id: orderId });
  if (claim.error) throw new Error("Não foi possível iniciar a conferência.");
  if (!claim.data) return { checked: false };
  try {
    const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", orderId).single();
    if (result.error || !result.data?.payment_link_id) throw new Error("Pedido sem vínculo Appmax verificável.");
    const order = result.data;
    const token = await authenticateAppmax();
    const path = `payment-link/${encodeURIComponent(order.payment_link_id ?? "")}/orders`;
    const ids = new Set<number>();
    const first = linksSchema.parse(await readAppmax(`${path}?page=1`, token));
    first.data.forEach((row) => ids.add(row.order.id));
    for (let page = 2; page <= first.meta.total_pages; page++) {
      linksSchema.parse(await readAppmax(`${path}?page=${page}`, token)).data.forEach((row) => ids.add(row.order.id));
    }
    if (ids.size > 20) throw new Error("Múltiplas tentativas Appmax: conferência manual necessária.");
    const expected = order.subtotal_cents - order.discount_cents + (order.freight_cents ?? 0);
    const checks: Array<{ id: number; state: "pending" | "approved" | "failed"; status: string }> = [];
    for (const id of ids) checks.push({ id, ...evaluateAppmaxPayment(await readAppmax(`orders/${id}`, token), id, expected) });
    const paid = checks.filter((c) => c.state === "approved");
    if (paid.length > 1) throw new Error("Mais de um pedido pago no mesmo link: não exportar automaticamente.");
    const associated = checks.find((c) => String(c.id) === order.provider_payment_id);
    const selected = order.provider_payment_id ? associated : paid[0];
    if (order.provider_payment_id && (!associated || paid.some((c) => String(c.id) !== order.provider_payment_id))) throw new Error("Associação Appmax divergente: conferência manual necessária.");
    const saved = await supabaseAdmin.from("shipping_orders").update({
      appmax_checked_at: new Date().toISOString(), appmax_status: selected?.status ?? "pendente", appmax_check_lock_until: null,
      ...(selected ? { provider_payment_id: String(selected.id), payment_status: selected.state,
        ...(selected.state === "pending" ? {} : { bling_sync_status: "blocked", bling_sync_error: selected.state === "approved" ? "Pagamento confirmado pela API. Exportação bloqueada: validar endereço final, depósito e configuração Bling." : "Appmax cancelado/estornado ou contestado; não enviar ou baixar estoque." }) } : {}),
    }).eq("id", orderId);
    if (saved.error) throw new Error("Não foi possível salvar a conferência Appmax.");
    return { checked: true, status: selected?.status ?? "pendente" };
  } catch (error) {
    await supabaseAdmin.from("shipping_orders").update({ appmax_checked_at: new Date().toISOString(), appmax_check_lock_until: null, bling_sync_status: "reconciliation_required", bling_sync_error: "Conferência Appmax inconclusiva. Não enviar ou baixar estoque antes da revisão." }).eq("id", orderId);
    throw error;
  }
}