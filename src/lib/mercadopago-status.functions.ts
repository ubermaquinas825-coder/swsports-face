import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  mercadoPagoOrderIdFromLink,
  processMercadoPagoWebhook,
} from "@/lib/mercadopago.server";
import { runPostPaymentAutomation } from "@/lib/post-payment.server";
import { isPreviewEnvironment } from "@/lib/financial-maintenance.server";

const paymentStatusRequestSchema = z.object({
  orderId: z.string().uuid(),
});

type PublicPaymentState = "approved" | "failed" | "pending" | "unknown";

async function triggerPostPaymentAutomation() {
  try {
    await runPostPaymentAutomation();
  } catch (error) {
    console.error(
      "Mercado Pago return post-payment automation failed",
      error instanceof Error ? error.message : "unknown_error",
    );
  }
}

// Public checkout return endpoint. It only exposes a minimal payment state for an
// unguessable order UUID and never returns customer, address, amount or provider data.
export const getMercadoPagoOrderStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => paymentStatusRequestSchema.parse(data))
  .handler(async ({ data }): Promise<{ state: PublicPaymentState }> => {
    // Preview never reconciles payments or triggers post-payment automation.
    if (isPreviewEnvironment()) return { state: "unknown" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lookup = await supabaseAdmin
      .from("shipping_orders")
      .select("id,payment_link_id,payment_status")
      .eq("id", data.orderId)
      .maybeSingle();

    if (lookup.error) throw new Error("Não foi possível consultar a confirmação do pagamento.");
    if (!lookup.data) return { state: "unknown" };

    const providerOrderId = mercadoPagoOrderIdFromLink(lookup.data.payment_link_id);
    if (!providerOrderId) return { state: "unknown" };

    if (lookup.data.payment_status === "approved") {
      await triggerPostPaymentAutomation();
      return { state: "approved" };
    }
    if (lookup.data.payment_status === "failed") return { state: "failed" };

    try {
      const reconciled = await processMercadoPagoWebhook(providerOrderId);
      if (!reconciled.found || reconciled.state === "ignored") return { state: "unknown" };
      if (reconciled.state === "approved") await triggerPostPaymentAutomation();
      return { state: reconciled.state };
    } catch (error) {
      console.error(
        "Mercado Pago return reconciliation failed",
        error instanceof Error ? error.message : "unknown_error",
      );
      // A temporary provider/network failure must never turn a pending Pix into a failure.
      return { state: "pending" };
    }
  });
