import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertFinancialOperationsEnabled, FinancialMaintenanceError } from "./financial-maintenance.server";
import { defaultShippingConfig, shippingConfigSchema } from "./shipping";
import { buildLabelPayload, officialLabelUrl, verifyLabelInfo } from "./shipping-labels";
import { superfreteRequest } from "./superfrete.server";
import { reconcileAppmaxOrder } from "./payment-reconciliation.server";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["shipping_orders"]["Row"];

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const result = await supabaseAdmin.rpc(name as never, args as never);
  if (result.error) throw new Error("Não foi possível persistir a etapa de emissão. Conferir SuperFrete antes de tentar novamente.");
  return result.data as T;
}

/** One durable attempt only. Uncertain creation/payment never becomes a new POST on the next cycle. */
export async function issueShippingLabel(orderId: string) {
  assertFinancialOperationsEnabled();
  const settings = await supabaseAdmin.from("shipping_settings").select("config").eq("id", true).maybeSingle();
  if (settings.error) throw new Error("Não foi possível ler as configurações de envio.");
  const config = settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig;
  const sender = config.labelAutomation.sender;
  if (!config.labelAutomation.enabled || !sender) return { issued: false };
  if (!process.env["LOVABLE_API_KEY"] || !process.env["UDC_SUPERFRETE_API_KEY"]) throw new Error("Conector SuperFrete indisponível; nenhuma etiqueta criada.");
  // A previous approved snapshot, or a webhook, cannot authorize a new debit.
  const checked = await reconcileAppmaxOrder(orderId);
  if (!checked.checked) return { issued: false };
  const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", orderId).single();
  if (result.error || !result.data) throw new Error("Não foi possível ler o pedido.");
  const order = result.data;
  if (order.payment_status !== "approved" || order.bling_sync_status !== "synced" || order.provider_shipment_id) return { issued: false };
  if (!order.quoted_cep || order.freight_cents === null || order.discount_cents !== 0) throw new Error("Frete ou valor declarado requer conferência manual.");
  const payload = buildLabelPayload({ orderId, address: order.delivery_address, cep: order.quoted_cep,
    service: order.shipping_service, items: order.items, subtotalCents: order.subtotal_cents, sender });
  const call = (path: string, body?: unknown) => { assertFinancialOperationsEnabled(); return superfreteRequest(path, sender.email, body); };
  // Requote the saved service and provider-returned volume, never a later edited package.
  const quotes = z.array(z.object({ id: z.union([z.string(), z.number()]), price: z.coerce.number().finite().nonnegative(), has_error: z.boolean().optional(), error: z.unknown().optional() }))
    .parse(await call("calculator", { from: { postal_code: sender.postal_code }, to: { postal_code: order.quoted_cep },
      services: String(payload.service), package: payload.volumes,
      options: { own_hand: false, receipt: false, insurance_value: order.subtotal_cents / 100, use_insurance_value: true } }));
  const quote = quotes.find((row) => String(row.id) === String(payload.service) && !row.has_error && !row.error);
  if (!quote || Math.round(quote.price * 100) !== order.freight_cents) throw new Error("O preço do frete mudou. Conferir antes de emitir a etiqueta.");
  const token = await rpc<string | null>("claim_shipping_label", { _order_id: orderId, _revision: order.financial_revision, _payload: payload });
  if (!token) return { issued: false };
  const advance = async (from: string, to: string, extra: Record<string, unknown> = {}) => {
    assertFinancialOperationsEnabled();
    if (!await rpc<boolean>("advance_shipping_label", { _order_id: orderId, _token: token, _from: from, _to: to, ...extra })) {
      throw new Error("Pedido alterado durante emissão; conferir etiqueta na SuperFrete.");
    }
  };
  try {
    const rawCreated = await call("cart", payload);
    const identity = z.object({ id: z.string().min(1).max(200) }).parse(rawCreated);
    // Persist external identity before any further call or validation can fail.
    await advance("creating", "created", { _shipment_id: identity.id });
    const created = z.object({ id: z.string(), status: z.string(), price: z.coerce.number().finite().nonnegative() }).parse(rawCreated);
    if (created.status !== "pending" || Math.round(created.price * 100) !== order.freight_cents) throw new Error("Etiqueta criada com valor ou estado divergente; não pagar automaticamente.");
    const info = verifyLabelInfo(await call(`order/info/${encodeURIComponent(created.id)}`), created.id, payload, order.freight_cents);
    if (info.status !== "pending") throw new Error("Etiqueta não está aguardando pagamento; conferir SuperFrete.");
    await advance("created", "paying");
    const paid = z.object({ success: z.literal(true), purchase: z.object({ status: z.literal("paid"), orders: z.array(z.object({ id: z.string(), tracking: z.string().nullable().optional() })).length(1) }) })
      .parse(await call("checkout", { orders: [created.id] }));
    if (paid.purchase.orders[0]?.id !== created.id) throw new Error("Pagamento retornou outra etiqueta.");
    const verified = verifyLabelInfo(await call(`order/info/${encodeURIComponent(created.id)}`), created.id, payload, order.freight_cents);
    if (!["released", "posted", "delivered"].includes(verified.status) || !verified.tracking) throw new Error("Pagamento sem etiqueta liberada ou rastreamento verificável.");
    await advance("paying", "paid", { _tracking: verified.tracking });
    await advance("paid", "printing");
    const print = z.object({ url: z.string() }).parse(await call("tag/print", { orders: [created.id] }));
    await advance("printing", "complete", { _url: officialLabelUrl(print.url), _tracking: verified.tracking });
    return { issued: true };
  } catch (error) {
    await rpc("fail_shipping_label", { _order_id: orderId, _token: token });
    if (error instanceof FinancialMaintenanceError) throw error;
    // No retries here, including HTTP 5xx, timeouts and uncertain DB responses.
    throw new Error("Emissão interrompida. Confira o pedido e o saldo na SuperFrete antes de qualquer nova tentativa.");
  }
}

export async function syncShippingLabels() {
  assertFinancialOperationsEnabled();
  const settings = await supabaseAdmin.from("shipping_settings").select("config").eq("id", true).maybeSingle();
  if (settings.error) throw new Error("Não foi possível ler a configuração de etiquetas.");
  const config = settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig;
  if (!config.labelAutomation.enabled) return { issued: 0, errors: [] as string[] };
  await rpc("quarantine_shipping_labels");
  const candidates = await rpc<Order[]>("shipping_label_candidates");
  let issued = 0;
  const errors: string[] = [];
  for (const row of candidates) {
    try { if ((await issueShippingLabel(row.id)).issued) issued++; }
    catch (error) {
      if (error instanceof FinancialMaintenanceError) throw error;
      await rpc("flag_shipping_label_preparation", { _order_id: row.id });
      errors.push("Etiqueta pendente de conferência na SuperFrete.");
    }
  }
  return { issued, errors };
}
