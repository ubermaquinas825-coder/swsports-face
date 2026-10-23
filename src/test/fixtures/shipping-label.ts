import { buildLabelPayload } from "@/lib/shipping-labels";
import { testDeliveryAddress } from "./delivery-address";

export const sender = { name: "Loja Teste", address: "Rua de Origem", number: "10", complement: "", district: "Centro", city: "Uberlândia", state_abbr: "MG", postal_code: "38408562", email: "test@example.com" };
export const labelInput = { orderId: "order-test", address: testDeliveryAddress, cep: "38408562", service: { id: "1", originCep: "38408562", package: { height: 10, width: 15, length: 20, weight: 0.15 } }, items: [{ id: "gato-divertido", name: "Gato divertido", qty: 1, unit_price_cents: 4990 }], subtotalCents: 4990, sender };
export function labelInfo(id = "shipment-test", status = "pending") {
  const payload = buildLabelPayload(labelInput);
  const party = (p: typeof payload.from | typeof payload.to) => ({ ...p, location_number: p.number });
  return { id, status, price: 12.34, service_id: 1, tracking: status === "pending" ? null : "TRACK1",
    from: party(payload.from), to: party(payload.to), invoice: null, ...payload.volumes,
    insurance_value: 49.9, own_hand: false, receipt: false, products: payload.products };
}
