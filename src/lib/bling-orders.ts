import { z } from "zod";
import type { BlingInventoryConfig } from "./bling-inventory";

export const appmaxCustomerSchema = z.object({ data: z.object({
  order: z.object({ id: z.number().int().positive() }),
  customer: z.object({ name: z.string().trim().max(200).optional(), email: z.string().trim().max(200).optional(), document_number: z.string().trim().max(30).optional() }).nullable().optional(),
}) });
export const orderItemsSchema = z.array(z.object({ id: z.string(), name: z.string(), qty: z.number().int().positive(), unit_price_cents: z.number().int().positive() })).min(1);

/** Builds the Bling sales-order payload; the store order id is the duplicate guard (numeroLoja). */
export function buildBlingSaleOrder(input: { orderId: string; contactId: number; date: string; items: z.infer<typeof orderItemsSchema>; freightCents: number; config: BlingInventoryConfig; appmaxOrderId: string; serviceName: string; cep: string }) {
  return {
    numeroLoja: input.orderId,
    data: input.date,
    dataSaida: input.date,
    contato: { id: input.contactId },
    itens: input.items.map((item) => {
      const mapping = input.config.mappings.find((m) => m.productId === item.id);
      if (!mapping?.blingId) throw new Error(`Modelo sem vínculo Bling: ${item.name}.`);
      return { produto: { id: mapping.blingId }, codigo: mapping.sku, descricao: item.name, unidade: "UN", quantidade: item.qty, valor: item.unit_price_cents / 100 };
    }),
    transporte: { frete: input.freightCents / 100 },
    observacoes: `Venda do site SW Sports. Pagamento Appmax nº ${input.appmaxOrderId} aprovado. Frete ${input.serviceName} para CEP ${input.cep}. Endereço completo na Appmax.`,
    observacoesInternas: `Pedido site ${input.orderId}`,
  };
}
export function digitsOnly(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}
