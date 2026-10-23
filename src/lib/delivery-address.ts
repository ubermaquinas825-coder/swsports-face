import { z } from "zod";
import { cepSchema } from "./shipping";

const required = (name: string, max = 120) => z.string().trim().min(1, `Informe ${name}.`).max(max);
const digits = (value: string) => value.replace(/\D/g, "");

export function validTaxDocument(value: string): boolean {
  const doc = digits(value);
  if (!/^(\d{11}|\d{14})$/.test(doc) || /^(\d)\1+$/.test(doc)) return false;
  const size = doc.length - 2;
  const check = (length: number) => {
    const weights = size === 9
      ? Array.from({ length }, (_, index) => length + 1 - index)
      : Array.from({ length }, (_, index) => ((length - index - 1) % 8) + 2);
    const remainder = weights.reduce((sum, weight, index) => sum + Number(doc[index]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return check(size) === Number(doc[size]) && check(size + 1) === Number(doc[size + 1]);
}

export const deliveryAddressSchema = z.object({
  name: required("o nome completo", 50).refine((value) => value.split(/\s+/).length > 1, "Informe o nome completo."),
  document: z.string().transform(digits).refine(validTaxDocument, "Informe um CPF ou CNPJ válido."),
  email: z.string().trim().email("Informe um e-mail válido.").max(200),
  phone: z.string().transform(digits).refine((value) => /^[1-9]\d{9,10}$/.test(value), "Informe o telefone com DDD."),
  postalCode: cepSchema,
  street: required("a rua", 50),
  number: required("o número ou S/N", 10),
  complement: z.string().trim().max(20).default(""),
  district: required("o bairro", 50),
  city: required("a cidade", 50),
  state: z.enum(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"], { message: "Selecione o estado." }),
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

export function validateDeliveryAddress(value: unknown, quotedCep: string): DeliveryAddress {
  const address = deliveryAddressSchema.parse(value);
  if (address.postalCode !== cepSchema.parse(quotedCep)) {
    throw new Error("O CEP de entrega deve ser o mesmo usado no cálculo do frete. Calcule novamente.");
  }
  return address;
}
