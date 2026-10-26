import { assertFinancialOperationsEnabled } from "./financial-maintenance.server";
import { z } from "zod";
import { choosePackage, defaultShippingConfig, shippingConfigSchema, validatedTotal } from "@/lib/shipping";
import { productFor, UNIT_PRICE } from "@/lib/products";
import type { CheckoutLine, ShippingOption } from "@/lib/checkout";
import { validateDeliveryAddress, type DeliveryAddress } from "./delivery-address";
import { melhorEnvioRequest } from "./melhor-envio.server";

async function providerJson(response: Response, service: string) {
  if (!response.ok) {
    // Authentication errors can echo credentials; never log provider bodies.
    console.error(`${service} request failed [${response.status}]`);
    throw new Error(`${service} não conseguiu atender a solicitação (${response.status}). Tente novamente.`);
  }
  return response.json() as Promise<unknown>;
}

const melhorEnvioServiceSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  price: z.coerce.number().finite().nonnegative().nullable().optional(),
  custom_price: z.coerce.number().finite().nonnegative().nullable().optional(),
  delivery_time: z.coerce.number().int().nonnegative().nullable().optional(),
  custom_delivery_time: z.coerce.number().int().nonnegative().nullable().optional(),
  company: z.object({ name: z.string() }).optional(),
  error: z.unknown().optional(),
});

export async function quoteFreight(cep: string, lines: CheckoutLine[]): Promise<ShippingOption[]> {
  // Privileged read of store-owned operational settings only; never return the settings or orders publicly.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const settings = await supabaseAdmin.from("shipping_settings").select("config").eq("id", true).maybeSingle();
  if (settings.error) throw new Error("Não foi possível carregar as configurações de envio.");
  const config = settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig;
  const packaging = choosePackage(lines.reduce((sum, line) => sum + line.qty, 0), config);
  if (!packaging) throw new Error("A embalagem para esta quantidade ainda não foi cadastrada pela loja.");

  const requestBody: Record<string, unknown> = {
    from: { postal_code: config.originCep },
    to: { postal_code: cep },
    volumes: [
      {
        height: packaging.heightCm,
        width: packaging.widthCm,
        length: packaging.lengthCm,
        weight: packaging.weightKg,
      },
    ],
    options: {
      insurance_value: validatedTotal(lines, 0, 0) / 100,
      receipt: false,
      own_hand: false,
    },
  };
  if (config.carriers.length) requestBody.services = config.carriers.join(",");

  const body = await melhorEnvioRequest("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  if (!Array.isArray(body)) throw new Error("O Melhor Envio retornou uma cotação inválida.");

  return body
    .flatMap((row) => {
      const parsed = melhorEnvioServiceSchema.safeParse(row);
      if (!parsed.success || parsed.data.error) return [];
      const service = parsed.data;
      const price = service.custom_price ?? service.price;
      if (price === null || price === undefined) return [];
      const deliveryDays = service.custom_delivery_time ?? service.delivery_time ?? null;
      return [
        {
          originCep: config.originCep,
          package: {
            height: packaging.heightCm,
            width: packaging.widthCm,
            length: packaging.lengthCm,
            weight: packaging.weightKg,
          },
          id: String(service.id),
          name: service.name,
          company: service.company?.name ?? "Melhor Envio",
          priceCents: Math.round(price * 100),
          deliveryDays,
        },
      ];
    })
    .sort((a, b) => a.priceCents - b.priceCents);
}

export async function authenticateAppmax() {
  const clientId = process.env["APPMAX_CLIENT_ID"];
  const clientSecret = process.env["APPMAX_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Pagamento Appmax indisponível no momento.");
  const authResponse = await fetch("https://auth.appmax.com.br/oauth2/token", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }) });
  const auth = z.object({ access_token: z.string().min(1) }).parse(await providerJson(authResponse, "Appmax"));
  return auth.access_token;
}
export async function appmaxPaymentLink(lines: CheckoutLine[], cep: string, option: ShippingOption, address: DeliveryAddress) {
  assertFinancialOperationsEnabled();
  const deliveryAddress = validateDeliveryAddress(address, cep);
  const accessToken = await authenticateAppmax();
  const totalCents = validatedTotal(lines, 0, option.priceCents);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pending = await supabaseAdmin.from("shipping_orders").insert({ delivery_address: deliveryAddress, items: lines.map((line) => ({ id: line.id, name: productFor(line.id)?.name ?? line.id, qty: line.qty, unit_price_cents: Math.round(UNIT_PRICE * 100) })), subtotal_cents: validatedTotal(lines, 0, 0), freight_cents: option.priceCents, quoted_cep: cep, shipping_service: option, payment_status: "pending", bling_sync_status: "awaiting_payment" }).select("id").single();
  if (pending.error || !pending.data) throw new Error("Não foi possível registrar o pedido. Tente novamente.");
  const items = lines.map((line) => `${line.qty}x ${productFor(line.id)?.name}`).join("; ");
  try {
  const response = await fetch("https://api.appmax.com.br/v1/payment-link", {
    method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name: "SW Sports — Balaclavas", value: totalCents, description: `Pedido SW-${pending.data.id}. ${items}. Frete ${option.company} ${option.name}: R$ ${(option.priceCents / 100).toFixed(2)}. CEP ${cep}.`, product_type: "physical", payments: ["creditcard", "boleto", "pix"], max_installments: 1, fee_transfer_from_installment: 0, allow_multiple_sales: false }),
  });
  const result = z.object({ data: z.object({ id: z.union([z.number(), z.string()]), checkout_url: z.string().url() }) }).parse(await providerJson(response, "Appmax"));
  const url = new URL(result.data.checkout_url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("A Appmax retornou um endereço de pagamento inválido.");
  const saved = await supabaseAdmin.from("shipping_orders").update({ payment_link_id: String(result.data.id) }).eq("id", pending.data.id).select("id").single();
  if (saved.error || !saved.data) throw new Error("Não foi possível vincular o pagamento ao pedido. Tente novamente.");
  return { checkoutUrl: url.href, totalCents };
  } catch {
    // A timeout may occur after Appmax creates the link. Keep the record for
    // reconciliation instead of deleting it or treating it as paid/exportable.
    const flagged = await supabaseAdmin.from("shipping_orders").update({ bling_sync_status: "reconciliation_required", bling_sync_error: "Falha na criação ou vinculação do link Appmax; conferir na Appmax antes de processar o pedido." }).eq("id", pending.data.id);
    if (flagged.error) console.error("Appmax checkout reconciliation flag failed");
    throw new Error("Não foi possível confirmar o link Appmax. Nenhum pagamento foi confirmado; entre em contato com a loja antes de tentar novamente.");
  }
}
