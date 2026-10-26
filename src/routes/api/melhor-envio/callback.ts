import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeMelhorEnvioCode,
  melhorEnvioConnectionStatus,
} from "@/lib/melhor-envio.server";

async function callback({ request }: { request: Request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = process.env["MELHOR_ENVIO_OAUTH_STATE"];

  if (!code) return new Response("Código de autorização ausente.", { status: 400 });
  if (!state || !expectedState || state !== expectedState)
    return new Response("Estado OAuth inválido.", { status: 401 });

  try {
    await exchangeMelhorEnvioCode(code);
    const status = await melhorEnvioConnectionStatus();
    if (!status.connected)
      throw new Error("Autorização recebida, mas a conexão não foi persistida.");
    return Response.redirect(new URL("/frete-envios?melhor_envio=connected", url.origin), 302);
  } catch (error) {
    // Never log OAuth codes, tokens or provider response bodies.
    console.error(
      "Melhor Envio OAuth callback failed",
      error instanceof Error ? error.message : "unknown_error",
    );
    return Response.redirect(new URL("/frete-envios?melhor_envio=error", url.origin), 302);
  }
}

export const Route = createFileRoute("/api/melhor-envio/callback")({
  server: { handlers: { GET: callback } },
});
