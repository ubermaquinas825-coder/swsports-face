import { beforeEach, describe, expect, it } from "vitest";
import { advertisingAllowed, CONSENT_KEY, GOOGLE_ADS_ID, META_PIXEL_ID, NOTICE_TEXT, readConsent, requiresConsent, saveChoice } from "@/lib/advertising";
describe("advertising consent", () => {
  beforeEach(() => localStorage.clear());
  it("uses the owner's exact advertising IDs", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-875949502"); expect(META_PIXEL_ID).toBe("725374147272634");
  });
  it("requires regional acceptance and blocks unresolved regions", () => {
    for (const region of ["BR", "DE", "GB", "CH", "XX", "T1", null]) {
      expect(requiresConsent(region)).toBe(true); expect(advertisingAllowed(region)).toBe(false);
    }
    expect(advertisingAllowed("US")).toBe(true);
  });
  it("explicit refusal overrides regional defaults", () => {
    const record = saveChoice(false, "US"); expect(advertisingAllowed("US", record.history.at(-1))).toBe(false);
  });
  it("acceptance permits regional tracking but not browser opt-outs", () => {
    const record = saveChoice(true, "BR"); expect(advertisingAllowed("BR", record.history.at(-1))).toBe(true);
    expect(advertisingAllowed("BR", record.history.at(-1), true)).toBe(false);
  });
  it("withdrawal preserves dated acceptance evidence and visitor identity", () => {
    const accepted = saveChoice(true, "BR"); const withdrawn = saveChoice(false, "BR");
    expect(withdrawn.visitorId).toBe(accepted.visitorId); expect(withdrawn.noticeText).toBe(NOTICE_TEXT);
    expect(withdrawn.history.map((entry) => entry.accepted)).toEqual([true, false]);
    expect(Number.isFinite(Date.parse(withdrawn.history[0].at))).toBe(true);
    expect(advertisingAllowed("BR", readConsent()?.history.at(-1))).toBe(false);
  });
  it("invalid stored evidence does not authorize advertising", () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true })); expect(readConsent()).toBeUndefined();
  });
});