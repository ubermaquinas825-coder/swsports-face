import { z } from "zod";
import { BLING_TOKEN_URL, BLING_PRODUCTS_URL, needsBlingRefresh, projectBlingProducts } from "./bling";

const tokensSchema = z.object({ access_token: z.string().min(1).max(20000), refresh_token: z.string().min(1).max(20000), expires_in: z.number().positive().max(31536000), token_type: z.string().refine((v) => v.toLowerCase() === "bearer") });
type Tokens = z.infer<typeof tokensSchema>;
export function blingConfigured() {
  return Boolean(process.env['BLING_CLIENT_ID'] && process.env['BLING_CLIENT_SECRET'] && process.env['BLING_TOKEN_ENCRYPTION_KEY']);
}
export function randomBlingValue() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2, "0")).join("");
}
export async function hashBlingValue(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (v) => v.toString(16).padStart(2, "0")).join("");
}
async function encryptionKey() {
  const secret = process.env['BLING_TOKEN_ENCRYPTION_KEY'];
  if (!secret) throw new Error("Proteção Bling indisponível.");
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptTokens(tokens: Tokens) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(JSON.stringify(tokens))));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...encrypted))}`;
}
async function decryptTokens(value: string) {
  const [iv, data] = value.split(".");
  if (!iv || !data) throw new Error("Conexão Bling inválida.");
  const bytes = (s: string) => Uint8Array.from(atob(s), (v) => v.charCodeAt(0));
  return tokensSchema.parse(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(iv) }, await encryptionKey(), bytes(data)))));
}
async function exchangeTokens(body: URLSearchParams) {
  const id = process.env['BLING_CLIENT_ID']; const secret = process.env['BLING_CLIENT_SECRET'];
  if (!id || !secret) throw new Error("Cadastre as credenciais do aplicativo Bling pelo formulário seguro.");
  const response = await fetch(BLING_TOKEN_URL, { method: "POST", headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "1.0", "enable-jwt": "1" }, body, signal: AbortSignal.timeout(15000) });
  // Token endpoints may echo credentials: never log or return their bodies.
  if (!response.ok) throw new Error(`Bling recusou a autorização (HTTP ${response.status}). Autorize novamente.`);
  const parsed = tokensSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Bling retornou uma autorização inválida.");
  return parsed.data;
}
export async function completeBlingAuthorization(code: string, userId: string) {
  const tokens = await exchangeTokens(new URLSearchParams({ grant_type: "authorization_code", code }));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("bling_connections").upsert({ id: true, encrypted_tokens: await encryptTokens(tokens), authorized_by: userId, authorized_at: new Date().toISOString(), expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), refreshed_at: null, refresh_lock_until: null, revision: crypto.randomUUID(), last_error: null });
  if (result.error) throw new Error("Não foi possível salvar a conexão Bling. Autorize novamente.");
}
export async function getBlingAccessToken() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("bling_connections").select("*").eq("id", true).maybeSingle();
  if (result.error || !result.data) throw new Error("Bling não conectado.");
  const connection = result.data;
  const tokens = await decryptTokens(connection.encrypted_tokens);
  if (!needsBlingRefresh(connection.expires_at)) return tokens.access_token;
  const now = new Date().toISOString();
  const lock = await supabaseAdmin.from("bling_connections").update({ refresh_lock_until: new Date(Date.now() + 60000).toISOString() }).eq("id", true).eq("revision", connection.revision).or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now}`).select("id").maybeSingle();
  if (lock.error || !lock.data) throw new Error("Renovação Bling em andamento. Tente novamente.");
  try {
    const refreshed = await exchangeTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }));
    const saved = await supabaseAdmin.from("bling_connections").update({ encrypted_tokens: await encryptTokens(refreshed), expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(), refreshed_at: now, revision: crypto.randomUUID(), refresh_lock_until: null, last_error: null }).eq("id", true).eq("revision", connection.revision).select("id").maybeSingle();
    if (saved.error || !saved.data) throw new Error("Não foi possível salvar a renovação Bling.");
    return refreshed.access_token;
  } catch {
    // Require reauthorization after an ambiguous refresh; never retry a rotated token.
    await supabaseAdmin.from("bling_connections").update({ last_error: "Não foi possível renovar o acesso. Conecte o Bling novamente.", refresh_lock_until: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", true).eq("revision", connection.revision);
    throw new Error("Não foi possível renovar o acesso. Conecte o Bling novamente.");
  }
}
export async function readBlingProducts() {
  const token = await getBlingAccessToken();
  const response = await fetch(BLING_PRODUCTS_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error("Bling recusou a leitura de produtos. Verifique a permissão de produtos no aplicativo e autorize novamente.");
    if (response.status === 401) throw new Error("Bling recusou o acesso. Conecte o Bling novamente.");
    if (response.status === 429) throw new Error("Limite de consultas Bling atingido. Aguarde antes de tentar novamente.");
    throw new Error(`Não foi possível consultar produtos no Bling (HTTP ${response.status}).`);
  }
  try { return projectBlingProducts(await response.json()); }
  catch { throw new Error("Bling retornou uma lista de produtos inválida."); }
}