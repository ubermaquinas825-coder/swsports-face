import { z } from "zod";
import { productFor, UNIT_PRICE } from "@/lib/products";

export const cepSchema = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => /^\d{8}$/.test(v) && !/^(\d)\1{7}$/.test(v), "Informe um CEP válido com 8 dígitos.");
export const packageSchema = z.object({ name: z.string().min(1), weightKg: z.number().positive(), lengthCm: z.number().positive(), widthCm: z.number().positive(), heightCm: z.number().positive(), capacity: z.number().int().positive(), packagingWeightKg: z.number().nonnegative().nullable() });
export const shippingConfigSchema = z.object({ originCep: cepSchema, senderAddress: z.string().min(5), packages: z.array(packageSchema).min(1), carriers: z.array(z.string()), productWeightKg: z.number().positive().nullable() });
export type ShippingConfig = z.infer<typeof shippingConfigSchema>;
export const defaultShippingConfig: ShippingConfig = {
  originCep: "38408562", senderAddress: "Rua Álvares de Azevedo, 994 — Carajás, Uberlândia — MG, CEP 38408-562",
  productWeightKg: null,
  packages: [{ name: "Uma balaclava", weightKg: 0.15, lengthCm: 20, widthCm: 15, heightCm: 10, capacity: 1, packagingWeightKg: null }], carriers: [],
};
export const shippingStates: Record<string, string> = { awaiting_payment: "Aguardando pagamento", paid: "Pago", awaiting_label: "Aguardando emissão", awaiting_label_payment: "Aguardando pagamento da etiqueta", label_issued: "Etiqueta emitida", ready_to_post: "Pronto para postagem", posted: "Postado", delivered: "Entregue", logistics_failed: "Falha logística" };
export function choosePackage(quantity: number, config: ShippingConfig) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantidade inválida.");
  if (quantity === 1) return config.packages.find((p) => p.capacity === 1) ?? null;
  if (config.productWeightKg === null) return null;
  const packaging = [...config.packages].sort((a, b) => a.capacity - b.capacity).find((p) => p.capacity >= quantity && p.packagingWeightKg !== null);
  if (!packaging || packaging.packagingWeightKg === null) return null;
  return { ...packaging, weightKg: Math.round((config.productWeightKg * quantity + packaging.packagingWeightKg) * 1000) / 1000 };
}
export function validatedTotal(lines: { id: string; qty: number }[], discountCents: number, freightCents: number) {
  if (lines.length === 0 || !Number.isInteger(discountCents) || discountCents < 0 || !Number.isInteger(freightCents) || freightCents < 0) throw new Error("Valores inválidos.");
  const subtotal = lines.reduce((sum, line) => {
    if (!productFor(line.id) || !Number.isInteger(line.qty) || line.qty < 1) throw new Error("Item inválido.");
    return sum + Math.round(UNIT_PRICE * 100) * line.qty;
  }, 0);
  if (discountCents > subtotal) throw new Error("Desconto inválido.");
  return subtotal - discountCents + freightCents;
}
// No provider side effects until an authorized adapter is installed.
export function labelEligibility(payment: string, shipmentId: string | null, authorized: boolean) {
  if (shipmentId) return "already_requested";
  if (payment !== "approved") return "awaiting_payment";
  if (!authorized) return "integration_unavailable";
  return "ready";
}
export const quoteUnavailable = () => ({ status: "unavailable" as const, options: [], message: "Cotação automática aguardando integração autorizada. Confirme o frete pelo WhatsApp." });