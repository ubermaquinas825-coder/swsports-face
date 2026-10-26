import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { productFor, UNIT_PRICE } from "./products";
import { validatedTotal } from "./shipping";
import type { CheckoutLine, ShippingOption } from "./checkout";
import { validateDeliveryAddress, type DeliveryAddress } from "./delivery-address";

const MP_LINK_PREFIX = "mp:";

const mercadoPagoCreatedOrderSchema = z.object({
  id: z.string().min(1),
  checkout_url: z.string().url(),
  status: z.string().min(1),
  total_amount: z.union([z.string(), z.number()]).optional(),
});

const mercadoPagoPaymentSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  status_detail: z.string().min(1).nullable().optional(),
  paid_amount: z.union([z.string(), z.number()]).nullable().optional(),
});

const mercadoPagoOrderSchema = z.object({
  id: z.string().min(1),
  type: z.literal("online"),
  external_reference: z.string().min(1),
  status: z.string().min(1),
  status_detail: z.string().min(1).nullable().optional(),
  total_amount: z.union([z.string(), z.number()]),
  total_paid_amount: z.union([z.string(), z.number()]).nullable().optional(),
  transactions: z
    .object({ payments: z.array(mercadoPagoPaymentSchema).max(20).default([]) })
    .default({ payments: [] }),
});

type StoredOrder = {
  id: string;
  payment_link_id: string | null;
  subtotal_cents: number;
  discount_cents: number;
  freight_cents: number | null;
  payment_status: string;
  bling_sync_status: string;
  provider_payment_id: string | null;
};

export class MercadoPagoRequestError extends Error {
  status: number;
  constructor(status: number) {
    super(`Mercado Pago não conseguiu atender a solicitação (${status}). Tente novamente.`);
    this.name = "MercadoPagoRequestError";
    this.status = status;
  }
}

export class MercadoPagoManualReviewError extends Error {
  constructor(message = "Resposta do Mercado Pago exige conferência manual.") {
    super(message);
    this.name = "MercadoPagoManualReviewError";
  }
}

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function centsFromMoney(value: string | number) {
  const normalized = typeof value === "number" ? value.toFixed(2) : value;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized))
    throw new MercadoPagoManualReviewError("Valor monetário inválido retornado pelo Mercado Pago.");
  return Math.round(Number(normalized) * 100);
}

function publicSiteUrl() {
  if (process.env["VERCEL_ENV"] === "preview" && process.env["VERCEL_URL"]) {
    const preview = new URL(`https://${process.env["VERCEL_URL"]}`);
    if (preview.protocol === "https:" && !preview.username && !preview.password) return preview.origin;
  }
  const raw = process.env["VITE_PUBLIC_SITE_URL"] || "https://www.balaclavaswsports.com.br";
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("URL pública da loja inválida para o retorno do pagamento.");
  return url.origin;
}

function mercadoPagoAccessToken() {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento Mercado Pago indisponível no momento.");
  return token;
}

function webhookSecret() {
  const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook Mercado Pago ainda não configurado.");
  return secret;
}

async function mercadoPagoJson(response: Response) {
  if (!response.ok) {
    console.error(`Mercado Pago request failed [${response.status}]`);
    throw new MercadoPagoRequestError(response.status);
  }
  return response.json() as Promise<unknown>;
}

export function mercadoPagoOrderIdFromLink(value: string | null | undefined) {
  return value?.startsWith(MP_LINK_PREFIX) ? value.slice(MP_LINK_PREFIX.length) : null;
}

export async function readMercadoPagoOrder(orderId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${mercadoPagoAccessToken()}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const raw = await mercadoPagoJson(response);
  const parsed = mercadoPagoOrderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MercadoPagoManualReviewError("O Mercado Pago retornou uma order incompatível com a conferência automática.");
  }
  return parsed.data;
}

