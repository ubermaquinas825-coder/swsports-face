import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BLING_ORIGIN, BLING_CALLBACK_URL, BLING_STATE_TTL_MS } from "./bling";
import { blingConfigured, randomBlingValue, hashBlingValue, getBlingAccessToken, readBlingProducts } from "./bling.server";

export const getBlingAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) return { allowed: false, configured: false, connected: false, callbackUrl: BLING_CALLBACK_URL, authorizedAt: null, error: null };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("bling_connections").select("authorized_at,last_error").eq("id", true).maybeSingle();
  if (result.error) throw new Error("Não foi possível consultar a conexão Bling.");
  return { allowed: true, configured: blingConfigured(), connected: Boolean(result.data) && !result.data?.last_error, callbackUrl: BLING_CALLBACK_URL, authorizedAt: result.data?.authorized_at ?? null, error: result.data?.last_error ?? null };
});
export const startBlingOAuth = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  if (!blingConfigured()) throw new Error("Aguardando credenciais do aplicativo Bling.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const state = randomBlingValue();
  const saved = await supabaseAdmin.from("bling_oauth_states").insert({ state_hash: await hashBlingValue(state), browser_hash: "pending", user_id: context.userId, expires_at: new Date(Date.now() + BLING_STATE_TTL_MS).toISOString() });
  if (saved.error) throw new Error("Não foi possível iniciar a autorização Bling.");
  return { url: `${BLING_ORIGIN}/api/public/bling/start?state=${state}` };
});
export const renewBlingOAuth = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  await getBlingAccessToken();
  return { checked: true };
});
export const testBlingProducts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const products = await readBlingProducts();
  return { products, checkedAt: new Date().toISOString() };
});