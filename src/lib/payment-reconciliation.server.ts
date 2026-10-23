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
  const claim = await supabaseAdmin.rpc("claim_appmax_check_v2", { _order_id: orderId });
  if (claim.error) throw new Error("Não foi possível iniciar a conferência.");
  if (!claim.data) return { checked: false };
  const revision = claim.data;
  let selected: { id: number; state: "pending" | "approved" | "failed"; status: string } | undefined;
  try {
    const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", orderId).single();
    if (result.error || !result.data?.payment_link_id) throw new Error("Pedido sem vínculo Appmax verificável.");
    const order = result.data;
    if (order.financial_revision !== revision) throw new Error("O pedido mudou durante a conferência. Nenhum estado foi sobrescrito.");
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
    selected = order.provider_payment_id ? associated : paid[0];
    if (order.provider_payment_id && (!associated || paid.some((c) => String(c.id) !== order.provider_payment_id))) throw new Error("Associação Appmax divergente: conferência manual necessária.");
  } catch (error) {
    const flagged = await supabaseAdmin.rpc("commit_appmax_check", {
      _order_id: orderId, _expected_revision: revision, _payment_state: null,
      _provider_payment_id: null, _appmax_status: null, _inconclusive: true,
    });
    if (flagged.error) throw new Error("A conferência falhou e não foi possível registrar a revisão manual.", { cause: error });
    if (!flagged.data) throw new Error("A conferência falhou após mudança ou expiração da trava do pedido. Nenhum estado foi sobrescrito.", { cause: error });
    throw error;
  }
  // Commit outside the catch: an uncertain database result must not trigger a
  // second write. The RPC checks revision, live lease and transition atomically.
  const saved = await supabaseAdmin.rpc("commit_appmax_check", {
    _order_id: orderId, _expected_revision: revision, _payment_state: selected?.state ?? null,
    _provider_payment_id: selected ? String(selected.id) : null,
    _appmax_status: selected?.status ?? "pendente", _inconclusive: false,
  });
  if (saved.error) throw new Error("Não foi possível salvar a conferência Appmax.");
  if (!saved.data) throw new Error("Conferência não aplicada: pedido alterado, trava expirada ou transição financeira bloqueada.");
  return { checked: true, status: selected?.status ?? "pendente" };
}
