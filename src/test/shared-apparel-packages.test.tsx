import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/products")>();
  const shirts = ["m", "g"].map((size) => ({
    id: `fixture-shared-shirt-${size}`, name: "Synthetic shirt", description: "Test fixture",
    image: "/fixture.webp", category: "camiseta" as const, size, priceCents: 7990,
  }));
  return {
    ...actual,
    productFor: (id: string) => shirts.find((shirt) => shirt.id === id) ?? actual.productFor(id),
  };
});

import { ApparelPackagingSettings } from "@/components/ApparelPackagingSettings";
import { chooseCartPackage, choosePackage, defaultShippingConfig, shippingConfigSchema, type ShippingConfig } from "@/lib/shipping";

// The owner approved reusing these registered packages with a 180 g shirt.
// These values are test inputs, never application defaults.
const registeredPackages = [
  { name: "Uma balaclava", widthCm: 15, capacity: 1, heightCm: 10, lengthCm: 22, weightKg: 0.105, packagingWeightKg: 0.005 },
  { name: "Até 10 balaclavas", widthCm: 15, capacity: 10, heightCm: 10, lengthCm: 22, weightKg: 1.005, packagingWeightKg: 0.005 },
];
const config: ShippingConfig = {
  ...defaultShippingConfig,
  productWeightKg: 0.1,
  packages: registeredPackages,
  apparelShipping: { productWeightKg: 0.18, packages: registeredPackages },
};
const shirt = (qty: number) => ({ id: "fixture-shared-shirt-m", qty });
const balaclava = (qty: number) => ({ id: "gato-divertido", qty });

afterEach(cleanup);

describe("Explicitly approved shared apparel packages", () => {
  it("keeps the optional configuration absent from legacy settings and preserves balaclava rules", () => {
    const legacy = shippingConfigSchema.parse(defaultShippingConfig);
    expect(legacy.apparelShipping).toBeUndefined();
    expect(chooseCartPackage([balaclava(2)], config)).toEqual(choosePackage(2, config));
    expect(chooseCartPackage([shirt(1)], legacy)).toBeNull();
  });

  it.each([[1, 0.185], [2, 0.365], [10, 1.805]])("adds one 5 g package to %i shirts", (quantity, weightKg) => {
    const result = chooseCartPackage([shirt(quantity)], config);
    expect(result).toMatchObject({ weightKg, lengthCm: 22, widthCm: 15, heightCm: 10, capacity: quantity === 1 ? 1 : 10 });
    expect(config.apparelShipping?.packages.map((packaging) => packaging.weightKg)).toEqual([0.105, 1.005]);
  });

  it("counts mixed products and sizes against total capacity without scaling dimensions", () => {
    expect(chooseCartPackage([shirt(1), balaclava(2)], config)).toMatchObject({ weightKg: 0.385, capacity: 10, lengthCm: 22, widthCm: 15, heightCm: 10 });
    expect(chooseCartPackage([shirt(1), { id: "fixture-shared-shirt-g", qty: 1 }], config)).toMatchObject({ weightKg: 0.365, capacity: 10 });
    expect(chooseCartPackage([shirt(11)], config)).toBeNull();
    expect(chooseCartPackage([shirt(10), balaclava(1)], config)).toBeNull();
  });

  it("uses the smallest eligible package even when the configured list is unsorted", () => {
    const unsorted = { ...config, apparelShipping: { ...config.apparelShipping!, packages: [...registeredPackages].reverse() } };
    expect(chooseCartPackage([shirt(1)], unsorted)).toMatchObject({ capacity: 1, weightKg: 0.185 });
    expect(unsorted.apparelShipping.packages[0]?.capacity).toBe(10);
  });

  it("requires the balaclava individual weight only when balaclavas are present", () => {
    const missingBalaclavaWeight = { ...config, productWeightKg: null };
    expect(chooseCartPackage([shirt(1)], missingBalaclavaWeight)).toMatchObject({ weightKg: 0.185 });
    expect(chooseCartPackage([shirt(1), balaclava(1)], missingBalaclavaWeight)).toBeNull();
  });

  it("never infers an unknown empty-package weight from the old packed weight", () => {
    const unknown = { ...config, apparelShipping: { productWeightKg: 0.18, packages: registeredPackages.map((packaging) => ({ ...packaging, packagingWeightKg: null })) } };
    expect(chooseCartPackage([shirt(1)], unknown)).toBeNull();
    const nextKnown = { ...config, apparelShipping: { productWeightKg: 0.18, packages: [{ ...registeredPackages[0]!, packagingWeightKg: null }, registeredPackages[1]!] } };
    expect(chooseCartPackage([shirt(1)], nextKnown)).toMatchObject({ capacity: 10, weightKg: 0.185 });
    const zeroTare = { ...config, apparelShipping: { productWeightKg: 0.18, packages: [{ ...registeredPackages[0]!, packagingWeightKg: 0 }] } };
    expect(chooseCartPackage([shirt(1)], zeroTare)).toMatchObject({ weightKg: 0.18 });
  });

  it("gives an exact measured combination priority over the shared rule", () => {
    const exact = { name: "Measured exact parcel", shirtQuantity: 1, balaclavaQuantity: 2, weightKg: 0.401, lengthCm: 25, widthCm: 18, heightCm: 8 };
    expect(chooseCartPackage([shirt(1), balaclava(2)], { ...config, apparelPackages: [exact] })).toEqual(exact);
    expect(chooseCartPackage([shirt(2)], { ...config, apparelPackages: [exact] })).toMatchObject({ weightKg: 0.365 });
  });

  it("rounds the final combined weight to three decimal places", () => {
    const precise = { ...config, productWeightKg: 0.1004, apparelShipping: { productWeightKg: 0.1804, packages: registeredPackages } };
    expect(chooseCartPackage([shirt(1), balaclava(2)], precise)).toMatchObject({ weightKg: 0.386 });
  });

  it("requires a positive finite garment weight and at least one valid package", () => {
    expect(shippingConfigSchema.safeParse(config).success).toBe(true);
    for (const productWeightKg of [0, -0.18, NaN, Infinity, null]) {
      expect(shippingConfigSchema.safeParse({ ...config, apparelShipping: { ...config.apparelShipping, productWeightKg } }).success).toBe(false);
    }
    expect(shippingConfigSchema.safeParse({ ...config, apparelShipping: { productWeightKg: 0.18, packages: [] } }).success).toBe(false);
    expect(shippingConfigSchema.safeParse({ ...config, apparelShipping: { productWeightKg: 0.18, packages: [{ ...registeredPackages[0], capacity: 0 }] } }).success).toBe(false);
  });
});

