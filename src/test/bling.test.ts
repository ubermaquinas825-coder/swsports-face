import { describe, expect, it } from "vitest";
import { BLING_CALLBACK_URL, blingAuthorizationUrl, needsBlingRefresh } from "@/lib/bling";

describe("Bling OAuth", () => {
  it("uses the site's HTTPS callback", () => {
    const url = new URL(BLING_CALLBACK_URL);
    expect(url.protocol).toBe("https:");
    expect(url.pathname).toBe("/api/public/bling/callback");
  });
  it("includes the caller's state in the official authorization request", () => {
    const url = new URL(blingAuthorizationUrl("test-client", "test-state"));
    expect(url.origin).toBe("https://bling.com.br");
    expect(url.pathname).toBe("/Api/v3/oauth/authorize");
    expect(url.searchParams.get("state")).toBe("test-state");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
  it("renews before access token expiration", () => {
    const now = Date.parse("2026-10-22T22:00:00Z");
    expect(needsBlingRefresh("2026-10-22T22:00:59Z", now)).toBe(true);
    expect(needsBlingRefresh("2026-10-22T22:02:00Z", now)).toBe(false);
  });
});