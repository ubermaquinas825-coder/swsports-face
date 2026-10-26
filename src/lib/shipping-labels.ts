import { z } from "zod";
import { validateDeliveryAddress } from "./delivery-address";
import { orderItemsSchema } from "./order-items";
import { labelSenderSchema } from "./shipping";
import { SITE_ORIGIN } from "./site";

export const volumeSchema = z.object({ height: z.coerce.number().positive(), width: z.coerce.number().positive(), length: z.coerce.number().positive(), weight: z.coerce.number().positive() });
export const savedServiceSchema = z.object({ id: z.string().regex(/^\d+$/), originCep: z.string().regex(/^\d{8}$/), package: volumeSchema });

export function buildLabelPayload(input: { orderId: string; address: unknown; cep: string; service: unknown; items: unknown; subtotalCents: number; sender: z.infer<typeof labelSenderSchema> }) {
  const to = validateDeliveryAddress(input.address, input.cep);
  const service = savedServiceSchema.parse(input.service);
  const sender = labelSenderSchema.parse(input.sender);
  if (service.originCep !== sender.postal_code) throw new Error("O remetente mudou desde a cotação; confira o pedido.");
  if (service.id === "33" && to.phone.length !== 11) throw new Error("A J&T exige telefone do destinatário com 11 dígitos.");
  const items = orderItemsSchema.parse(input.items);
  if (items.reduce((sum, row) => sum + row.qty * row.unit_price_cents, 0) !== input.subtotalCents) throw new Error("Itens divergentes do valor do pedido.");
  const { email: _email, ...from } = sender;
  return {
    from, to: { name: to.name, address: to.street, number: to.number, complement: to.complement,
      district: to.district, city: to.city, state_abbr: to.state, postal_code: to.postalCode,
      document: to.document, phone: to.phone, email: to.email },
    service: Number(service.id), volumes: service.package,
    products: items.map((row) => ({ name: row.name, quantity: String(row.qty), unitary_value: (row.unit_price_cents / 100).toFixed(2) })),
    options: { non_commercial: true, insurance_value: input.subtotalCents / 100, own_hand: false, receipt: false,
      tags: [{ tag: input.orderId, url: SITE_ORIGIN }] },
    platform: "SW Sports",
  };
}
export type LabelPayload = ReturnType<typeof buildLabelPayload>;

export function officialLabelUrl(value: unknown): string {
  const url = new URL(z.string().parse(value));
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    !["api.superfrete.com", "web.superfrete.com", "superfrete.com"].includes(url.hostname) ||
    !url.pathname.startsWith("/_etiqueta/pdf/")) throw new Error("A SuperFrete retornou um PDF fora do endereço oficial esperado.");
  return url.href;
}

const partySchema = z.object({ name: z.string(), address: z.string(), location_number: z.string().nullable(), complement: z.string().nullable(), district: z.string(), city: z.string(), state_abbr: z.string(), postal_code: z.string(), document: z.string().nullable().optional() });
export const labelInfoSchema = z.object({ id: z.string(), status: z.string(), price: z.coerce.number().finite().nonnegative(),
  service_id: z.coerce.number().int(), tracking: z.string().nullable().optional(), from: partySchema, to: partySchema,
  invoice: z.unknown().optional(), products: z.array(z.object({ name: z.string(), quantity: z.coerce.number(), unitary_value: z.coerce.number() })),
  insurance_value: z.coerce.number().nullable(), own_hand: z.boolean(), receipt: z.boolean(),
  height: z.coerce.number(), width: z.coerce.number(), length: z.coerce.number(), weight: z.coerce.number(),
});

export function verifyLabelInfo(value: unknown, id: string, payload: LabelPayload, freightCents: number) {
  const info = labelInfoSchema.parse(value);
  if (info.id !== id || info.service_id !== payload.service || Math.round(info.price * 100) !== freightCents || info.invoice ||
    info.insurance_value === null || Math.round(info.insurance_value * 100) !== Math.round(payload.options.insurance_value * 100) || info.own_hand || info.receipt) throw new Error("Etiqueta divergente do pedido.");
  for (const key of ["from", "to"] as const) {
    const actual = info[key], expected = payload[key];
    for (const field of ["name", "address", "district", "city", "state_abbr", "postal_code"] as const) {
      if (actual[field] !== expected[field]) throw new Error("Endereço da etiqueta divergente do pedido.");
    }
    if ((actual.complement ?? "") !== expected.complement || (actual.location_number ?? "") !== expected.number) throw new Error("Complemento ou número divergente.");
  }
  if (info.to.document?.replace(/\D/g, "") !== payload.to.document) throw new Error("Documento do destinatário divergente.");
  for (const key of ["height", "width", "length", "weight"] as const) {
    if (Math.abs(info[key] - payload.volumes[key]) > 0.00001) throw new Error("Volume da etiqueta divergente.");
  }
  if (info.products.length !== payload.products.length || info.products.some((row, index) => {
    const expected = payload.products[index];
    return !expected || row.name !== expected.name || row.quantity !== Number(expected.quantity) || Math.round(row.unitary_value * 100) !== Math.round(Number(expected.unitary_value) * 100);
  })) throw new Error("Declaração de conteúdo divergente.");
  return info;
}
