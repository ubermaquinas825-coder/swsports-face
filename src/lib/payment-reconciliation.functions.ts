import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkAppmaxPayments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const { syncPaidOrders } = await import("./bling-orders.server");
  const result = await syncPaidOrders();
  return { checked: result.checked, exported: result.exported, errors: result.errors.slice(0, 3) };
});
