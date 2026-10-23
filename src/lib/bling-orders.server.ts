import { assertFinancialOperationsEnabled, FinancialMaintenanceError } from "./financial-maintenance.server";
import { z } from "zod";
import { RetryableSyncError } from "./financial-errors";
import { recoverStaleBlingOrders } from "./bling-recovery.server";
import { getBlingAccessToken } from "./bling.server";
import { authenticateAppmax } from "./checkout.server";
import { blingInventoryConfigSchema } from "./bling-inventory";
import { appmaxCustomerSchema, buildBlingSaleOrder, digitsOnly, orderItemsSchema } from "./bling-orders";
import { deliveryAddressSchema } from "./delivery-address";
import { mercadoPagoOrderIdFromLink, verifyMercadoPagoStoredOrder } from "./mercadopago.server";

async function bling(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.bling.com.br/Api/v3/${path}`, { ...init, headers: { Authorization: `Bearer ${await getBlingAccessToken()}`, Accept: "application/json", "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Object.assign(new Error(`Bling recusou ${init.method ?? "GET"} ${path.split("?")[0]} (HTTP ${response.status}).`), { status: response.status });
  return response.status === 204 ? {} : (response.json() as Promise<unknown>);
}
const idList = z.object({ data: z.array(z.object({ id: z.number().int().positive() })) });

async function findOrCreateContact(customer: { name?: string | undefined; email?: string | undefined; document_number?: string | undefined } | null | undefined, orderId: string) {
  const doc = digitsOnly(customer?.document_number);
  if (doc.length === 11 || doc.length === 14) {
    const found = idList.parse(await bling(`contatos?pagina=1&limite=2&numeroDocumento=${doc}`)).data;
    if (found[0]) return found[0].id;
  }
  const created = z.object({ data: z.object({ id: z.number().int().positive() }) }).parse(await bling("contatos", { method: "POST", body: JSON.stringify({
    nome: customer?.name || `Cliente site ${orderId.slice(0, 8)}`, situacao: "A", tipo: doc.length === 14 ? "J" : "F",
    ...(doc.length === 11 || doc.length === 14 ? { numeroDocumento: doc } : {}), ...(customer?.email ? { email: customer.email } : {}),
  }) }));
  return created.data.id;
}

export async function exportOrderToBling(orderId: string) {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.rpc("claim_bling_export", { _order_id: orderId }).maybeSingle();
  if (claim.error) throw new RetryableSyncError("Não foi possível adquirir o pedido para envio ao Bling.");
  if (!claim.data) return { exported: false };
  const order = claim.data;
  try {
    if (!order.financial_revision) throw new Error("A migração de segurança financeira é necessária antes de exportar pedidos.");
    const settings = await supabaseAdmin.from("bling_store_settings").select("config").eq("id", true).maybeSingle();
    if (settings.error || !settings.data) throw new Error("Vínculos Bling não configurados.");
    const config = blingInventoryConfigSchema.parse(settings.data.config);
    const existing = idList.parse(await bling(`pedidos/vendas?pagina=1&limite=2&numerosLojas[]=${encodeURIComponent(order.id)}`)).data;
    if (existing.length > 1) throw new Error("Mais de um pedido Bling para a mesma venda. Revisão manual necessária.");
    let blingOrderId = existing[0]?.id;
    if (!blingOrderId) {
      const service = z.object({ company: z.string().optional(), name: z.string().optional() }).nullable().catch(null).parse(order.shipping_service);
      const mercadoPagoOrderId = mercadoPagoOrderIdFromLink(order.payment_link_id);
      let contactId: number;
      let providerPaymentId: string;

      if (mercadoPagoOrderId) {
        const verified = await verifyMercadoPagoStoredOrder(order);
        if (verified.state !== "approved" || !verified.providerPaymentId) throw new Error("Pagamento Mercado Pago não está aprovado para exportação.");
        if (order.provider_payment_id && order.provider_payment_id !== verified.providerPaymentId) throw new Error("Identificador Mercado Pago divergente. Revisão manual necessária.");
        providerPaymentId = verified.providerPaymentId;
        const address = deliveryAddressSchema.parse(order.delivery_address);
        contactId = await findOrCreateContact({ name: address.name, email: address.email, document_number: address.document }, order.id);
      } else {
        const appmaxId = order.provider_payment_id;
        if (!appmaxId) throw new Error("Pagamento Appmax sem identificador.");
        const res = await fetch(`https://api.appmax.com.br/v1/orders/${encodeURIComponent(appmaxId)}`, { headers: { Authorization: `Bearer ${await authenticateAppmax()}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Consulta Appmax recusada (HTTP ${res.status}).`);
        const appmax = appmaxCustomerSchema.parse(await res.json());
        if (String(appmax.data.order.id) !== appmaxId) throw new Error("A Appmax retornou outro pedido.");
        providerPaymentId = appmaxId;
        contactId = await findOrCreateContact(appmax.data.customer, order.id);
      }

      const payload = buildBlingSaleOrder({ orderId: order.id, contactId, date: new Date().toISOString().slice(0, 10), items: orderItemsSchema.parse(order.items), freightCents: order.freight_cents ?? 0, config, appmaxOrderId: providerPaymentId, serviceName: [service?.company, service?.name].filter(Boolean).join(" "), cep: order.quoted_cep ?? "" });
      blingOrderId = z.object({ data: z.object({ id: z.number().int().positive() }) }).parse(await bling("pedidos/vendas", { method: "POST", body: JSON.stringify(payload) })).data.id;
    }
    const saved = await supabaseAdmin.from("shipping_orders").update({ bling_order_id: blingOrderId, bling_sync_status: "synced", bling_sync_error: null }).eq("id", orderId).eq("financial_revision", order.financial_revision).eq("bling_sync_status", "processing").eq("payment_status", "approved").is("bling_order_id", null).select("id").maybeSingle();
    if (saved.error) throw new Error("Pedido criado no Bling, mas não foi possível registrar o número.");
    if (!saved.data) throw new Error("O pedido mudou durante o envio ao Bling. Conferência manual necessária; nenhum estado foi sobrescrito.");
    return { exported: true, blingOrderId };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Falha desconhecida.";
    const flagged = await supabaseAdmin.from("shipping_orders").update({ bling_sync_status: "reconciliation_required", bling_sync_error: `Envio ao Bling falhou: ${message}` }).eq("id", orderId).eq("financial_revision", order.financial_revision).eq("bling_sync_status", "processing").eq("payment_status", "approved").is("bling_order_id", null).select("id").maybeSingle();
    if (flagged.error) throw new Error("Envio ao Bling falhou e não foi possível registrar a revisão manual.", { cause: error });
    if (!flagged.data) throw new Error("Envio ao Bling inconclusivo após mudança do pedido. Nenhum estado foi sobrescrito; confira o pedido no ERP.", { cause: error });
    throw error;
  }
}

