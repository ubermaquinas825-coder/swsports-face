// Always use the project's linked connector; never accept a caller-supplied URL.
export async function superfreteRequest(path: string, email: string, body?: unknown): Promise<unknown> {
  const key = process.env["LOVABLE_API_KEY"];
  const connection = process.env["UDC_SUPERFRETE_API_KEY"];
  if (!key || !connection) throw new Error("Conector SuperFrete indisponível.");
  const response = await fetch(`https://connector-gateway.lovable.dev/udc_superfrete/api/v0/${path}`, {
    method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection,
      "Content-Type": "application/json", Accept: "application/json", "User-Agent": `SW Sports/1.0 (${email})` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  // Neither provider bodies nor request payloads may be logged: both contain PII/secrets.
  if (!response.ok) throw new Error(`SuperFrete recusou a operação (HTTP ${response.status}).`);
  return response.json() as Promise<unknown>;
}
