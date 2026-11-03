/**
 * CPF for a genuine person-to-person non-commercial shipment.
 * Never substitute a company's CNPJ for the actual sender's CPF.
 */
export function documentDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function validCpf(value: string): boolean {
  const cpf = documentDigits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let pos = 9; pos < 11; pos++) {
    const total = [...cpf.slice(0, pos)].reduce(
      (sum, digit, index) => sum + Number(digit) * (pos + 1 - index),
      0,
    );
    const check = (total * 10) % 11;
    if (Number(cpf[pos]) !== (check === 10 ? 0 : check)) return false;
  }
  return true;
}

export type SenderDocumentSelection = {
  document_type?: "cpf" | "cnpj";
  document?: string;
};

export function senderDocuments(
  sender: SenderDocumentSelection,
  companyCnpj: string,
): { document?: string; company_document?: string; state_register?: string } {
  if (sender.document_type === "cpf") {
    if (!validCpf(sender.document ?? ""))
      throw new Error("Informe um CPF válido do remetente em Frete e envios.");
    return { document: documentDigits(sender.document ?? "") };
  }
  // Legacy company configuration remains unchanged. This branch must not be
  // used to represent a personal shipment as a company-owned consignment.
  return { company_document: documentDigits(companyCnpj), state_register: "" };
}
