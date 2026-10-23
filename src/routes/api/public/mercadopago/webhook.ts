import { createFileRoute } from "@tanstack/react-router";
import { processMercadoPagoWebhook, validateMercadoPagoWebhookSignature } from "@/lib/mercadopago.server";

async function handleWebhook({ request }: { request: Request }) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("data_id") ?? "";
  if (!dataId) return Response.json({ ok: false, error: "missing_data_id" }, { status: 400 });

  try {
    if (!validateMercadoPagoWebhookSignature(request, dataId)) {
      return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }
    const result = await processMercadoPagoWebhook(dataId);
    return Response.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Mercado Pago webhook processing failed");
    return Response.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: { handlers: { POST: handleWebhook } },
});
