export const META_PIXEL_ID = "725374147272634";
export const GOOGLE_ADS_ID = "AW-875949502";
export const CONSENT_KEY = "sw-advertising-consent-v1";
export const NOTICE_VERSION = "2026-10-23-v1";
export const NOTICE_TEXT = "Google Ads e Meta recebem páginas visitadas, informações do navegador e identificadores de publicidade para medir visitas e desempenho dos anúncios. Não enviamos dados de cadastro ou pagamento. Você pode aceitar, recusar ou retirar sua escolha nas Configurações de cookies.";
const REGULATED = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LI LV LT LU MT NL NO PL PT RO SK SI ES SE GB CH BR".split(" "));
export type Choice = { accepted: boolean; at: string; region: string | null; noticeVersion: string };
export type ConsentRecord = { visitorId: string; noticeText: string; history: Choice[] };
export function requiresConsent(region: string | null) {
  return !region || region === "XX" || region === "T1" || !/^[A-Z]{2}$/.test(region) || REGULATED.has(region);
}
export function advertisingAllowed(region: string | null, choice?: Choice, optOut = false) {
  if (optOut) return false;
  return choice ? choice.accepted : !requiresConsent(region);
}
export function readConsent(): ConsentRecord | undefined {
  try {
    const record = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
    if (!record || typeof record.visitorId !== "string" || record.noticeText !== NOTICE_TEXT || !Array.isArray(record.history) || !record.history.length) return;
    if (!record.history.every((choice: Choice) => typeof choice.accepted === "boolean" && typeof choice.at === "string" && choice.noticeVersion === NOTICE_VERSION)) return;
    return record;
  } catch { return; }
}
export function saveChoice(accepted: boolean, region: string | null) {
  const previous = readConsent();
  const record: ConsentRecord = {
    visitorId: previous?.visitorId ?? crypto.randomUUID(), noticeText: NOTICE_TEXT,
    history: [...(previous?.history ?? []), { accepted, region, at: new Date().toISOString(), noticeVersion: NOTICE_VERSION }],
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  return record;
}
type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push?: Pixel; loaded: boolean; version: string };
declare global {
  interface Window { fbq?: Pixel; _fbq?: Pixel; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}
let initialized = false;
let lastPage: string | undefined;
export function applyAdvertisingPermission(allowed: boolean) {
  if (!initialized && !allowed) return;
  if (!initialized) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function () { window.dataLayer?.push(arguments); };
    window.gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("set", "developer_id.dZjgwMW", true);
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ADS_ID, { send_page_view: false, allow_ad_personalization_signals: false, page_location: `${location.origin}${location.pathname}`, page_referrer: "" });
    const pixel: Pixel = Object.assign(function (...args: unknown[]) {
      if (pixel.callMethod) pixel.callMethod.apply(pixel, args);
      else pixel.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: "2.0" });
    pixel.push = pixel;
    window.fbq = pixel; window._fbq = pixel;
    pixel("set", "autoConfig", false, META_PIXEL_ID);
    pixel("init", META_PIXEL_ID, {}, { agent: "lovable" });
    for (const [id, src] of [["sw-google-ads", `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`], ["sw-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js"]]) {
      if (document.getElementById(id)) continue;
      const script = document.createElement("script"); script.id = id; script.async = true; script.src = src; document.head.append(script);
    }
    initialized = true;
  }
  window.gtag?.("consent", "update", { ad_storage: allowed ? "granted" : "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.fbq?.("consent", allowed ? "grant" : "revoke");
}
export function trackStorefrontPage(region: string | null, path: string, optOut: boolean) {
  if (!["/", "/atacado"].includes(path)) { applyAdvertisingPermission(false); return; }
  const allowed = advertisingAllowed(region, readConsent()?.history.at(-1), optOut);
  applyAdvertisingPermission(allowed);
  if (!allowed || lastPage === path) return;
  lastPage = path;
  // Never transmit query strings, fragments, referrers or form values.
  window.gtag?.("event", "page_view", { send_to: GOOGLE_ADS_ID, page_location: `${location.origin}${path}`, page_referrer: "", page_title: "SW Sports" });
  if (!location.search && !location.hash) window.fbq?.("track", "PageView");
}