import { createFileRoute } from "@tanstack/react-router";
import { melhorEnvioAuthorizationUrl } from "@/lib/melhor-envio.server";

async function authorize() {
  const state = process.env["MELHOR_ENVIO_OAUTH_STATE"];
  if (!state) return new Response("Estado OAuth do Melhor Envio não configurado.", { status: 503 });

  try {
    return Response.redirect(melhorEnvioAuthorizationUrl(state), 302);
  } catch (error) {
    console.error("Melhor Envio OAuth authorization failed", error instanceof Error ? error.message : "unknown_error");
    return new Response("Não foi possível iniciar a autorização do Melhor Envio.", { status: 500 });
  }
}

export const Route = createFileRoute("/api/melhor-envio/authorize")({
  server: { handlers: { GET: authorize } },
});