export async function verifyMercadoPagoStoredOrder(order: StoredOrder) {
  const providerOrderId = mercadoPagoOrderIdFromLink(order.payment_link_id);
  if (!providerOrderId) throw new Error("Pedido não possui vínculo Mercado Pago verificável.");
  const remote = await readMercadoPagoOrder(providerOrderId);
  if (remote.id !== providerOrderId || remote.external_reference !== order.id)
    throw new MercadoPagoManualReviewError("O Mercado Pago retornou uma order diferente do pedido da loja.");

  const expectedCents = order.subtotal_cents - order.discount_cents + (order.freight_cents ?? 0);
  if (centsFromMoney(remote.total_amount) !== expectedCents)
    throw new MercadoPagoManualReviewError("Valor total divergente no Mercado Pago. Revisão manual necessária.");

  const statusDetail = remote.status_detail ?? "";
  const approved = remote.status === "processed" && statusDetail === "accredited";
  const paid = remote.transactions.payments.filter(
    (payment) => payment.status === "processed" && (payment.status_detail ?? "") === "accredited",
  );

  if (approved) {
    if (remote.total_paid_amount === null || remote.total_paid_amount === undefined)
      throw new MercadoPagoManualReviewError("Pagamento aprovado sem total pago verificável. Revisão manual necessária.");
    if (paid.length !== 1 || paid[0]?.paid_amount === null || paid[0]?.paid_amount === undefined)
      throw new MercadoPagoManualReviewError("Pagamento aprovado sem composição verificável. Revisão manual necessária.");
    if (
      centsFromMoney(remote.total_paid_amount) !== expectedCents ||
      centsFromMoney(paid[0].paid_amount) !== expectedCents
    )
      throw new MercadoPagoManualReviewError("Pagamento Mercado Pago aprovado com composição de valor divergente. Revisão manual necessária.");
    return {
      state: "approved" as const,
      providerPaymentId: paid[0].id,
      status: remote.status,
      statusDetail,
    };
  }

  if (["failed", "canceled", "refunded"].includes(remote.status) || statusDetail === "partially_refunded") {
    return {
      state: "failed" as const,
      providerPaymentId: paid[0]?.id ?? null,
      status: remote.status,
      statusDetail,
    };
  }

  // Pending/incomplete orders may legitimately omit paid totals and status detail.
  // Never infer approval or failure from fields that are not present yet.
  return { state: "pending" as const, providerPaymentId: null, status: remote.status, statusDetail };
}

