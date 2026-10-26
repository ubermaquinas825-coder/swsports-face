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

const USER_AGENT = "SW Sports (adm.swsports@gmail.com)";
const REFRESH_SAFETY_MS = 5 * 60 * 1000;

type ConnectionRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
  environment: "sandbox" | "production";
  updated_at: string;
};

function config() {
  const clientId = process.env["MELHOR_ENVIO_CLIENT_ID"];
  const clientSecret = process.env["MELHOR_ENVIO_CLIENT_SECRET"];
  const redirectUri = process.env["MELHOR_ENVIO_REDIRECT_URI"];
  const environment = process.env["MELHOR_ENVIO_ENVIRONMENT"] === "production" ? "production" : "sandbox";
  if (!clientId || !clientSecret || !redirectUri)
    throw new Error("Melhor Envio ainda não está configurado no servidor.");
  return { clientId, clientSecret, redirectUri, environment };
}

function baseUrl() {
  return config().environment === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
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
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: params,
  });
  if (!response.ok)
    throw new Error(`Melhor Envio recusou a autenticação (${response.status}).`);
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
  if (saved.error)
    throw new Error("Não foi possível armazenar a autorização do Melhor Envio.");
}

async function loadConnection(): Promise<ConnectionRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin
    .from("melhor_envio_connections" as never)
    .select("access_token,refresh_token,expires_at,refresh_expires_at,environment,updated_at")
    .eq("id", true)
    .maybeSingle();
  if (result.error)
    throw new Error("Não foi possível verificar a conexão com o Melhor Envio.");
  return (result.data as ConnectionRow | null) ?? null;
}

export async function exchangeMelhorEnvioCode(code: string) {
  const { clientId, clientSecret, redirectUri } = config();
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  );
  await saveToken(token);
}

export async function refreshMelhorEnvioToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  );
  await saveToken(token);
  return token.access_token;
}

async function accessToken(forceRefresh = false) {
  const row = await loadConnection();
  if (!row)
    throw new Error("Melhor Envio ainda não foi autorizado. Conecte a conta em Frete e envios.");
  if (row.environment !== config().environment)
    throw new Error("A autorização do Melhor Envio pertence a outro ambiente. Autorize novamente.");

  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt))
    throw new Error("A autorização do Melhor Envio está inválida. Autorize novamente.");
  if (forceRefresh || expiresAt <= Date.now() + REFRESH_SAFETY_MS) {
    const refreshExpiresAt = Date.parse(row.refresh_expires_at);
    if (!Number.isFinite(refreshExpiresAt) || refreshExpiresAt <= Date.now())
      throw new Error("A autorização do Melhor Envio expirou. Autorize novamente.");
    return refreshMelhorEnvioToken(row.refresh_token);
  }
  return row.access_token;
}

export async function melhorEnvioRequest(path: string, init: RequestInit = {}) {
  const request = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("User-Agent", USER_AGENT);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(new URL(path, baseUrl()), {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(20000),
    });
  };

  let response = await request(await accessToken());
  if (response.status === 401) response = await request(await accessToken(true));
  if (!response.ok) {
    console.error(`Melhor Envio request failed [${response.status}] ${path}`);
    throw new Error(`Melhor Envio não conseguiu atender a solicitação (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

export async function melhorEnvioConnectionStatus() {
  const environment = config().environment;
  const row = await loadConnection();
  if (!row)
    return { connected: false as const, environment, reason: "not_authorized" as const };
  if (row.environment !== environment)
    return {
      connected: false as const,
      environment,
      reason: "environment_mismatch" as const,
      updated_at: row.updated_at,
    };
  return {
    connected: true as const,
    environment,
    expires_at: row.expires_at,
    refresh_expires_at: row.refresh_expires_at,
    updated_at: row.updated_at,
  };
}
