import { z } from "zod";

const tokenSchema = z.object({
  token_type: z.string().default("Bearer"),
  expires_in: z.coerce.number().int().positive(),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  scope: z.string().optional(),
});

const SCOPES = [
  "shipping-calculate",
  "shipping-companies",
  "shipping-generate",
  "shipping-checkout",
  "shipping-preview",
  "shipping-print",
  "shipping-tracking",
  "shipping-cancel",
  "orders-read",
].join(" ");

function config() {
  const clientId = process.env["MELHOR_ENVIO_CLIENT_ID"];
  const clientSecret = process.env["MELHOR_ENVIO_CLIENT_SECRET"];
  const redirectUri = process.env["MELHOR_ENVIO_REDIRECT_URI"];
  const environment = process.env["MELHOR_ENVIO_ENVIRONMENT"] === "production" ? "production" : "sandbox";
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Melhor Envio ainda não está configurado no servidor.");
  return { clientId, clientSecret, redirectUri, environment };
}

function baseUrl() {
  return config().environment === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";
}

export function melhorEnvioAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = config();
  const url = new URL("/oauth/authorize", baseUrl());
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES);
  return url.toString();
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch(new URL("/oauth/token", baseUrl()), {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SW Sports (adm.swsports@gmail.com)" },
    body: params,
  });
  if (!response.ok) throw new Error(`Melhor Envio recusou a autenticação (${response.status}).`);
  return tokenSchema.parse(await response.json());
}

async function saveToken(token: z.infer<typeof tokenSchema>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const saved = await supabaseAdmin.from("melhor_envio_connections" as never).upsert({
    id: true,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: token.token_type,
    scopes: token.scope ?? SCOPES,
    environment: config().environment,
    expires_at: new Date(now + token.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  } as never);
  if (saved.error) throw new Error("Não foi possível armazenar a autorização do Melhor Envio.");
}

export async function exchangeMelhorEnvioCode(code: string) {
  const { clientId, clientSecret, redirectUri } = config();
  const token = await tokenRequest(new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }));
  await saveToken(token);
}

export async function refreshMelhorEnvioToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const token = await tokenRequest(new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }));
  await saveToken(token);
  return token.access_token;
}

export async function melhorEnvioConnectionStatus() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("melhor_envio_connections" as never).select("expires_at,refresh_expires_at,environment,updated_at").eq("id", true).maybeSingle();
  if (result.error) throw new Error("Não foi possível verificar a conexão com o Melhor Envio.");
  const row = result.data as { expires_at: string; refresh_expires_at: string; environment: string; updated_at: string } | null;
  return row ? { connected: true as const, ...row } : { connected: false as const, environment: config().environment };
}
