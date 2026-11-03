import { describe, expect, it } from "vitest";
import {
  isRecoverableManualReviewJob,
  type ManualReviewJob,
  type ManualShippingAttempt,
} from "@/lib/melhor-envio-reset-evidence";

const oldJob: ManualReviewJob = {
  stage: "review",
  payload: { manual_payment: true },
  shipment_id: "old-superfrete-id",
  updated_at: "2026-10-26T17:50:05.672Z",
};
const current: ManualShippingAttempt = {
  provider: "melhor_envio",
  kind: "manual_cart",
  created_at: "2026-10-30T13:41:59.062Z",
};
const previousResetAt = "2026-10-30T13:27:59.326Z";

describe("retained manual label job reset eligibility", () => {
  it("permits the same shipment ID on a verified review job", () => {
    expect(isRecoverableManualReviewJob(oldJob, oldJob.shipment_id, null, null)).toBe(true);
  });
  it("permits a review job with no external shipment ID", () => {
    expect(isRecoverableManualReviewJob({ ...oldJob, shipment_id: null }, "new-id", null, null)).toBe(true);
  });
  it("recovers a stale SuperFrete job only after a previous reset and new Melhor Envio cart", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-melhor-envio-id", current, previousResetAt)).toBe(true);
  });
  it("recovers a stale Melhor Envio job after a previous reset", () => {
    expect(isRecoverableManualReviewJob({ ...oldJob, shipment_id: "old-melhor-envio-id" }, "current-me-id", current, previousResetAt)).toBe(true);
  });
  it("rejects stale jobs without a previous reset", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-id", current, null)).toBe(false);
  });
  it("rejects stale jobs if the reset happened before the job was last modified", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-id", current, "2026-10-25T00:00:00Z")).toBe(false);
  });
  it("rejects stale jobs if the reset happened after the new cart", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-id", current, "2026-10-31T00:00:00Z")).toBe(false);
  });
  it("rejects non-legacy jobs and unknown payment status", () => {
    expect(isRecoverableManualReviewJob({ ...oldJob, stage: "paying" }, "new-id", current, previousResetAt)).toBe(false);
    expect(isRecoverableManualReviewJob({ ...oldJob, stage: "complete" }, "new-id", current, previousResetAt)).toBe(false);
    expect(isRecoverableManualReviewJob({ ...oldJob, payload: { manual_payment: false } }, "new-id", current, previousResetAt)).toBe(false);
    expect(isRecoverableManualReviewJob(null, "new-id", current, previousResetAt)).toBe(false);
  });
  it("does not accept another provider or event type as new-cart evidence", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-id", { ...current, provider: "superfrete" }, previousResetAt)).toBe(false);
    expect(isRecoverableManualReviewJob(oldJob, "new-id", { ...current, kind: "label" }, previousResetAt)).toBe(false);
  });
  it("rejects malformed timestamps, rather than assuming a reset succeeded", () => {
    expect(isRecoverableManualReviewJob(oldJob, "new-id", current, "invalid-date")).toBe(false);
    expect(isRecoverableManualReviewJob({ ...oldJob, updated_at: "bad" }, "new-id", current, previousResetAt)).toBe(false);
  });
  it("does not automatically release a job with shipment ID when no current shipment exists", () => {
    expect(isRecoverableManualReviewJob(oldJob, null, null, null)).toBe(false);
  });
});
