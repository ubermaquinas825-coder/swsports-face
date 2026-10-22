import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CartProvider, useCart } from "@/hooks/use-cart";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Store cart", () => {
  it("adds a first purchase and totals units at R$ 49,90", () => {
    const { result } = renderHook(useCart, { wrapper: CartProvider });
    act(() => result.current.add("boca-de-beijo"));
    expect(result.current.count).toBe(1);
    expect(result.current.subtotal).toBe(49.9);
    act(() => result.current.add("boca-de-beijo"));
    expect(result.current.count).toBe(2);
    expect(result.current.subtotal).toBe(99.8);
  });

  it("restores saved items without overwriting them with an empty cart", async () => {
    localStorage.setItem("swsports-cart-v1", JSON.stringify([{ id: "gato-divertido", qty: 2 }]));
    const { result } = renderHook(useCart, { wrapper: CartProvider });
    await waitFor(() => expect(result.current.count).toBe(2));
    expect(JSON.parse(localStorage.getItem("swsports-cart-v1") || "[]")).toEqual([{ id: "gato-divertido", qty: 2 }]);
  });

});