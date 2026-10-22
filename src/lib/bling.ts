export const BLING_ORIGIN = "https://project--45740091-8f59-41fb-957a-c2f263b7b39c-dev.lovable.app";
export const BLING_CALLBACK_URL = `${BLING_ORIGIN}/api/public/bling/callback`;
export const BLING_AUTHORIZE_URL = "https://bling.com.br/Api/v3/oauth/authorize";
export const BLING_TOKEN_URL = "https://api.bling.com.br/Api/v3/oauth/token";
export const BLING_STATE_TTL_MS = 10 * 60 * 1000;
export function blingAuthorizationUrl(clientId: string, state: string) {
  const url = new URL(BLING_AUTHORIZE_URL);
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, state }).toString();
  return url.toString();
}
export function needsBlingRefresh(expiresAt: string, now = Date.now()) {
  return new Date(expiresAt).getTime() <= now + 60_000;
}