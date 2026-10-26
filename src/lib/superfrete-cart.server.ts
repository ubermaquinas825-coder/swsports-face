import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { shippingConfigSchema } from "./shipping";
import { buildLabelPayload, verifyLabelInfo } from "./shipping-labels";
import { superfreteConfigured, superfreteRequest } from "./superfrete.server";
import { mercadoPagoOrderIdFromLink, verifyMercadoPagoStoredOrder } from "./mercadopago.server";
import { reconcileAppmaxOrder } from "./payment-reconciliation.server";

// Provider dashboard only: no invented checkout deep links or customer data in URLs.
const dashboardUrl = "https://web.superfrete.com/";
async function loadOrder(id: string) {
  const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", id).single();
  if (result.error || !result.data) throw new Error("Não foi possível carregar o pedido.");
  return result.data;
}

export async function prepareSuperfreteCart(orderId: string) {
  assertFinancialOperationsEnabled();
  if (!superfreteConfigured())
    throw new Error("Configure a integração SuperFrete no servidor antes de preparar o envio.");
  const settings = await supabaseAdmin
    .from("shipping_settings")
    .select("config")
    .eq("id", true)
    .single();
  if (settings.error) throw new Error("Configure o remetente em Frete e envios.");
  const config = shippingConfigSchema.parse(settings.data.config);
  const sender = config.labelAutomation.sender;
  if (!sender)
    throw new Error(
      "Preencha e salve os dados completos do remetente em Frete e envios. A emissão automática pode permanecer desligada.",
    );
  let order = await loadOrder(orderId);
  if (
    order.payment_status !== "approved" ||
    ["blocked", "reconciliation_required", "processing"].includes(order.bling_sync_status)
  )
    throw new Error(
      "O pedido precisa estar pago e sem bloqueios financeiros para preparar o envio.",
    );
  if (order.shipping_status === "logistics_failed")
    throw new Error("Envio em revisão. Confira a SuperFrete antes de qualquer nova tentativa.");
  if (order.provider_shipment_id)
    throw new Error(
      "Este pedido já possui um envio vinculado. Confira-o na SuperFrete; nenhum novo envio foi criado.",
    );
  if (!order.quoted_cep || order.freight_cents === null || order.discount_cents !== 0)
    throw new Error(
      "Frete ou declaração de conteúdo precisa de conferência antes de preparar o envio.",
    );
  if (mercadoPagoOrderIdFromLink(order.payment_link_id)) {
    const payment = await verifyMercadoPagoStoredOrder(order);
    if (
      payment.state !== "approved" ||
      !payment.providerPaymentId ||
      payment.providerPaymentId !== order.provider_payment_id
    )
      throw new Error("Pagamento não confirmado para este pedido.");
  } else {
    if (!(await reconcileAppmaxOrder(orderId)).checked)
      throw new Error("Pagamento em conferência. Aguarde e atualize o pedido.");
    order = await loadOrder(orderId);
  }
  const payload = buildLabelPayload({
    orderId,
    address: order.delivery_address,
    cep: order.quoted_cep!,
    service: order.shipping_service,
    items: order.items,
    subtotalCents: order.subtotal_cents,
    sender,
  });
  const call = (path: string, body?: unknown) => {
    assertFinancialOperationsEnabled();
    return superfreteRequest(path, sender.email, body);
  };
  const quotes = z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        price: z.coerce.number().finite().nonnegative(),
        error: z.unknown().optional(),
        has_error: z.boolean().optional(),
      }),
    )
    .parse(
      await call("calculator", {
        from: { postal_code: sender.postal_code },
        to: { postal_code: order.quoted_cep },
        services: String(payload.service),
        package: payload.volumes,
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: order.subtotal_cents / 100,
          use_insurance_value: true,
        },
      }),
    );
  const quote = quotes.find(
    (q) => String(q.id) === String(payload.service) && !q.error && !q.has_error,
  );
  if (!quote || Math.round(quote.price * 100) !== order.freight_cents)
    throw new Error(
      "O valor do frete mudou ou o serviço está indisponível. Confira antes de criar o envio.",
    );
  const claim = await supabaseAdmin.rpc("claim_manual_shipping_cart", {
    _order_id: orderId,
    _revision: order.financial_revision,
    _payload: payload,
  });
  if (claim.error)
    throw new Error(
      "Preparação manual indisponível no banco. É necessário aplicar a migração 0010 e seus pré-requisitos após revisar o banco.",
    );
  if (!claim.data)
    throw new Error(
      "O pedido mudou ou já existe uma tentativa de envio. Atualize o painel e confira a SuperFrete.",
    );
  try {
    const raw = await call("cart", payload);
    const created = z.object({ id: z.string().min(1).max(200) }).parse(raw);
    const saved = await supabaseAdmin.rpc("complete_manual_shipping_cart", {
      _order_id: orderId,
      _token: claim.data,
      _shipment_id: created.id,
    });
    if (saved.error || !saved.data) throw new Error("Não foi possível vincular o envio.");
    const result = z.object({ status: z.literal("pending"), price: z.coerce.number() }).parse(raw);
    if (Math.round(result.price * 100) !== order.freight_cents)
      throw new Error("Frete divergente.");
    const info = verifyLabelInfo(
      await call(`order/info/${encodeURIComponent(created.id)}`),
      created.id,
      payload,
      order.freight_cents!,
    );
    if (info.status !== "pending") throw new Error("Envio não está aguardando pagamento.");
    const current = await loadOrder(orderId);
    if (
      current.payment_status !== "approved" ||
      current.shipping_status !== "awaiting_label_payment" ||
      ["blocked", "reconciliation_required"].includes(current.bling_sync_status)
    )
      throw new Error("Pedido alterado durante a preparação.");
    return {
      shipmentId: created.id,
      dashboardUrl,
      message:
        "Envio preparado. Entre na mesma conta SuperFrete, localize o envio pelo identificador e confira os dados antes de pagar.",
    };
  } catch {
    // The durable review-stage job remains reserved even on timeouts. Never retry POST cart.
    await supabaseAdmin
      .from("shipping_orders")
      .update({ shipping_status: "logistics_failed" })
      .eq("id", orderId);
    throw new Error(
      "Preparação interrompida. Confira a SuperFrete pelo número do pedido antes de tentar novamente. Nenhum pagamento foi solicitado pelo site.",
    );
  }
}
