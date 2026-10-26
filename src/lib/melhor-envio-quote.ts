export function normalizeMelhorEnvioQuoteResponse(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body !== null && typeof body === "object") return [body];
  throw new Error("O Melhor Envio retornou uma cotação inválida.");
}
