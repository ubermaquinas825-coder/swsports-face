// Only failures known to be safe to retry should request scheduler retries.
export class RetryableSyncError extends Error {}
export class LeaseLostError extends RetryableSyncError {}
