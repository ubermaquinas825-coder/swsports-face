/**
 * The shipping_label_jobs table is deliberately read-only to service_role.
 * A stage=review manual payment job can be retained after an administrator
 * successfully resets the original shipment. Its original shipment_id may then
 * legitimately differ from the order's newly-created Melhor Envio shipment.
 */
export type ManualReviewJob = {
  stage: string;
  payload: unknown;
  shipment_id: string | null;
  updated_at: string;
};

export type ManualShippingAttempt = {
  provider: string;
  kind: string;
  created_at: string;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isRecoverableManualReviewJob(
  job: ManualReviewJob | null,
  shipmentId: string | null,
  latestAttempt: ManualShippingAttempt | null,
  previousResetAt: string | null,
): boolean {
  if (!job || job.stage !== "review" || object(job.payload)?.["manual_payment"] !== true)
    return false;
  if (!job.shipment_id) return true;
  if (shipmentId && job.shipment_id === shipmentId) return true;

  // A mismatched historical shipment ID must have explicit evidence that it
  // was released BEFORE this new manual-cart attempt. This is NOT a generic
  // permission bypass or a recovery path for automated, paid, or unknown jobs.
  if (latestAttempt?.provider !== "melhor_envio" || latestAttempt.kind !== "manual_cart" || !previousResetAt)
    return false;
  const jobTime = Date.parse(job.updated_at);
  const resetTime = Date.parse(previousResetAt);
  const cartTime = Date.parse(latestAttempt.created_at);
  return [jobTime, resetTime, cartTime].every(Number.isFinite)
    && jobTime < resetTime
    && resetTime < cartTime;
}
