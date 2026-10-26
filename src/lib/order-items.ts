import { z } from "zod";
export const orderItemsSchema = z
  .array(
    z.object({
      id: z.string(),
      name: z.string(),
      qty: z.number().int().positive(),
      unit_price_cents: z.number().int().positive(),
    }),
  )
  .min(1);
