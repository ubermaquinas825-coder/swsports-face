// Payments are persisted by the provider reconciliation before this hook.
// Shipping is prepared only by an explicit administrator action.
export async function runPostPaymentAutomation() {
  return { shipping: "manual" as const };
}
