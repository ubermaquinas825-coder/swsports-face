import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { blingAuthorizationUrl } from "@/lib/bling";
import { blingConfigured, randomBlingValue, hashBlingValue } from "@/lib/bling.server";

export const Route = createFileRoute("/api/public/bling/start")({ server: { handlers: { GET: async ({ request }) => {
  const { blingConnectionMaintenanceResponse } = await import("@/lib/financial-maintenance.server");
  const maintenance = blingConnectionMaintenanceResponse();
  if (maintenance) return maintenance;
  const state = z.string().regex(/^[a-f0-9]{64}$/).safeParse(new URL(request.url).searchParams.get("state"));
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  if (!state.success) return new Response("Autorização inválida.", { status: 400, headers });
  if (!blingConfigured()) return new Response("Aguardando cadastro do aplicativo Bling.", { status: 503, headers });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nonce = randomBlingValue();
  const saved = await supabaseAdmin.from("bling_oauth_states").update({ browser_hash: await hashBlingValue(nonce) }).eq("state_hash", await hashBlingValue(state.data)).eq("browser_hash", "pending").gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
  if (saved.error || !saved.data) return new Response("Autorização expirada. Inicie novamente no painel.", { status: 400, headers });
  const role = await supabaseAdmin.rpc("has_role", { _user_id: saved.data.user_id, _role: "admin" });
  const clientId = process.env['BLING_CLIENT_ID'];
  if (role.error || !role.data || !clientId) return new Response("Acesso administrativo necessário.", { status: 403, headers });
  return new Response(null, { status: 302, headers: { ...headers, Location: blingAuthorizationUrl(clientId, state.data), "Set-Cookie": `__Host-bling-oauth=${nonce}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600` } });
} } } });
