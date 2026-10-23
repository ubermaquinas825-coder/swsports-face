import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { z } from "zod";
import { LeaseLostError, RetryableSyncError } from "./financial-errors";
import { authenticateAppmax } from "./checkout.server";
import { evaluateAppmaxPayment } from "./payment-reconciliation";

const linksSchema = z.object({ data: z.array(z.object({ order: z.object({ id: z.number().int().positive() }) })).max(100), meta: z.object({ total_pages: z.number().int().min(1).max(20) }) });
async function readAppmax(path: string, token: string) {
  let response: Response;
  try {
    response = await fetch(`https://api.appmax.com.br/v1/${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  } catch { throw new RetryableSyncError("Consulta Appmax temporariamente indisponível."); }
  if (response.status === 429 || response.status >= 500) throw new RetryableSyncError(`Consulta Appmax temporariamente recusada (HTTP ${response.status}).`);
  if (!response.ok) throw new Error(`Consulta Appmax recusada (HTTP ${response.status}).`);
  try { return await response.json() as unknown; }
  catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new RetryableSyncError("Leitura Appmax excedeu o prazo.");
    throw error;
  }
}
export async function reconcileAppmaxOrder(orderId: string) {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.rpc("claim_appmax_check_v2", { _order_id: orderId });
  if (claim.error) throw new RetryableSyncError("Não foi possível iniciar a conferência.");
  if (!claim.data) return { checked: false };
  let revision = claim.data;
  const deadline = Date.now() + 110_000;
  const renew = async () => {
    if (Date.now() >= deadline) throw new RetryableSyncError("Conferência Appmax atingiu o orçamento de tempo.");
    const renewed = await supabaseAdmin.rpc("renew_appmax_check", { _order_id: orderId, _expected_revision: revision });
    if (renewed.error) throw new LeaseLostError("Não foi possível renovar a concessão Appmax; nenhuma observação será aplicada.");
    if (!renewed.data) throw new LeaseLostError("Concessão Appmax perdida ou expirada; nenhum estado será sobrescrito.");
    revision = renewed.data;
  };
  const read = async (path: string, token: string) => { await renew(); return readAppmax(path, token); };
  let selected: { id: number; state: "pending" | "approved" | "failed"; status: string } | undefined;
  try {
    const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", orderId).single();
    if (result.error) throw new RetryableSyncError("Não foi possível ler o pedido para conferência.");
    if (!result.data?.payment_link_id) throw new Error("Pedido sem vínculo Appmax verificável.");
    const order = result.data;
    if (order.financial_revision !== revision) throw new LeaseLostError("O pedido mudou durante a conferência. Nenhum estado foi sobrescrito.");
    await renew();
    const token = await authenticateAppmax();
    const path = `payment-link/${encodeURIComponent(order.payment_link_id ?? "")}/orders`;
    const ids = new Set<number>();
    const first = linksSchema.parse(await read(`${path}?page=1`, token));
    first.data.forEach((row) => ids.add(row.order.id));
    for (let page = 2; page <= first.meta.total_pages; page++) {
      linksSchema.parse(await read(`${path}?page=${page}`, token)).data.forEach((row) => ids.add(row.order.id));
    }
    if (ids.size > 20) throw new Error("Múltiplas tentativas Appmax: conferência manual necessária.");
    const expected = order.subtotal_cents - order.discount_cents + (order.freight_cents ?? 0);
    const checks: Array<{ id: number; state: "pending" | "approved" | "failed"; status: string }> = [];
    for (const id of ids) checks.push({ id, ...evaluateAppmaxPayment(await read(`orders/${id}`, token), id, expected) });
    const paid = checks.filter((c) => c.state === "approved");
    if (paid.length > 1) throw new Error("Mais de um pedido pago no mesmo link: não exportar automaticamente.");
    const associated = checks.find((c) => String(c.id) === order.provider_payment_id);
    selected = order.provider_payment_id ? associated : paid[0];
    if (order.provider_payment_id && (!associated || paid.some((c) => String(c.id) !== order.provider_payment_id))) throw new Error("Associação Appmax divergente: conferência manual necessária.");
    await renew();
  } catch (error) {
    if (error instanceof LeaseLostError) throw error;
    if (error instanceof RetryableSyncError) {
      const deferred = await supabaseAdmin.rpc("defer_appmax_check", { _order_id: orderId, _expected_revision: revision });
      if (deferred.error || !deferred.data) throw new RetryableSyncError("Não foi possível agendar nova conferência sem sobrescrever o pedido.");
      throw error;
    }
    const flagged = await supabaseAdmin.rpc("commit_appmax_check", {
      _order_id: orderId, _expected_revision: revision, _payment_state: null,
      _provider_payment_id: null, _appmax_status: null, _inconclusive: true,
    } as never);
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
  } as never);
  if (saved.error) throw new RetryableSyncError("Não foi possível salvar a conferência Appmax.");
  if (!saved.data) throw new Error("Conferência não aplicada: pedido alterado, trava expirada ou transição financeira bloqueada.");
  return { checked: true, status: selected?.status ?? "pendente" };
}
