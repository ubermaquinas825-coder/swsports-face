import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { shippingRequestSchema } from "@/lib/checkout";
import { quoteFreight } from "@/lib/checkout.server";
import { mercadoPagoPaymentLink } from "@/lib/mercadopago.server";
import { checkBlingCheckoutStock } from "@/lib/bling-inventory.server";
import { deliveryAddressSchema, validateDeliveryAddress } from "./delivery-address";

// Public guest checkout intentionally accepts only validated catalog items; no account data is exposed.
export const createMercadoPagoCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => shippingRequestSchema.extend({ serviceId: z.string().min(1).max(30), quotedPriceCents: z.number().int().nonnegative(), deliveryAddress: deliveryAddressSchema }).parse(data))
  .handler(async ({ data }) => {
    const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
    assertFinancialOperationsEnabled();
    const deliveryAddress = validateDeliveryAddress(data.deliveryAddress, data.cep);
    await checkBlingCheckoutStock(data.lines);
    const options = await quoteFreight(data.cep, data.lines);
    const selected = options.find((option) => option.id === data.serviceId);
    if (!selected) throw new Error("Esta opção de entrega não está mais disponível. Calcule o frete novamente.");
    if (selected.priceCents !== data.quotedPriceCents) throw new Error("O valor do frete mudou. Calcule novamente antes de continuar.");
    return mercadoPagoPaymentLink(data.lines, data.cep, selected, deliveryAddress);
  });
