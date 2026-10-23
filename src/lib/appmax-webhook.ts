import { z } from "zod";

// Appmax Apphooks are delivered unsigned: the envelope below is the only shape
// this store relies on, and no field of it is financial truth.
export const appmaxWebhookEnvelope = z.object({
  event: z.string().min(1).max(80),
  event_type: z.enum(["order", "customer", "payment", "subscription", "withdraw"]),
}).passthrough();

// An order notification is only a prompt to re-read Appmax through the
// authenticated API. Payment truth still comes from the verified order read.
export function shouldReconcileNow(parsed: z.infer<typeof appmaxWebhookEnvelope>): boolean {
  return parsed.event_type === "order";
}

// Collapses the burst of events a single sale produces into one pass.
const MIN_SYNC_INTERVAL_MS = 3_000;
let lastSyncAt = 0;

export function tryAcquireSyncSlot(now: number = Date.now()): boolean {
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return false;
  lastSyncAt = now;
  return true;
}

/** Test seam: isolates the per-isolate throttle window between cases. */
export function resetSyncSlot(): void {
  lastSyncAt = 0;
}
