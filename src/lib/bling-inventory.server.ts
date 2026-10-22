import { z } from "zod";
import { getBlingAccessToken } from "./bling.server";
import { assertStockAvailable, blingInventoryConfigSchema, emptyBlingInventoryConfig, projectWarehouseStock, type BlingInventoryConfig } from "./bling-inventory";

class BlingReadError extends Error { constructor(message: string, readonly status: number) { super(message); } }
async function blingRead(path: string, query: URLSearchParams) {
  const url = new URL(`https://api.bling.com.br/Api/v3/${path}`);
  url.search = query.toString();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await getBlingAccessToken()}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new BlingReadError(`Bling recusou a consulta de estoque/produtos (HTTP ${response.status}). Confira as permissões do aplicativo.`, response.status);
  return response.json() as Promise<unknown>;
}
export async function readBlingWarehouses() {
  try {
    const body = await blingRead("depositos", new URLSearchParams({ pagina: "1", limite: "100", situacao: "1" }));
    return z.object({ data: z.array(z.object({ id: z.number().int().positive(), descricao: z.string().max(1000) })).max(100) }).parse(body).data.map((d) => ({ id: d.id, name: d.descricao }));
  } catch (error) {
    if (!(error instanceof BlingReadError) || error.status !== 403) throw error;
    // The app may lack the depot-list scope while still reading stock balances: derive depots from the catalog balances.
    const products = z.object({ data: z.array(z.object({ id: z.number().int().positive() })).max(100) }).parse(await blingRead("produtos", new URLSearchParams({ pagina: "1", limite: "100", criterio: "2" }))).data;
    if (!products.length) throw new Error("Nenhum produto ativo encontrado no Bling para identificar o depósito.");
    const query = new URLSearchParams(); products.slice(0, 50).forEach((p) => query.append("idsProdutos[]", String(p.id)));
    const balances = z.object({ data: z.array(z.object({ depositos: z.array(z.object({ id: z.number().int().positive() })) })) }).parse(await blingRead("estoques/saldos", query)).data;
    const ids = [...new Set(balances.flatMap((b) => b.depositos.map((d) => d.id)))];
    if (!ids.length) throw new Error("O Bling não informou depósitos nos saldos dos produtos.");
    return ids.map((id) => ({ id, name: ids.length === 1 ? `Depósito padrão (nº ${id})` : `Depósito nº ${id}` }));
  }
}
export async function verifyBlingMappings(config: BlingInventoryConfig) {
  const warehouses = await readBlingWarehouses();
  if (!config.warehouseId || !warehouses.some((w) => w.id === config.warehouseId)) throw new Error("Selecione um depósito ativo do Bling.");
  if (!config.mappings.length) throw new Error("Informe os SKUs dos modelos que deseja vincular.");
  const query = new URLSearchParams({ pagina: "1", limite: "100", criterio: "2" });
  config.mappings.forEach((m) => query.append("codigos[]", m.sku));
  const body = await blingRead("produtos", query);
  const rows = z.object({ data: z.array(z.object({ id: z.number().int().positive(), codigo: z.string() })).max(100) }).parse(body).data;
  const mappings = config.mappings.map((mapping) => {
    const matches = rows.filter((r) => r.codigo === mapping.sku);
    if (matches.length !== 1) throw new Error(`SKU ${mapping.sku}: produto ausente ou ambíguo no Bling.`);
    return { ...mapping, blingId: matches[0]?.id ?? null };
  });
  if (new Set(mappings.map((m) => m.blingId)).size !== mappings.length) throw new Error("Um produto Bling não pode representar dois modelos.");
  return blingInventoryConfigSchema.parse({ ...config, mappings });
}
export async function readMappedStock(config: BlingInventoryConfig) {
  if (!config.warehouseId || !config.mappings.length || config.mappings.some((m) => !m.blingId)) throw new Error("Confirme os vínculos e o depósito antes da consulta.");
  const query = new URLSearchParams();
  config.mappings.forEach((m) => query.append("idsProdutos[]", String(m.blingId)));
  return projectWarehouseStock(await blingRead("estoques/saldos", query), config.warehouseId);
}
export async function checkBlingCheckoutStock(lines: Array<{ id: string; qty: number }>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("bling_store_settings").select("config").eq("id", true).maybeSingle();
  if (result.error) throw new Error("Não foi possível verificar as configurações de estoque.");
  const config = result.data ? blingInventoryConfigSchema.parse(result.data.config) : emptyBlingInventoryConfig;
  if (!config.checkAtCheckout) return;
  assertStockAvailable(lines, config, await readMappedStock(config));
}