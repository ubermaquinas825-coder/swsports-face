import { z } from "zod";

const digits = (v: string) => v.replace(/\D/g, "");
const clean = (max: number) => z.string().trim().min(1, "Campo obrigatório.").max(max);

/** Address typed on the store's own checkout; the label is issued only to this address. */
export const deliveryAddressSchema = z.object({
  name: z.string().trim().max(50).refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome."),
  document: z.string().transform(digits).refine((v) => v.length === 11 || v.length === 14, "Informe um CPF ou CNPJ válido."),
  email: z.string().trim().email("Informe um e-mail válido.").max(120),
  phone: z.string().transform(digits).refine((v) => v.length === 0 || v.length === 10 || v.length === 11, "Telefone inválido."),
  street: clean(50),
  number: z.string().trim().max(10),
  complement: z.string().trim().max(20),
  district: clean(50),
  city: clean(50),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "UF inválida."),
});
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

export const senderAddress = {
  name: "Loja SW Sports", address: "Rua Álvares de Azevedo", number: "994", complement: "",
  district: "Carajás", city: "Uberlândia", state_abbr: "MG",
} as const;

type Pkg = { weightKg: number; heightCm: number; widthCm: number; lengthCm: number };
/** SuperFrete /api/v0/cart payload. `tag` = store order id (duplicate lookup key). */
export function buildSuperFreteCart(input: { orderId: string; originCep: string; cep: string; serviceId: string; address: DeliveryAddress; items: { name: string; qty: number; unit_price_cents: number }[]; pkg: Pkg; subtotalCents: number }) {
  const a = input.address;
  return {
    from: { ...senderAddress, postal_code: input.originCep },
    to: { name: a.name, address: a.street, number: a.number, complement: a.complement, district: a.district || "NA", city: a.city, state_abbr: a.state, postal_code: input.cep, email: a.email, document: a.document, ...(a.phone.length === 11 ? { phone: a.phone } : {}) },
    service: Number(input.serviceId),
    products: input.items.map((i) => ({ name: i.name, quantity: i.qty, unitary_value: i.unit_price_cents / 100 })),
    volumes: { height: input.pkg.heightCm, width: input.pkg.widthCm, length: input.pkg.lengthCm, weight: input.pkg.weightKg },
    options: { insurance_value: input.subtotalCents / 100, receipt: false, own_hand: false, non_commercial: true },
    tag: input.orderId, platform: "SW Sports", url: "https://swsports-face.lovable.app",
  };
}

/** Labels are paid from SuperFrete balance only when the price stays close to what the customer paid. */
export function labelPriceAcceptable(quotedCents: number, cartCents: number) {
  return cartCents <= quotedCents + Math.max(100, Math.round(quotedCents * 0.1));
}
