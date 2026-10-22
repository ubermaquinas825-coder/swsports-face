import { z } from "zod";
import { getBlingAccessToken } from "./bling.server";
import { authenticateAppmax } from "./checkout.server";
import { blingInventoryConfigSchema } from "./bling-inventory";
import { appmaxCustomerSchema, buildBlingSaleOrder, digitsOnly, orderItemsSchema } from "./bling-orders";

async function bling(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.bling.com.br/Api/v3/${path}`, { ...init, headers: { Authorization: `Bearer ${await getBlingAccessToken()}`, Accept: "application/json", "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
  // Never persist provider bodies; keep only the status for diagnosis.
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

/** Exports one Appmax-approved order to Bling once. Lock = conditional status transition queued -> processing. */
export async function exportOrderToBling(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.from("shipping_orders").update({ bling_sync_status: "processing", bling_sync_error: null }).eq("id", orderId).eq("bling_sync_status", "queued").eq("payment_status", "approved").is("bling_order_id", null).select("*").maybeSingle();
  if (claim.error || !claim.data) return { exported: false };
  const order = claim.data;
  try {
    const settings = await supabaseAdmin.from("bling_store_settings").select("config").eq("id", true).maybeSingle();
    if (settings.error || !settings.data) throw new Error("Vínculos Bling não configurados.");
    const config = blingInventoryConfigSchema.parse(settings.data.config);
    // Duplicate guard: an earlier attempt may have created the order before failing to save its id.
    const existing = idList.parse(await bling(`pedidos/vendas?pagina=1&limite=2&numerosLojas[]=${encodeURIComponent(order.id)}`)).data;
    let blingOrderId = existing[0]?.id;
    if (!blingOrderId) {
      const appmaxId = order.provider_payment_id;
      if (!appmaxId) throw new Error("Pagamento Appmax sem identificador.");
      const res = await fetch(`https://api.appmax.com.br/v1/orders/${encodeURIComponent(appmaxId)}`, { headers: { Authorization: `Bearer ${await authenticateAppmax()}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Consulta Appmax recusada (HTTP ${res.status}).`);
      const appmax = appmaxCustomerSchema.parse(await res.json());
      if (String(appmax.data.order.id) !== appmaxId) throw new Error("A Appmax retornou outro pedido.");
      const contactId = await findOrCreateContact(appmax.data.customer, order.id);
      const service = z.object({ company: z.string().optional(), name: z.string().optional() }).nullable().catch(null).parse(order.shipping_service);
      const payload = buildBlingSaleOrder({ orderId: order.id, contactId, date: new Date().toISOString().slice(0, 10), items: orderItemsSchema.parse(order.items), freightCents: order.freight_cents ?? 0, config, appmaxOrderId: appmaxId, serviceName: [service?.company, service?.name].filter(Boolean).join(" "), cep: order.quoted_cep ?? "" });
      blingOrderId = z.object({ data: z.object({ id: z.number().int().positive() }) }).parse(await bling("pedidos/vendas", { method: "POST", body: JSON.stringify(payload) })).data.id;
    }
    const saved = await supabaseAdmin.from("shipping_orders").update({ bling_order_id: blingOrderId, bling_sync_status: "synced", bling_sync_error: null }).eq("id", orderId);
    if (saved.error) throw new Error("Pedido criado no Bling, mas não foi possível registrar o número.");
    return { exported: true, blingOrderId };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Falha desconhecida.";
    // Ambiguous failures (timeouts, 5xx after POST) go to manual review; the numeroLoja lookup prevents duplicates on retry.
    await supabaseAdmin.from("shipping_orders").update({ bling_sync_status: "reconciliation_required", bling_sync_error: `Envio ao Bling falhou: ${message}` }).eq("id", orderId);
    throw error;
  }
}

/** Automatic cycle: confirm recent pending Appmax payments, then export queued orders. */
export async function syncPaidOrders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { reconcileAppmaxOrder } = await import("./payment-reconciliation.server");
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const pending = await supabaseAdmin.from("shipping_orders").select("id").not("payment_link_id", "is", null).eq("payment_status", "pending").gt("created_at", since).order("appmax_checked_at", { ascending: true, nullsFirst: true }).limit(5);
  let checked = 0, exported = 0; const errors: string[] = [];
  for (const row of pending.data ?? []) { try { if ((await reconcileAppmaxOrder(row.id)).checked) checked++; } catch (e) { errors.push(e instanceof Error ? e.message : "erro"); } }
  const queued = await supabaseAdmin.from("shipping_orders").select("id").eq("bling_sync_status", "queued").limit(5);
  for (const row of queued.data ?? []) { try { if ((await exportOrderToBling(row.id)).exported) exported++; } catch (e) { errors.push(e instanceof Error ? e.message : "erro"); } }
  return { checked, exported, errors };
}
