import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orderInput = (input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input);

async function requireWritableEnvironment() {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
}

export const prepareMelhorEnvioShipping = createServerFn({ method: "POST" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireWritableEnvironment();
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const { prepareMelhorEnvioCart } = await import("./melhor-envio-cart.server");
    return prepareMelhorEnvioCart(data.orderId);
  });

export const inspectMelhorEnvioShipping = createServerFn({ method: "GET" })
  .validator(orderInput)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireWritableEnvironment();
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
    const { syncMelhorEnvioTrackingOrder } = await import("./shipping-tracking.server");
    return syncMelhorEnvioTrackingOrder(data.orderId);
  });
