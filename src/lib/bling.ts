import { z } from "zod";
import { SITE_ORIGIN } from "./site";

export const BLING_ORIGIN = SITE_ORIGIN;
export const BLING_CALLBACK_URL = `${BLING_ORIGIN}/api/public/bling/callback`;
export const BLING_AUTHORIZE_URL = "https://bling.com.br/Api/v3/oauth/authorize";
export const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";
export const BLING_STATE_TTL_MS = 10 * 60 * 1000;
export const BLING_PRODUCTS_URL = "https://api.bling.com.br/Api/v3/produtos?pagina=1&limite=10";
const productResponseSchema = z.object({ data: z.array(z.object({ id: z.number().int().positive(), nome: z.string().max(1000), codigo: z.string().max(200).optional() })).max(10) });
export function projectBlingProducts(value: unknown) {
  return productResponseSchema.parse(value).data.map((product) => ({ id: product.id, name: product.nome, sku: product.codigo ?? "" }));
}
export function blingAuthorizationUrl(clientId: string, state: string) {
  const url = new URL(BLING_AUTHORIZE_URL);
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, state }).toString();
  return url.toString();
}
export function needsBlingRefresh(expiresAt: string, now = Date.now()) {
  return new Date(expiresAt).getTime() <= now + 60_000;
}
