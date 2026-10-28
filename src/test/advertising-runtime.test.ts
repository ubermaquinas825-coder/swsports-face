import { beforeEach, describe, expect, it, vi } from "vitest";

async function advertising() {
  return import("@/lib/advertising");
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.head.innerHTML = "";
  delete window.fbq;
  delete window._fbq;
  delete window.gtag;
  delete window.dataLayer;
  history.replaceState(null, "", "/");
});

describe("advertising SDK lifecycle", () => {
  it("does not load advertising before acceptance in Brazil", async () => {
    const ad = await advertising();
    ad.trackStorefrontPage("BR", "/", false);
    expect(document.querySelector("#sw-meta-pixel")).toBeNull();
    expect(window.fbq).toBeUndefined();
  });

  it.each(["/", "/?fbclid=IwZX123&utm_source=facebook&utm_campaign=campanha-1", "/?utm_campaign=Promo%C3%A7%C3%A3o+S%C3%A3o+Paulo", "/#colecao", "/#personalidade"])(
    "initializes the exact pixel and queues one PageView after acceptance: %s",
    async (url) => {
      history.replaceState(null, "", url);
      const ad = await advertising();
      ad.saveChoice(true, "BR");
      ad.trackStorefrontPage("BR", "/", false);
      ad.trackStorefrontPage("BR", "/", false);
      expect(document.querySelector<HTMLScriptElement>("#sw-meta-pixel")?.src).toBe("https://connect.facebook.net/en_US/fbevents.js");
      expect(window.fbq?.queue).toContainEqual(["init", "1664422701692558", {}, { agent: "lovable" }]);
      expect(window.fbq?.queue).toContainEqual(["consent", "grant"]);
      expect(window.fbq?.queue.filter((call) => call[0] === "track")).toEqual([["track", "PageView"]]);
      expect(document.querySelectorAll("#sw-meta-pixel")).toHaveLength(1);
    },
  );

  it("discards queued visits if consent is withdrawn before SDK downloads complete", async () => {
    const ad = await advertising();
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    expect(window.fbq?.queue).toContainEqual(["track", "PageView"]);
    expect(window.dataLayer?.some((entry) => Array.isArray(entry) && entry[0] === "event")).toBe(true);
    ad.saveChoice(false, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    expect(window.fbq?.queue.some((entry) => entry[0] === "track")).toBe(false);
    expect(window.dataLayer?.some((entry) => Array.isArray(entry) && entry[0] === "event")).toBe(false);
    expect(window.fbq?.queue.at(-1)).toEqual(["consent", "revoke"]);
  });

  it("retries a failed SDK without duplicate initialization or PageViews", async () => {
    const ad = await advertising();
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    const original = document.getElementById("sw-meta-pixel")!;
    original.dispatchEvent(new Event("error"));
    expect(original.dataset["loadState"]).toBe("failed");
    ad.trackStorefrontPage("BR", "/", false);
    const replacement = document.getElementById("sw-meta-pixel");
    expect(replacement).not.toBe(original);
    expect(document.querySelectorAll("#sw-meta-pixel")).toHaveLength(1);
    expect(window.fbq?.queue.filter((entry) => entry[0] === "init")).toHaveLength(1);
    expect(window.fbq?.queue.filter((entry) => entry[0] === "track")).toHaveLength(1);
    replacement?.dispatchEvent(new Event("load"));
    ad.trackStorefrontPage("BR", "/", false);
    expect(document.getElementById("sw-meta-pixel")).toBe(replacement);
  });

  it("does not retry failed scripts after withdrawal", async () => {
    const ad = await advertising();
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    const script = document.getElementById("sw-meta-pixel")!;
    script.dispatchEvent(new Event("error"));
    ad.saveChoice(false, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    expect(document.getElementById("sw-meta-pixel")).toBe(script);
  });

  it("dispatches PageView through the loaded SDK when returning from a private route", async () => {
    const ad = await advertising();
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    const sdk = vi.fn();
    window.fbq!.callMethod = sdk;
    history.replaceState(null, "", "/admin");
    ad.trackStorefrontPage("BR", "/admin", false);
    expect(sdk).toHaveBeenCalledWith("consent", "revoke");
    expect(sdk).not.toHaveBeenCalledWith("track", "PageView");
    history.replaceState(null, "", "/");
    ad.trackStorefrontPage("BR", "/", false);
    expect(sdk).toHaveBeenCalledWith("track", "PageView");
  });

  it("blocks withdrawal and browser opt-outs, and resumes on a new acceptance", async () => {
    const ad = await advertising();
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", true);
    expect(window.fbq).toBeUndefined();
    ad.trackStorefrontPage("BR", "/", false);
    const sdk = vi.fn();
    window.fbq!.callMethod = sdk;
    ad.saveChoice(false, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    expect(sdk).toHaveBeenCalledWith("consent", "revoke");
    expect(sdk).not.toHaveBeenCalledWith("track", "PageView");
    ad.saveChoice(true, "BR");
    ad.trackStorefrontPage("BR", "/", false);
    expect(sdk).toHaveBeenCalledWith("track", "PageView");
  });

  it.each(["/?email=cliente@example.com", "/?utm_source=cliente%40example.com", "/#access_token=secret", "/auth", "/pagamento", "/privacidade"])(
    "does not initialize advertising for sensitive or excluded URLs: %s",
    async (url) => {
      history.replaceState(null, "", url);
      const ad = await advertising();
      ad.saveChoice(true, "BR");
      ad.trackStorefrontPage("BR", location.pathname, false);
      expect(window.fbq).toBeUndefined();
      expect(document.querySelector("#sw-meta-pixel")).toBeNull();
    },
  );
});
