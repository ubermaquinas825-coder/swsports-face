import { z } from "zod";
import { manualShippingHold } from "./manual-shipping-eligibility";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { labelSenderSchema, shippingConfigSchema } from "./shipping";
import {
  assertMelhorEnvioCartAccess,
  melhorEnvioPanelUrl,
  melhorEnvioRequest,
} from "./melhor-envio.server";
import { mercadoPagoOrderIdFromLink, verifyMercadoPagoStoredOrder } from "./mercadopago.server";
import { reconcileAppmaxOrder } from "./payment-reconciliation.server";
import { business } from "./business";
import { validateDeliveryAddress } from "./delivery-address";
import { orderItemsSchema } from "./order-items";
import { SITE_ORIGIN } from "./site";

const volumeSchema = z.object({
  height: z.coerce.number().positive(),
  width: z.coerce.number().positive(),
  length: z.coerce.number().positive(),
  weight: z.coerce.number().positive(),
});
const savedServiceSchema = z.object({
  id: z.string().regex(/^\d+$/),
  originCep: z.string().regex(/^\d{8}$/),
  package: volumeSchema,
});
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

function buildMelhorEnvioPayload(input: {
  orderId: string;
  address: unknown;
  cep: string;
  service: unknown;
  items: unknown;
  subtotalCents: number;
  sender: z.infer<typeof labelSenderSchema>;
}) {
  const to = validateDeliveryAddress(input.address, input.cep);
  const service = savedServiceSchema.parse(input.service);
  const sender = labelSenderSchema.parse(input.sender);
  if (service.originCep !== sender.postal_code)
    throw new Error("O CEP de origem deste pedido é diferente do remetente atual. Confira os dados antes de enviar ao Melhor Envio.");
  const items = orderItemsSchema.parse(input.items);
  if (items.reduce((sum, row) => sum + row.qty * row.unit_price_cents, 0) !== input.subtotalCents)
    throw new Error("Itens divergentes do valor do pedido.");

  return {
    service: Number(service.id),
    from: {
      name: sender.name,
      email: sender.email,
      phone: digits(business.phone),
      company_document: digits(business.cnpj),
      state_register: "",
      address: sender.address,
      complement: sender.complement,
      number: sender.number,
      district: sender.district,
      city: sender.city,
      postal_code: sender.postal_code,
      country_id: "BR",
      state_abbr: sender.state_abbr,
    },
    to: {
      name: to.name,
      email: to.email,
      phone: to.phone,
      ...recipientDocument(to.document),
      address: to.street,
      complement: to.complement,
      number: to.number,
      district: to.district,
      city: to.city,
      postal_code: to.postalCode,
      country_id: "BR",
      state_abbr: to.state,
    },
    products: items.map((row) => ({
      name: row.name,
      quantity: String(row.qty),
      unitary_value: (row.unit_price_cents / 100).toFixed(2),
    })),
    volumes: [service.package],
    options: {
      platform: "SW Sports",
      reminder: `Pedido SW Sports ${input.orderId.slice(0, 8)}`,
      insurance_value: input.subtotalCents / 100,
      receipt: false,
      own_hand: false,
      reverse: false,
      tags: [{ tag: input.orderId, url: SITE_ORIGIN }],
    },
  };
}

export async function prepareMelhorEnvioCart(orderId: string) {
  assertFinancialOperationsEnabled();
  await assertMelhorEnvioCartAccess();
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
    throw new Error("Envio em revisão. Reinicie a tentativa antes de enviar novamente ao Melhor Envio.");
  if (order.provider_shipment_id)
    throw new Error("Este pedido já possui um envio vinculado. Confira-o no Melhor Envio ou reinicie a tentativa.");
  if (!order.quoted_cep || order.freight_cents === null || !order.shipping_service)
    throw new Error("Dados de entrega incompletos. Confira CEP e serviço de frete do pedido.");

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

  const cartPayload = buildMelhorEnvioPayload({
    orderId,
    address: order.delivery_address,
    cep: order.quoted_cep,
    service: order.shipping_service,
    items: order.items,
    subtotalCents: order.subtotal_cents,
    sender,
  });

  // Manual handoff: use the service/package already chosen and saved with the
  // customer's order. Do not reprice or buy the shipment here. The administrator
  // reviews and pays the label inside the Melhor Envio cart.
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
  let phase = "envio dos dados ao Melhor Envio";
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

    // The historical RPC records provider=superfrete. Correct only the new event
    // for this order; legacy events are preserved unchanged.
    await supabaseAdmin
      .from("shipping_events")
      .update({
        provider: "melhor_envio",
        state: "Pedido enviado ao carrinho do Melhor Envio para revisão, pagamento e emissão manual da etiqueta. Nenhum débito efetuado pelo site.",
      })
      .eq("order_id", orderId)
      .eq("provider", "superfrete")
      .eq("kind", "manual_cart");

    return {
      shipmentId: created.id,
      dashboardUrl: melhorEnvioPanelUrl("/carrinho"),
      message:
        "Pedido enviado ao carrinho do Melhor Envio. Revise os dados, pague o frete e faça a emissão da etiqueta diretamente no Melhor Envio.",
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
      `Preparação interrompida na etapa de ${phase}. Confira os dados do pedido e tente novamente. Nenhum pagamento foi solicitado pelo site.`,
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
