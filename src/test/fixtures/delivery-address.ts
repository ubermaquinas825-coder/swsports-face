import type { DeliveryAddress } from "@/lib/delivery-address";

// Synthetic test recipient; never submit to a live provider.
export const testDeliveryAddress: DeliveryAddress = {
  name: "Destinatário Teste", document: "52998224725", email: "teste@example.com",
  phone: "11999999999", postalCode: "38408562", street: "Rua de Teste", number: "123",
  complement: "", district: "Bairro de Teste", city: "Uberlândia", state: "MG",
};
