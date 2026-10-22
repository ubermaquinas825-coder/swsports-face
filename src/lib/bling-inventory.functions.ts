import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { blingInventoryConfigSchema, emptyBlingInventoryConfig } from "./bling-inventory";
import { readBlingWarehouses, readMappedStock, verifyBlingMappings } from "./bling-inventory.server";

export const getBlingInventory = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const result = await context.supabase.from("bling_store_settings").select("config").eq("id", true).maybeSingle();
  if (result.error) throw new Error("Não foi possível carregar os vínculos.");
  return result.data ? blingInventoryConfigSchema.parse(result.data.config) : emptyBlingInventoryConfig;
});
export const loadBlingWarehouses = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  return readBlingWarehouses();
});
export const saveBlingInventory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => blingInventoryConfigSchema.parse(data)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const verified = await verifyBlingMappings(data);
  const result = await context.supabase.from("bling_store_settings").upsert({ id: true, config: verified, updated_at: new Date().toISOString() });
  if (result.error) throw new Error("Não foi possível salvar os vínculos.");
  return { config: verified, stock: await readMappedStock(verified) };
});
export const testBlingInventory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Acesso administrativo necessário.");
  const result = await context.supabase.from("bling_store_settings").select("config").eq("id", true).maybeSingle();
  if (result.error || !result.data) throw new Error("Salve os vínculos antes da consulta.");
  return readMappedStock(blingInventoryConfigSchema.parse(result.data.config));
});