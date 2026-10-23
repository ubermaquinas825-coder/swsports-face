export async function runPostPaymentAutomation() {
  const { syncPaidOrders } = await import("./bling-orders.server");
  const orders = await syncPaidOrders();

  const { syncShippingLabels } = await import("./shipping-labels.server");
  const labels = await syncShippingLabels();

  return { orders, labels };
}
