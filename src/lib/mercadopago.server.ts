import { z } from "zod";
import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { productFor, UNIT_PRICE } from "./products";
import { validatedTotal } from "./shipping";
import type { CheckoutLine, ShippingOption } from "./checkout";
import { validateDeliveryAddress, type DeliveryAddress } from "./delivery-address";

const mercadoPagoOrderSchema = z.object({
  id: z.string().min(1),
  checkout_url: z.string().url(),
  status: z.string().min(1),
  total_amount: z.union([z.string(), z.number()]).optional(),
});

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function publicSiteUrl() {
  const raw = process.env["VITE_PUBLIC_SITE_URL"] || "https://www.balaclavaswsports.com.br";
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("URL pública da loja inválida para o retorno do pagamento.");
  }
  return url.origin;
}

function mercadoPagoAccessToken() {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento Mercado Pago indisponível no momento.");
  return token;
}

async function mercadoPagoJson(response: Response) {
  if (!response.ok) {
    // Provider bodies can contain transaction/customer details; never log them.
    console.error(`Mercado Pago request failed [${response.status}]`);
    throw new Error(`Mercado Pago não conseguiu atender a solicitação (${response.status}). Tente novamente.`);
  }
  return response.json() as Promise<unknown>;
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

  if (pending.error || !pending.data) {
    throw new Error("Não foi possível registrar o pedido. Tente novamente.");
  }

  const origin = publicSiteUrl();
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
      signal: AbortSignal.timeout(20_000),
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
            success_url: `${origin}/pagamento?resultado=sucesso`,
            pending_url: `${origin}/pagamento?resultado=pendente`,
            failure_url: `${origin}/pagamento?resultado=falha`,
            auto_return: "all",
          },
        },
      }),
    });

    const result = mercadoPagoOrderSchema.parse(await mercadoPagoJson(response));
    const checkoutUrl = new URL(result.checkout_url);
    if (
      checkoutUrl.protocol !== "https:" ||
      checkoutUrl.username ||
      checkoutUrl.password ||
      !(checkoutUrl.hostname === "mercadopago.com.br" || checkoutUrl.hostname.endsWith(".mercadopago.com.br"))
    ) {
      throw new Error("O Mercado Pago retornou um endereço de pagamento inválido.");
    }

    const saved = await supabaseAdmin
      .from("shipping_orders")
      .update({ payment_link_id: result.id })
      .eq("id", pending.data.id)
      .select("id")
      .single();
    if (saved.error || !saved.data) {
      throw new Error("Não foi possível vincular o pagamento ao pedido. Tente novamente.");
    }

    return { checkoutUrl: checkoutUrl.href, totalCents, providerOrderId: result.id };
  } catch (error) {
    const flagged = await supabaseAdmin
      .from("shipping_orders")
      .update({
        bling_sync_status: "reconciliation_required",
        bling_sync_error:
          "Falha na criação ou vinculação da order Mercado Pago; conferir no Mercado Pago antes de processar o pedido.",
      })
      .eq("id", pending.data.id);
    if (flagged.error) console.error("Mercado Pago checkout reconciliation flag failed");
    if (error instanceof Error && error.message.startsWith("Mercado Pago")) throw error;
    throw new Error(
      "Não foi possível confirmar o checkout do Mercado Pago. Nenhum pagamento foi confirmado; entre em contato com a loja antes de tentar novamente.",
    );
  }
}
