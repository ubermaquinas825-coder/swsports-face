export const META_PIXEL_ID = "1853720048965709";
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
const CAMPAIGN_KEYS = new Set(["fbclid", "gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"]);
const ADVERTISING_SCRIPTS = [
  ["sw-google-ads", `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`],
  ["sw-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js"],
] as const;

function loadAdvertisingScripts() {
  for (const [id, src] of ADVERTISING_SCRIPTS) {
    const existing = document.getElementById(id);
    if (existing && existing.dataset["loadState"] !== "failed") continue;
    existing?.remove();
    const script = document.createElement("script");
    script.id = id; script.async = true; script.src = src;
    script.dataset["loadState"] = "loading";
    script.onload = () => { script.dataset["loadState"] = "loaded"; };
    script.onerror = () => { script.dataset["loadState"] = "failed"; };
    document.head.append(script);
  }
}

function discardPendingEvents() {
  if (window.fbq && !window.fbq.callMethod) {
    const queue = window.fbq.queue;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (["track", "trackSingle", "trackCustom"].includes(String(queue[i]?.[0]))) queue.splice(i, 1);
    }
  }
  if (document.getElementById("sw-google-ads")?.dataset["loadState"] !== "loaded") {
    const queue = window.dataLayer;
    if (queue) for (let i = queue.length - 1; i >= 0; i--) {
      const entry = queue[i];
      if (Array.isArray(entry) && entry[0] === "event") queue.splice(i, 1);
    }
  }
}

export function isPublicAdvertisingUrl() {
  const params = new URLSearchParams(location.search);
  return [...params].every(([key, value]) => CAMPAIGN_KEYS.has(key) && /^[\p{L}\p{N}_.~+ -]{0,500}$/u.test(value))
    && ["", "#colecao", "#personalidade", "#kits", "#faq"].includes(location.hash);
}
export function applyAdvertisingPermission(allowed: boolean) {
  if (!allowed) { lastPage = undefined; discardPendingEvents(); }
  if (!initialized && !allowed) return;
  if (!initialized) {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args); };
    window.gtag("consent", "default", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("set", "developer_id.dZjgwMW", true);
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ADS_ID, { send_page_view: false, allow_ad_personalization_signals: false, page_location: `${location.origin}${location.pathname}`, page_referrer: "" });
    const pixel: Pixel = Object.assign(function (...args: unknown[]) {
      if (pixel.callMethod) pixel.callMethod(...args);
      else pixel.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: "2.0" });
    pixel.push = pixel;
    window.fbq = pixel; window._fbq = pixel;
    pixel("set", "autoConfig", false, META_PIXEL_ID);
    pixel("init", META_PIXEL_ID, {}, { agent: "lovable" });
    initialized = true;
  }
  window.gtag?.("consent", "update", { ad_storage: allowed ? "granted" : "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.fbq?.("consent", allowed ? "grant" : "revoke");
  if (allowed) loadAdvertisingScripts();
}
export function trackStorefrontPage(region: string | null, path: string, optOut: boolean) {
  const trackedPaths = new Set(["/", "/atacado", "/checkout"]);
  if (!trackedPaths.has(path) || !isPublicAdvertisingUrl()) { applyAdvertisingPermission(false); return; }
  const allowed = advertisingAllowed(region, readConsent()?.history.at(-1), optOut);
  applyAdvertisingPermission(allowed);
  if (!allowed || lastPage === path) return;
  lastPage = path;
  window.gtag?.("event", "page_view", { send_to: GOOGLE_ADS_ID, page_location: `${location.origin}${path}`, page_referrer: "", page_title: "SW Sports" });
  window.fbq?.("track", "PageView");
  if (path === "/checkout") {
    window.fbq?.("track", "InitiateCheckout", { currency: "BRL" });
  }
}

function browserOptOut() {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    || navigator.doNotTrack === "1";
}

function canTrackCommerce() {
  const accepted = readConsent()?.history.at(-1)?.accepted === true;
  if (!accepted || browserOptOut()) return false;
  applyAdvertisingPermission(true);
  return Boolean(window.fbq);
}

export function trackAddToCart(product: { id: string; name: string }, qty: number, unitPrice: number) {
  if (!canTrackCommerce()) return;
  window.fbq?.("track", "AddToCart", {
    content_ids: [product.id],
    content_name: `Balaclava ${product.name}`,
    content_type: "product",
    currency: "BRL",
    value: unitPrice * qty,
    num_items: qty,
  });
}

export function trackInitiateCheckout(lines: Array<{ product: { id: string; name: string }; qty: number }>, value: number) {
  if (!canTrackCommerce() || !lines.length) return;
  window.fbq?.("track", "InitiateCheckout", {
    content_ids: lines.map((line) => line.product.id),
    contents: lines.map((line) => ({ id: line.product.id, quantity: line.qty })),
    content_type: "product",
    currency: "BRL",
    value,
    num_items: lines.reduce((sum, line) => sum + line.qty, 0),
  });
}

export function trackPurchase(orderId: string, value: number) {
  if (!canTrackCommerce()) return;
  const key = `sw-meta-purchase-${orderId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // If storage is unavailable, prefer reporting the verified purchase.
  }
  window.fbq?.("track", "Purchase", {
    currency: "BRL",
    value,
    order_id: orderId,
  });
}
