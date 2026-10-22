import { z } from "zod";
import { products } from "./products";

export const blingInventoryConfigSchema = z.object({
  warehouseId: z.number().int().positive().nullable(),
  checkAtCheckout: z.boolean(),
  mappings: z.array(z.object({ productId: z.string().refine((id) => products.some((p) => p.id === id)), sku: z.string().trim().min(1).max(200), blingId: z.number().int().positive().nullable() })).max(6),
}).superRefine((config, ctx) => {
  if (new Set(config.mappings.map((m) => m.productId)).size !== config.mappings.length || new Set(config.mappings.map((m) => m.sku)).size !== config.mappings.length) ctx.addIssue({ code: "custom", message: "Não repita modelos ou SKUs." });
  if (config.checkAtCheckout && (!config.warehouseId || config.mappings.length !== 6)) ctx.addIssue({ code: "custom", message: "Confirme o depósito e os seis modelos." });
});
export type BlingInventoryConfig = z.infer<typeof blingInventoryConfigSchema>;
export const emptyBlingInventoryConfig: BlingInventoryConfig = { warehouseId: null, checkAtCheckout: false, mappings: [] };
const balancesSchema = z.object({ data: z.array(z.object({ produto: z.object({ id: z.number().int().positive() }), depositos: z.array(z.object({ id: z.number().int().positive(), saldoVirtual: z.number().finite() })) })).max(100) });
export function projectWarehouseStock(value: unknown, warehouseId: number) {
  return balancesSchema.parse(value).data.map((row) => ({ blingId: row.produto.id, available: Math.max(0, Math.floor(row.depositos.find((d) => d.id === warehouseId)?.saldoVirtual ?? 0)) }));
}
export function assertStockAvailable(lines: Array<{ id: string; qty: number }>, config: BlingInventoryConfig, stock: Array<{ blingId: number; available: number }>) {
  for (const line of lines) {
    const mapping = config.mappings.find((m) => m.productId === line.id);
    const balance = stock.find((s) => s.blingId === mapping?.blingId);
    if (!mapping?.blingId || !balance) throw new Error("Não foi possível confirmar o estoque deste modelo.");
    if (line.qty > balance.available) throw new Error(`Estoque insuficiente: ${products.find((p) => p.id === line.id)?.name ?? line.id}. Disponível: ${balance.available}.`);
  }
}