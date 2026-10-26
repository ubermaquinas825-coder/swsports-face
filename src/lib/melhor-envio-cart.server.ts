import { z } from "zod";
import { manualShippingHold } from "./manual-shipping-eligibility";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { shippingConfigSchema } from "./shipping";
import { buildLabelPayload } from "./shipping-labels";
import { melhorEnvioRequest } from "./melhor-envio.server";
import { mercadoPagoOrderIdFromLink, verifyMercadoPagoStoredOrder } from "./mercadopago.server";
import { reconcileAppmaxOrder } from "./payment-reconciliation.server";
import { business } from "./business";

const dashboardUrl = "https://melhorenvio.com.br/";

const quoteSchema = z.array(
  z.object({
    id: z.union([z.string(), z.number()]),
    price: z.coerce.number().finite().nonnegative().nullable().optional(),
    custom_price: z.coerce.number().finite().nonnegative().nullable().optional(),
    error: z.unknown().optional(),
  }),
);
const createdSchema = z.object({ id: z.string().min(1).max(200) }).passthrough();

async function loadOrder(id: string) {
  const result = await supabaseAdmin.from("shipping_orders").select("*").eq("id", id).single();
  if (result.error || !result.data) throw new Error("Não foi possível carregar o pedido.");
  return result.data;
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function recipientDocument(document: string) {
  const value = digits(document);
  if (value.length === 11) return { document: value };
  if (value.length === 14) return { company_document: value };
  throw new Error("Documento do destinatário inválido para o Melhor Envio.");
}

export async function prepareMelhorEnvioCart(orderId: string) {
  assertFinancialOperationsEnabled();
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
  const hold = manualShippingHold(order);
  if (hold) throw new Error(hold);
  if (order.shipping_status === "logistics_failed")
    throw new Error("Envio em revisão. Confira o Melhor Envio antes de qualquer nova tentativa.");
  if (order.provider_shipment_id)
    throw new Error("Este pedido já possui um envio vinculado. Confira-o no Melhor Envio.");
  if (!order.quoted_cep || order.freight_cents === null || order.discount_cents !== 0)
    throw new Error("Frete ou declaração de conteúdo precisa de conferência antes de preparar o envio.");

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

  const base = buildLabelPayload({
    orderId,
    address: order.delivery_address,
    cep: order.quoted_cep,
    service: order.shipping_service,
    items: order.items,
    subtotalCents: order.subtotal_cents,
    sender,
  });
  const { document: toDocument, ...to } = base.to;
  const cartPayload = {
    service: base.service,
    from: {
      ...base.from,
      email: sender.email,
      phone: digits(business.phone),
      company_document: digits(business.cnpj),
      state_register: "",
      country_id: "BR",
    },
    to: {
      ...to,
      ...recipientDocument(toDocument),
      country_id: "BR",
    },
    products: base.products,
    volumes: [base.volumes],
    options: {
      platform: "SW Sports",
      insurance_value: base.options.insurance_value,
      receipt: false,
      own_hand: false,
      tags: base.options.tags,
    },
  };

  const quotes = quoteSchema.parse(
    await melhorEnvioRequest("/api/v2/me/shipment/calculate", {
      method: "POST",
      body: JSON.stringify({
        from: { postal_code: sender.postal_code },
        to: { postal_code: order.quoted_cep },
        services: String(base.service),
        volumes: [base.volumes],
        options: {
          insurance_value: order.subtotal_cents / 100,
          receipt: false,
          own_hand: false,
        },
      }),
    }),
  );
  const quote = quotes.find((q) => String(q.id) === String(base.service) && !q.error);
  const quotedPrice = quote?.custom_price ?? quote?.price;
  if (quotedPrice === null || quotedPrice === undefined || Math.round(quotedPrice * 100) !== order.freight_cents)
    throw new Error("O valor do frete mudou ou o serviço está indisponível. Faça uma nova cotação antes de criar o envio.");

  const claim = await supabaseAdmin.rpc("claim_manual_shipping_cart", {
    _order_id: orderId,
    _revision: order.financial_revision,
    _payload: cartPayload,
  });
  if (claim.error)
    throw new Error("Preparação manual indisponível no banco. Confira as migrações de logística antes de continuar.");
  if (!claim.data)
    throw new Error("O pedido mudou ou já existe uma tentativa de envio. Atualize o painel.");

  let createdId: string | null = null;
  let phase = "criação no Melhor Envio";
  try {
    const created = createdSchema.parse(
      await melhorEnvioRequest("/api/v2/me/cart", {
        method: "POST",
        body: JSON.stringify(cartPayload),
      }),
    );
    createdId = created.id;

    phase = "vinculação do envio ao pedido";
    const saved = await supabaseAdmin.rpc("complete_manual_shipping_cart", {
      _order_id: orderId,
      _token: claim.data,
      _shipment_id: created.id,
    });
    if (saved.error || !saved.data) throw new Error("Não foi possível vincular o envio.");

    // The historical RPC names SuperFrete in its event. Correct only this newly-created
    // event so history identifies the provider without rewriting legacy records.
    await supabaseAdmin
      .from("shipping_events")
      .update({
        provider: "melhor_envio",
        state: "Envio preparado para revisão e pagamento manual no Melhor Envio. Nenhum débito efetuado pelo site.",
      })
      .eq("order_id", orderId)
      .eq("provider", "superfrete")
      .eq("kind", "manual_cart");

    phase = "conferência do item no carrinho";
    const info = createdSchema.parse(
      await melhorEnvioRequest(`/api/v2/me/cart/${encodeURIComponent(created.id)}`),
    );
    if (info.id !== created.id) throw new Error("Identificador do envio divergente.");

    return {
      shipmentId: created.id,
      dashboardUrl,
      message:
        "Envio preparado no Melhor Envio. Abra sua conta, confira os dados e pague a etiqueta manualmente. O site não debitou sua carteira.",
    };
  } catch {
    if (createdId) {
      await supabaseAdmin
        .from("shipping_orders")
        .update({ provider_shipment_id: createdId, shipping_status: "logistics_failed" })
        .eq("id", orderId)
        .is("provider_shipment_id", null);
    } else {
      await supabaseAdmin
        .from("shipping_orders")
        .update({ shipping_status: "logistics_failed" })
        .eq("id", orderId);
    }
    throw new Error(
      `Preparação interrompida na etapa de ${phase}. Confira o Melhor Envio antes de tentar novamente. Nenhum pagamento foi solicitado pelo site.`,
    );
  }
}

export async function inspectMelhorEnvioShipping(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order.provider_shipment_id)
    throw new Error("Este pedido ainda não possui envio vinculado.");
  const raw = await melhorEnvioRequest(
    `/api/v2/me/cart/${encodeURIComponent(order.provider_shipment_id)}`,
  );
  const info = z
    .object({
      id: z.string(),
      status: z.string().optional(),
      price: z.coerce.number().finite().nonnegative().nullable().optional(),
      tracking: z.string().nullable().optional(),
    })
    .passthrough()
    .parse(raw);
  if (info.id !== order.provider_shipment_id)
    throw new Error("O Melhor Envio retornou outro identificador de envio.");
  return {
    status: info.status ?? "no_carrinho",
    priceCents: info.price === null || info.price === undefined ? null : Math.round(info.price * 100),
    tracking: info.tracking ?? null,
    problems: [] as string[],
  };
}
