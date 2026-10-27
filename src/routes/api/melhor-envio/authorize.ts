import { createFileRoute } from "@tanstack/react-router";

// OAuth initiation is an administrative action and is intentionally unavailable
// as a public URL. The authenticated admin panel starts the flow through the
// protected beginMelhorEnvioAuthorization server function instead.
async function authorize() {
  return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/melhor-envio/authorize")({
  server: { handlers: { GET: authorize } },
});
