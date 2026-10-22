import { z } from "zod";
import { cepSchema } from "@/lib/shipping";
import { productFor } from "@/lib/products";

export const cartLinesSchema = z.array(z.object({ id: z.string().refine((id) => Boolean(productFor(id)), "Produto inválido."), qty: z.number().int().min(1).max(100) })).min(1).max(6).refine((lines) => new Set(lines.map((line) => line.id)).size === lines.length, "Itens duplicados.");
export const shippingRequestSchema = z.object({ cep: cepSchema, lines: cartLinesSchema });
export type CheckoutLine = z.infer<typeof cartLinesSchema>[number];
export type ShippingOption = { id: string; name: string; company: string; priceCents: number; deliveryDays: number | null };
export type ShippingSelection = { cep: string; cartKey: string; option: ShippingOption };
export function checkoutCartKey(lines: CheckoutLine[]) { return lines.map((line) => `${line.id}:${line.qty}`).sort().join(","); }
export function currentShipping(selection: ShippingSelection | null, lines: CheckoutLine[]) {
  return selection?.cartKey === checkoutCartKey(lines) ? selection : null;
}