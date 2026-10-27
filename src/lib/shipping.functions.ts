import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultShippingConfig, shippingConfigSchema } from "@/lib/shipping";
import { shippingRequestSchema } from "@/lib/checkout";
import { quoteFreight, authenticateAppmax } from "@/lib/checkout.server";
import { melhorEnvioConnectionStatus } from "@/lib/melhor-envio.server";

export const getShippingAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error) throw new Error("Não foi possível verificar o acesso.");
  if (!role.data) return { allowed: false as const, config: defaultShippingConfig, orders: [], events: [], melhorEnvio: { connected: false as const, environment: "production", reason: "access_denied" as const } };
  const [settings, orders, events, melhorEnvio] = await Promise.all([
    context.supabase.from("shipping_settings").select("config").eq("id", true).maybeSingle(),
    context.supabase.from("shipping_orders").select("*").order("created_at", { ascending: false }).limit(50),
    context.supabase.from("shipping_events").select("*").order("created_at", { ascending: false }).limit(50),
    melhorEnvioConnectionStatus().catch(() => ({ connected: false as const, environment: "production", reason: "status_unavailable" as const })),
  ]);
  if (settings.error || orders.error || events.error) throw new Error("Não foi possível carregar frete e envios.");
  return { allowed: true as const, config: settings.data ? shippingConfigSchema.parse(settings.data.config) : defaultShippingConfig, orders: orders.data ?? [], events: events.data ?? [], melhorEnvio };
});

export const saveShippingConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((data: unknown) => shippingConfigSchema.parse(data)).handler(async ({ data, context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const result = await context.supabase.from("shipping_settings").upsert({ id: true, config: { ...data, labelAutomation: { ...data.labelAutomation, enabled: false } }, updated_at: new Date().toISOString() });
  if (result.error) throw new Error("Não foi possível salvar as configurações.");
  return { saved: true };
});

export const verifyShippingIntegrations = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertFinancialOperationsEnabled } = await import("./financial-maintenance.server");
  assertFinancialOperationsEnabled();
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const check = async (operation: () => Promise<string>) => {
    try { return { ok: true, message: await operation() }; }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Não foi possível verificar a integração." }; }
  };
  const [melhorEnvio, appmax] = await Promise.all([
    check(async () => {
      const status = await melhorEnvioConnectionStatus();
      if (!status.connected) throw new Error("Conta ainda não autorizada no Melhor Envio.");
      const options = await quoteFreight("01310100", [{ id: "gato-divertido", qty: 1 }]);
      if (!options.length) throw new Error("Autorização válida, mas a cotação de teste não retornou opções.");
      return `Conectado em ${status.environment}. Cotação real recebida: ${options.length} opção(ões).`;
    }),
    check(async () => { await authenticateAppmax(); return "Credenciais aceitas. Nenhum link ou cobrança criado."; }),
  ]);
  return { melhorEnvio, appmax, checkedAt: new Date().toISOString() };
});

// Public read-only quote for guest shoppers. This must stay available during
// financial maintenance because it neither creates orders nor charges/pays labels.
export const requestShippingQuote = createServerFn({ method: "POST" }).validator((data: unknown) => shippingRequestSchema.parse(data)).handler(async ({ data }) => {
  const options = await quoteFreight(data.cep, data.lines);
  return { options, message: options.length ? "" : "Nenhuma opção de entrega disponível para este CEP." };
});
