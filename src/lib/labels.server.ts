import { z } from "zod";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { buildSuperFreteCart, deliveryAddressSchema, labelPriceAcceptable } from "./delivery";
import { choosePackage, defaultShippingConfig, shippingConfigSchema } from "./shipping";
import { orderItemsSchema } from "./bling-orders";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/udc_superfrete";
async function superfrete(path: string, body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  const conn = process.env["UDC_SUPERFRETE_API_KEY"];
  if (!key || !conn) throw new Error("SuperFrete indisponível.");
  const res = await fetch(`${GATEWAY_URL}${path}`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  // Provider bodies may contain customer data; keep only the status.
  if (!res.ok) throw new Error(`SuperFrete recusou ${path} (HTTP ${res.status}).`);
  return res.json() as Promise<unknown>;
}

/**
 * Issues one paid SuperFrete label for an approved order. Lock = conditional
 * label_status awaiting -> processing. Any failure goes to manual review, never retried.
 */
export async function issueLabel(orderId: string) {
  assertFinancialOperationsEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const claim = await supabaseAdmin.from("shipping_orders").update({ label_status: "processing", label_processing_started_at: new Date().toISOString() })
    .eq("id", orderId).eq("label_status", "awaiting").eq("payment_status", "approved").is("provider_shipment_id", null).select("*").maybeSingle();
  if (claim.error || !claim.data) return { issued: false };
  const order = claim.data;
  const save = (patch: Record<string, unknown>) => supabaseAdmin.from("shipping_orders").update(patch).eq("id", orderId).eq("label_status", "processing");
  try {
    const address = deliveryAddressSchema.parse(order.delivery_address);
    const service = z.object({ id: z.string(), priceCents: z.number().int() }).parse(order.shipping_service);
    const items = orderItemsSchema.parse(order.items);
    const settings = await supabaseAdmin.from("shipping_settings").select("config").eq("id", true).maybeSingle();
    const config = settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig;
    const pkg = choosePackage(items.reduce((s, i) => s + i.qty, 0), config);
    if (!pkg || !order.quoted_cep) throw new Error("Embalagem ou CEP ausente.");
    const cart = z.object({ id: z.string().min(1), price: z.coerce.number() }).parse(await superfrete("/api/v0/cart", buildSuperFreteCart({ orderId, originCep: config.originCep, cep: order.quoted_cep, serviceId: service.id, address, items, pkg, subtotalCents: order.subtotal_cents })));
    const cartCents = Math.round(cart.price * 100);
    // Persist the shipment id before paying so a later failure can never create a second label.
    const stored = await save({ provider_shipment_id: cart.id, label_price_cents: cartCents });
    if (stored.error) throw new Error("Etiqueta criada (pendente), mas não foi possível registrar o id.");
    if (!labelPriceAcceptable(service.priceCents, cartCents)) throw new Error(`Etiqueta custaria R$ ${(cartCents / 100).toFixed(2)}, acima do frete cobrado. Pague manualmente no painel SuperFrete se aprovar.`);
    const paid = z.object({ success: z.literal(true), purchase: z.object({ orders: z.array(z.object({ id: z.string(), tracking: z.string().nullish() })) }) }).parse(await superfrete("/api/v0/checkout", { orders: [cart.id] }));
    const tracking = paid.purchase.orders.find((o) => o.id === cart.id)?.tracking ?? null;
    const print = z.object({ url: z.string().url() }).safeParse(await superfrete("/api/v0/tag/print", { orders: [cart.id] }).catch(() => null));
    await save({ label_status: "issued", shipping_status: "ready_to_post", tracking_code: tracking, label_url: print.success ? print.data.url : null, label_error: null });
    return { issued: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Falha desconhecida.";
    await save({ label_status: "review", label_error: message });
    throw error;
  }
}

export async function issuePendingLabels() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = await supabaseAdmin.from("shipping_orders").select("id").eq("label_status", "awaiting").eq("payment_status", "approved").is("provider_shipment_id", null).limit(5);
  let issued = 0; const errors: string[] = [];
  for (const row of rows.data ?? []) {
    try { if ((await issueLabel(row.id)).issued) issued++; } catch (e) { errors.push(e instanceof Error ? e.message : "erro"); }
  }
  return { issued, errors };
}