export function validateMercadoPagoWebhookSignature(request: Request, dataId: string) {
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = new Map(
    signature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const ts = parts.get("ts") ?? "";
  const v1 = parts.get("v1") ?? "";
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  const manifest = `${dataId ? `id:${dataId};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", webhookSecret()).update(manifest).digest("hex");
  const providedBuffer = Buffer.from(v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

async function applyInventoryForPaidOrder(supabaseAdmin: any, orderId: string) {
  const stock = await supabaseAdmin.rpc("apply_paid_order_inventory", { _order_id: orderId });
  if (stock.error) throw new Error("Pagamento aprovado, mas a baixa de estoque exige revisão manual.");
  return stock.data;
}

export async function processMercadoPagoWebhook(providerOrderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lookup = await supabaseAdmin
    .from("shipping_orders")
    .select("id,payment_link_id,subtotal_cents,discount_cents,freight_cents,payment_status,bling_sync_status,provider_payment_id")
    .eq("payment_link_id", `${MP_LINK_PREFIX}${providerOrderId}`)
    .maybeSingle();
  if (lookup.error) throw new Error("Não foi possível localizar o pedido Mercado Pago.");
  if (!lookup.data) return { found: false, state: "ignored" as const };

  const order = lookup.data;
  const verified = await verifyMercadoPagoStoredOrder(order);
  if (verified.state === "pending") return { found: true, state: "pending" as const };
  if (
    order.provider_payment_id &&
    verified.providerPaymentId &&
    order.provider_payment_id !== verified.providerPaymentId
  )
    throw new MercadoPagoManualReviewError("Identificador financeiro Mercado Pago divergente. Revisão manual necessária.");

  if (verified.state === "approved") {
    if (order.payment_status === "approved") {
      await applyInventoryForPaidOrder(supabaseAdmin, order.id);
      return { found: true, state: "approved" as const };
    }
    const saved = await supabaseAdmin
      .from("shipping_orders")
      .update({
        payment_status: "approved",
        provider_payment_id: verified.providerPaymentId,
        bling_sync_status: order.bling_sync_status === "awaiting_payment" ? "queued" : order.bling_sync_status,
        bling_sync_error: null,
      })
      .eq("id", order.id)
      .eq("payment_status", "pending")
      .eq("payment_link_id", `${MP_LINK_PREFIX}${providerOrderId}`)
      .select("id")
      .maybeSingle();
    if (saved.error) throw new Error("Pagamento confirmado, mas não foi possível registrar o estado financeiro.");
    await applyInventoryForPaidOrder(supabaseAdmin, order.id);
    return { found: true, state: "approved" as const };
  }

  if (order.payment_status === "approved") {
    const held = await supabaseAdmin
      .from("shipping_orders")
      .update({
        bling_sync_status: "reconciliation_required",
        bling_sync_error: "Mercado Pago reportou falha/cancelamento/reembolso após aprovação. Revisão manual obrigatória.",
      })
      .eq("id", order.id)
      .select("id")
      .maybeSingle();
    if (held.error) throw new Error("Não foi possível bloquear pedido com alteração financeira posterior.");
    return { found: true, state: "failed" as const };
  }

  const failed = await supabaseAdmin
    .from("shipping_orders")
    .update({
      payment_status: "failed",
      provider_payment_id: verified.providerPaymentId,
      bling_sync_status: "blocked",
      bling_sync_error: `Mercado Pago: ${verified.status}/${verified.statusDetail || "sem_detalhe"}. Não processar automaticamente.`,
    })
    .eq("id", order.id)
    .eq("payment_status", "pending")
    .select("id")
    .maybeSingle();
  if (failed.error) throw new Error("Não foi possível registrar a falha do pagamento Mercado Pago.");
  return { found: true, state: "failed" as const };
}

export async function mercadoPagoPaymentLink(
  lines: CheckoutLine[],
  cep: string,
  option: ShippingOption,
  address: DeliveryAddress,
) {
  assertFinancialOperationsEnabled();
  const deliveryAddress = validateDeliveryAddress(address, cep);
  const totalCents = validatedTotal(lines, 0, option.priceCents);
  const subtotalCents = validatedTotal(lines, 0, 0);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pending = await supabaseAdmin
    .from("shipping_orders")
    .insert({
      delivery_address: deliveryAddress,
      items: lines.map((line) => ({
        id: line.id,
        name: productFor(line.id)?.name ?? line.id,
        qty: line.qty,
        unit_price_cents: Math.round(UNIT_PRICE * 100),
      })),
      subtotal_cents: subtotalCents,
      freight_cents: option.priceCents,
      quoted_cep: cep,
      shipping_service: option,
      payment_status: "pending",
      bling_sync_status: "awaiting_payment",
    })
    .select("id")
    .single();
  if (pending.error || !pending.data) throw new Error("Não foi possível registrar o pedido. Tente novamente.");

  const origin = publicSiteUrl();
  const orderReference = encodeURIComponent(pending.data.id);
  const items = lines.map((line) => ({
    title: productFor(line.id)?.name ?? line.id,
    quantity: line.qty,
    unit_price: moneyFromCents(Math.round(UNIT_PRICE * 100)),
  }));
  if (option.priceCents > 0) {
    items.push({
      title: `Frete ${[option.company, option.name].filter(Boolean).join(" ") || "entrega"}`,
      quantity: 1,
      unit_price: moneyFromCents(option.priceCents),
    });
  }

  try {
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "manual",
        capture_mode: "automatic_async",
        total_amount: moneyFromCents(totalCents),
        external_reference: pending.data.id,
        payer: { email: deliveryAddress.email },
        items,
        config: {
          online: {
            success_url: `${origin}/pagamento?resultado=sucesso&external_reference=${orderReference}`,
            pending_url: `${origin}/pagamento?resultado=pendente&external_reference=${orderReference}`,
            failure_url: `${origin}/pagamento?resultado=falha&external_reference=${orderReference}`,
            auto_return: "all",
          },
        },
      }),
    });
    const result = mercadoPagoCreatedOrderSchema.parse(await mercadoPagoJson(response));
    const checkoutUrl = new URL(result.checkout_url);
    if (
      checkoutUrl.protocol !== "https:" ||
      checkoutUrl.username ||
      checkoutUrl.password ||
      !(checkoutUrl.hostname === "mercadopago.com.br" || checkoutUrl.hostname.endsWith(".mercadopago.com.br"))
    )
      throw new Error("O Mercado Pago retornou um endereço de pagamento inválido.");

    const saved = await supabaseAdmin
      .from("shipping_orders")
      .update({ payment_link_id: `${MP_LINK_PREFIX}${result.id}` })
      .eq("id", pending.data.id)
      .select("id")
      .single();
    if (saved.error || !saved.data) throw new Error("Não foi possível vincular o pagamento ao pedido. Tente novamente.");
    return { checkoutUrl: checkoutUrl.href, totalCents, providerOrderId: result.id };
  } catch (error) {
    const flagged = await supabaseAdmin
      .from("shipping_orders")
      .update({
        bling_sync_status: "reconciliation_required",
        bling_sync_error: "Falha na criação ou vinculação da order Mercado Pago; conferir no Mercado Pago antes de processar o pedido.",
      })
      .eq("id", pending.data.id);
    if (flagged.error) console.error("Mercado Pago checkout reconciliation flag failed");
    if (error instanceof Error && error.message.startsWith("Mercado Pago")) throw error;
    throw new Error("Não foi possível confirmar o checkout do Mercado Pago. Nenhum pagamento foi confirmado; entre em contato com a loja antes de tentar novamente.");
  }
}
