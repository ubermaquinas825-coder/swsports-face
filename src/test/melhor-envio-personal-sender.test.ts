import { describe, expect, it } from "vitest";
import { labelSenderSchema } from "@/lib/shipping";
import { documentDigits, senderDocuments, validCpf } from "@/lib/melhor-envio-sender-document";

const sender = {
  name: "Remetente de Teste",
  address: "Rua Exemplo", number: "10", complement: "", district: "Centro",
  city: "Uberlandia", state_abbr: "MG", postal_code: "38408562",
  email: "exemplo@example.com",
};
const syntheticCpf = "529.982.247-25"; // Publicly documented sample CPF, never a customer's ID.

describe("Melhor Envio sender identification", () => {
  it("accepts a valid formatted personal CPF and preserves leading zeros", () => {
    expect(validCpf(syntheticCpf)).toBe(true);
    expect(documentDigits("012.345.678-90")).toBe("01234567890");
  });
  it("rejects invalid, missing and repeating-digit CPFs", () => {
    for (const value of ["", "00000000000", "11111111111", "52998224720", "12345"]) {
      expect(validCpf(value)).toBe(false);
    }
  });
  it("sends only the personal CPF, not the shop's CNPJ or state register", () => {
    expect(senderDocuments({ document_type: "cpf", document: syntheticCpf }, "68.390.022/0001-49"))
      .toEqual({ document: "52998224725" });
  });
  it("rejects CPF mode without a valid CPF before any provider call", () => {
    expect(() => senderDocuments({ document_type: "cpf", document: "123" }, "68.390.022/0001-49"))
      .toThrow("CPF válido");
  });
  it("preserves company sender behavior for legacy saved configuration", () => {
    expect(senderDocuments({}, "68.390.022/0001-49"))
      .toEqual({ company_document: "68390022000149", state_register: "" });
    expect(senderDocuments({ document_type: "cnpj" }, "68.390.022/0001-49"))
      .toEqual({ company_document: "68390022000149", state_register: "" });
  });
  it("requires personal phone and CPF in CPF mode, but not for legacy company senders", () => {
    expect(labelSenderSchema.safeParse(sender).success).toBe(true);
    expect(labelSenderSchema.safeParse({ ...sender, document_type: "cpf", document: syntheticCpf, phone: "(34) 99999-9999" }).success).toBe(true);
    expect(labelSenderSchema.safeParse({ ...sender, document_type: "cpf", document: syntheticCpf, phone: "" }).success).toBe(false);
    expect(labelSenderSchema.safeParse({ ...sender, document_type: "cpf", document: "11111111111", phone: "(34) 99999-9999" }).success).toBe(false);
  });
});
