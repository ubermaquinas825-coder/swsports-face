import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultShippingConfig, shippingConfigSchema } from "@/lib/shipping";
import { shippingRequestSchema } from "@/lib/checkout";
import { quoteFreight } from "@/lib/checkout.server";

export const getShippingAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error) throw new Error("Não foi possível verificar o acesso.");
  if (!role.data) return { allowed: false as const, config: defaultShippingConfig, orders: [], events: [] };
  const [settings, orders, events] = await Promise.all([
    context.supabase.from("shipping_settings").select("config").eq("id", true).maybeSingle(),
    context.supabase.from("shipping_orders").select("*").order("created_at", { ascending: false }).limit(50),
    context.supabase.from("shipping_events").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  if (settings.error || orders.error || events.error) throw new Error("Não foi possível carregar frete e envios.");
  return { allowed: true as const, config: settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig, orders: orders.data ?? [], events: events.data ?? [] };
});
export const saveShippingConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => shippingConfigSchema.parse(data)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const result = await context.supabase.from("shipping_settings").upsert({ id: true, config: data, updated_at: new Date().toISOString() });
  if (result.error) throw new Error("Não foi possível salvar as configurações.");
  return { saved: true };
});
// Public read-only quote for guest shoppers; never creates or pays for labels.
export const requestShippingQuote = createServerFn({ method: "POST" }).inputValidator((data: unknown) => shippingRequestSchema.parse(data)).handler(async ({ data }) => {
  const options = await quoteFreight(data.cep, data.lines);
  return { options, message: options.length ? "" : "Nenhuma opção de entrega disponível para este CEP." };
});