function Editor({ initial = { ...defaultShippingConfig, packages: registeredPackages } }: { initial?: ShippingConfig }) {
  const [value, setValue] = useState<ShippingConfig>(initial);
  return <>
    <ApparelPackagingSettings config={value} onChange={setValue} />
    <output aria-label="Configuração válida">{String(shippingConfigSchema.safeParse(value).success)}</output>
    <output aria-label="Dados da configuração">{JSON.stringify(value)}</output>
  </>;
}

describe("Shared apparel package administration", () => {
  it("only copies packages after an explicit action and requires a real individual weight", () => {
    render(<Editor />);
    expect(screen.queryByRole("spinbutton", { name: "Peso individual de uma camiseta sem embalagem (kg)" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar embalagens cadastradas" }));
    const weight = screen.getByRole("spinbutton", { name: "Peso individual de uma camiseta sem embalagem (kg)" });
    expect(weight).toHaveValue(null);
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("false");
    fireEvent.change(weight, { target: { value: "0.18" } });
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("true");
    const value = JSON.parse(screen.getByLabelText("Dados da configuração").textContent!);
    expect(value.apparelShipping).toEqual({ productWeightKg: 0.18, packages: registeredPackages });
    const first = screen.getByRole("group", { name: "Embalagem compartilhada 1" });
    fireEvent.change(within(first).getByRole("spinbutton", { name: "Comprimento externo (cm)" }), { target: { value: "24" } });
    const changed = JSON.parse(screen.getByLabelText("Dados da configuração").textContent!);
    expect(changed.apparelShipping.packages[0].lengthCm).toBe(24);
    expect(changed.packages).toEqual(registeredPackages);
    fireEvent.click(screen.getByRole("button", { name: "Remover configuração compartilhada" }));
    expect(JSON.parse(screen.getByLabelText("Dados da configuração").textContent!).apparelShipping).toBeUndefined();
    expect(screen.getByLabelText("Configuração válida")).toHaveTextContent("true");
  });

  it("retains unknown package tare and allows entering its measured value", () => {
    render(<Editor initial={{ ...defaultShippingConfig, packages: [{ ...registeredPackages[0]!, packagingWeightKg: null }] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar embalagens cadastradas" }));
    const tare = screen.getByRole("spinbutton", { name: "Peso da embalagem vazia (kg)" });
    expect(tare).toHaveValue(null);
    expect(screen.getByText(/não será usada para camisetas enquanto/)).toBeInTheDocument();
    fireEvent.change(tare, { target: { value: "0.005" } });
    expect(JSON.parse(screen.getByLabelText("Dados da configuração").textContent!).apparelShipping.packages[0].packagingWeightKg).toBe(0.005);
    expect(screen.queryByText(/não será usada para camisetas enquanto/)).not.toBeInTheDocument();
  });
});