export async function syncPaidOrders() {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { reconcileAppmaxOrder } = await import("./payment-reconciliation.server");
  const recovery = await recoverStaleBlingOrders();
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const pending = await supabaseAdmin.from("shipping_orders").select("id").not("payment_link_id", "is", null).not("payment_link_id", "like", "mp:%").eq("payment_status", "pending").not("bling_sync_status", "in", "(blocked,reconciliation_required)").or(`appmax_next_check_at.is.null,appmax_next_check_at.lte.${new Date().toISOString()}`).gt("created_at", since).order("appmax_checked_at", { ascending: true, nullsFirst: true }).limit(5);
  if (pending.error) throw new RetryableSyncError("Não foi possível consultar os pagamentos pendentes.");
  let checked = 0, exported = 0, retryableFailures = 0;
  const errors: string[] = [...recovery.errors];
  const recordError = (error: unknown) => {
    if (error instanceof FinancialMaintenanceError) throw error;
    errors.push(error instanceof Error ? error.message : "erro");
    if (error instanceof RetryableSyncError) retryableFailures++;
  };
  for (const row of pending.data ?? []) { try { if ((await reconcileAppmaxOrder(row.id)).checked) checked++; } catch (e) { recordError(e); } }
  const queued = await supabaseAdmin.from("shipping_orders").select("id").eq("bling_sync_status", "queued").limit(5);
  if (queued.error) throw new RetryableSyncError("Não foi possível consultar a fila de pedidos Bling.");
  for (const row of queued.data ?? []) { try { if ((await exportOrderToBling(row.id)).exported) exported++; } catch (e) { recordError(e); } }
  return { checked, exported, errors, retryableFailures, recovered: recovery.inspected };
}
