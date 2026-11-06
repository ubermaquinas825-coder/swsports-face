import { z } from "zod";
import { productFor, unitPriceCents } from "@/lib/products";
import { validCpf } from "@/lib/melhor-envio-sender-document";

export const cepSchema = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => /^\d{8}$/.test(v) && !/^(\d)\1{7}$/.test(v), "Informe um CEP válido com 8 dígitos.");
export const packageSchema = z.object({ name: z.string().min(1), weightKg: z.number().positive(), lengthCm: z.number().positive(), widthCm: z.number().positive(), heightCm: z.number().positive(), capacity: z.number().int().positive(), packagingWeightKg: z.number().nonnegative().nullable() });
// Each entry is an exact measured cart combination, including its packaging.
// Never scale a shirt's weight/dimensions from the balaclava-only rules.
export const apparelPackageSchema = z.object({
  name: z.string().trim().min(1),
  shirtQuantity: z.number().int().positive(),
  balaclavaQuantity: z.number().int().nonnegative(),
  weightKg: z.number().finite().positive(),
  lengthCm: z.number().finite().positive(),
  widthCm: z.number().finite().positive(),
  heightCm: z.number().finite().positive(),
});
export type ApparelPackage = z.infer<typeof apparelPackageSchema>;
// Explicitly approved packages for shirts, with an individual garment weight and
// a known empty-package weight. The balaclava configuration remains independent.
export const apparelShippingSchema = z.object({
  productWeightKg: z.number().finite().positive(),
  packages: z.array(packageSchema).min(1),
});
export type ApparelShipping = z.infer<typeof apparelShippingSchema>;
export const labelSenderSchema = z.object({
  name: z.string().trim().min(3).max(50).refine((v) => v.split(/\s+/).length > 1, "Informe nome e sobrenome ou nome da loja."),
  address: z.string().trim().min(1).max(50), number: z.string().trim().max(10),
  complement: z.string().trim().max(20), district: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(50), state_abbr: z.string().regex(/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/),
  postal_code: cepSchema, email: z.string().trim().email().max(200),
  // Optional for compatibility with existing saved sender settings.
  document_type: z.enum(["cpf", "cnpj"]).optional(),
  document: z.string().trim().max(14).optional(),
  phone: z.string().trim().max(20).optional(),
}).superRefine((sender, ctx) => {
  if (sender.document_type === "cpf") {
    if (!validCpf(sender.document ?? "")) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "Informe um CPF válido para o remetente pessoa física." });
    }
    if (!/^\d{10,11}$/.test((sender.phone ?? "").replace(/\D/g, ""))) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Informe um telefone válido do remetente com DDD." });
    }
  }
});
export const labelAutomationSchema = z.object({ enabled: z.boolean(), sender: labelSenderSchema.nullable() }).superRefine((value, ctx) => {
  if (value.enabled && !value.sender) ctx.addIssue({ code: "custom", message: "Preencha os dados do remetente antes de ativar etiquetas automáticas." });
});
export const shippingConfigSchema = z.object({ originCep: cepSchema, senderAddress: z.string().min(5), packages: z.array(packageSchema).min(1), apparelPackages: z.array(apparelPackageSchema).optional(), apparelShipping: apparelShippingSchema.optional(), carriers: z.array(z.string()), productWeightKg: z.number().positive().nullable(), labelAutomation: labelAutomationSchema.default({ enabled: false, sender: null }) }).superRefine((value, ctx) => {
  if (value.labelAutomation.enabled && value.labelAutomation.sender?.postal_code !== value.originCep) ctx.addIssue({ code: "custom", message: "O CEP do remetente deve ser igual ao CEP de origem do frete." });
  const combinations = new Set<string>();
  value.apparelPackages?.forEach((packaging, index) => {
    const key = `${packaging.shirtQuantity}:${packaging.balaclavaQuantity}`;
    if (combinations.has(key)) ctx.addIssue({ code: "custom", path: ["apparelPackages", index], message: "Cadastre apenas uma embalagem por combinação de camisetas e balaclavas." });
    combinations.add(key);
  });
});
export type ShippingConfig = z.infer<typeof shippingConfigSchema>;
export const defaultShippingConfig: ShippingConfig = {
  labelAutomation: { enabled: false, sender: null },
  originCep: "38408562", senderAddress: "Rua Álvares de Azevedo, 994 — Carajás, Uberlândia — MG, CEP 38408-562",
  productWeightKg: 0.1,
  packages: [
    { name: "Uma balaclava", weightKg: 0.15, lengthCm: 20, widthCm: 15, heightCm: 10, capacity: 1, packagingWeightKg: null },
    { name: "Envelope 2 a 3 unidades", weightKg: 0.315, lengthCm: 36, widthCm: 26, heightCm: 4, capacity: 3, packagingWeightKg: 0.015 },
    { name: "Envelope grande 4 a 10 unidades", weightKg: 1.025, lengthCm: 40, widthCm: 32, heightCm: 8, capacity: 10, packagingWeightKg: 0.025 },
  ], carriers: [],
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
export function chooseCartPackage(lines: { id: string; qty: number }[], config: ShippingConfig) {
  if (!lines.length) throw new Error("Carrinho vazio.");
  let shirtQuantity = 0;
  let balaclavaQuantity = 0;
  const seen = new Set<string>();
  for (const line of lines) {
    const product = productFor(line.id);
    if (!product || !Number.isSafeInteger(line.qty) || line.qty < 1 || seen.has(line.id)) {
      throw new Error("Item inválido.");
    }
    seen.add(line.id);
    if (product.category === "camiseta") shirtQuantity += line.qty;
    else balaclavaQuantity += line.qty;
  }
  if (shirtQuantity === 0) return choosePackage(balaclavaQuantity, config);
  const measured = config.apparelPackages?.find((packaging) =>
    packaging.shirtQuantity === shirtQuantity && packaging.balaclavaQuantity === balaclavaQuantity,
  );
  if (measured) return measured;
  const apparel = config.apparelShipping;
  if (!apparel || (balaclavaQuantity > 0 && config.productWeightKg === null)) return null;
  const quantity = shirtQuantity + balaclavaQuantity;
  const packaging = [...apparel.packages].sort((a, b) => a.capacity - b.capacity)
    .find((candidate) => candidate.capacity >= quantity && candidate.packagingWeightKg !== null);
  if (!packaging || packaging.packagingWeightKg === null) return null;
  const weightKg = Math.round((shirtQuantity * apparel.productWeightKg
    + balaclavaQuantity * (config.productWeightKg ?? 0) + packaging.packagingWeightKg) * 1000) / 1000;
  return { ...packaging, weightKg };
}
export function validatedTotal(lines: { id: string; qty: number }[], discountCents: number, freightCents: number) {
  if (lines.length === 0 || !Number.isInteger(discountCents) || discountCents < 0 || !Number.isInteger(freightCents) || freightCents < 0) throw new Error("Valores inválidos.");
  const subtotal = lines.reduce((sum, line) => {
    const product = productFor(line.id);
    if (!product || !Number.isInteger(line.qty) || line.qty < 1) throw new Error("Item inválido.");
    return sum + unitPriceCents(product) * line.qty;
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
export const quoteUnavailable = () => ({ status: "unavailable" as const, options: [], message: "Não foi possível consultar o frete. Tente novamente." });
