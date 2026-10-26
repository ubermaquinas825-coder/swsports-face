import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: any) {
  const role = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
}

const orderInput = (input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input);

export const prepareMelhorEnvioShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(orderInput)
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { prepareMelhorEnvioCart } = await import("./melhor-envio-cart.server");
    return prepareMelhorEnvioCart(data.orderId);
  });

export const inspectMelhorEnvioShipping = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(orderInput)
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { syncMelhorEnvioTrackingOrder } = await import("./shipping-tracking.server");
    return syncMelhorEnvioTrackingOrder(data.orderId);
  });
