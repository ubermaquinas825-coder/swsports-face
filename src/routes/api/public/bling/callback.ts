import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BLING_ORIGIN } from "@/lib/bling";
import { hashBlingValue, completeBlingAuthorization } from "@/lib/bling.server";

export const Route = createFileRoute("/api/public/bling/callback")({ server: { handlers: { GET: async ({ request }) => {
  const { blingConnectionMaintenanceResponse } = await import("@/lib/financial-maintenance.server");
  const maintenance = blingConnectionMaintenanceResponse();
  if (maintenance) return maintenance;
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Set-Cookie": "__Host-bling-oauth=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0" };
  const reject = (status = 400) => new Response("Autorização Bling inválida ou expirada. Inicie novamente em Integrações > Bling.", { status, headers });
  const params = new URL(request.url).searchParams;
  const state = z.string().regex(/^[a-f0-9]{64}$/).safeParse(params.get("state"));
  const nonce = z.string().regex(/^[a-f0-9]{64}$/).safeParse(request.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith("__Host-bling-oauth="))?.slice("__Host-bling-oauth=".length));
  if (!state.success || !nonce.success || params.getAll("state").length !== 1) return reject();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const consumed = await supabaseAdmin.rpc("consume_bling_oauth_state", { p_state_hash: await hashBlingValue(state.data), p_browser_hash: await hashBlingValue(nonce.data) });
  const userId = consumed.data?.[0]?.user_id;
  if (consumed.error || !userId) return reject();
  const role = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (role.error || !role.data) return reject(403);
  if (params.has("error")) return new Response("Autorização Bling não concedida. Volte ao painel para tentar novamente.", { status: 400, headers });
  const code = z.string().min(1).max(2048).safeParse(params.get("code"));
  if (!code.success || params.getAll("code").length !== 1) return reject();
  try {
    await completeBlingAuthorization(code.data, userId);
    return new Response(null, { status: 303, headers: { ...headers, Location: `${BLING_ORIGIN}/integracoes/bling` } });
  } catch {
    return new Response("Não foi possível concluir a autorização Bling. Inicie novamente no painel.", { status: 502, headers });
  }
} } } });
