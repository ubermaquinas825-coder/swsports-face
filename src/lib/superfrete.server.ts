// Fixed destinations only: a standalone deploy uses the provider's official API.
export function superfreteConfigured(): boolean {
  return Boolean(process.env["SUPERFRETE_API_TOKEN"] || (process.env["VERCEL"] !== "1" && process.env["LOVABLE_API_KEY"] && process.env["UDC_SUPERFRETE_API_KEY"]));
}
export async function superfreteRequest(path: string, email: string | undefined, body?: unknown): Promise<unknown> {
  const directToken = process.env["SUPERFRETE_API_TOKEN"];
  const key = process.env["LOVABLE_API_KEY"];
  const connection = process.env["UDC_SUPERFRETE_API_KEY"];
  if (!superfreteConfigured()) throw new Error("Integração SuperFrete indisponível.");
  const contact = email || process.env["SUPERFRETE_CONTACT_EMAIL"];
  if (directToken && (!contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))) throw new Error("Configure o e-mail de contato técnico da SuperFrete.");
  const base = directToken ? "https://api.superfrete.com" : "https://connector-gateway.lovable.dev/udc_superfrete";
  const response = await fetch(`${base}/api/v0/${path}`, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${directToken || key}`, ...(!directToken ? { "X-Connection-Api-Key": connection! } : {}),
      "Content-Type": "application/json", Accept: "application/json", ...(contact ? { "User-Agent": `SW Sports/1.0 (${contact})` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  // Neither provider bodies nor request payloads may be logged: both contain PII/secrets.
  if (!response.ok) throw new Error(`SuperFrete recusou a operação (HTTP ${response.status}).`);
  return response.json() as Promise<unknown>;
}
