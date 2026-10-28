import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TechShowcase } from "@/components/TechShowcase";
import { Hero } from "@/components/Hero";
import { products } from "@/lib/products";

const cart = vi.hoisted(() => ({
  add: vi.fn(),
  openCart: vi.fn(),
  isOpen: false,
}));

vi.mock("@/hooks/use-cart", () => ({ useCart: () => cart }));

type DecodeRequest = {
  image: HTMLImageElement;
  resolve: () => void;
  reject: (reason: Error) => void;
};

const initialIndex = products.findIndex((product) => product.id === "sorriso-grisalho");
const nextIndex = (initialIndex + 1) % products.length;
let reducedMotion = false;
let visible = true;
let intersecting = true;
let decodeImmediately = true;
let decodeRequests: DecodeRequest[] = [];
let motionListeners: Set<(event: MediaQueryListEvent) => void>;
let observers: { callback: IntersectionObserverCallback; target?: Element }[];

async function advance(ms = 6000) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

function expectSelected(index: number) {
  expect(screen.getByRole("combobox", { name: "Escolher estampa" })).toHaveValue(String(index));
  expect(screen.getByRole("img", {
    name: `Balaclava ${products[index].name} no modelo de referência da SW Sports`,
  })).toHaveAttribute("src", expect.stringContaining(`/products/optimized/${products[index].id}-`));
}

function setIntersection(value: boolean) {
  intersecting = value;
  act(() => {
    for (const observer of observers) {
      observer.callback([{
        target: observer.target,
        isIntersecting: value,
        intersectionRatio: value ? 1 : 0,
      } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  cart.add.mockReset();
  cart.openCart.mockReset();
  cart.isOpen = false;
  reducedMotion = false;
  visible = true;
  intersecting = true;
  decodeImmediately = true;
  decodeRequests = [];
  motionListeners = new Set();
  observers = [];
  vi.spyOn(document, "hidden", "get").mockImplementation(() => !visible);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visible ? "visible" : "hidden");
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return query.includes("prefers-reduced-motion") && reducedMotion; },
    media: query,
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => motionListeners.add(listener),
    removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => motionListeners.delete(listener),
  }));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { observers.push({ callback }); }
    observe(target: Element) {
      const observer = observers[observers.length - 1];
      observer.target = target;
      observer.callback([{
        target, isIntersecting: intersecting, intersectionRatio: intersecting ? 1 : 0,
      } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    disconnect() {}
    unobserve() {}
  });
  vi.stubGlobal("Image", function () {
    const image = document.createElement("img");
    image.decode = () => new Promise<void>((resolve, reject) => {
      decodeRequests.push({ image, resolve, reject });
      if (decodeImmediately) resolve();
    });
    return image;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Premium product showcase", () => {
  it("advances after six seconds without preloading the full collection", async () => {
    render(<TechShowcase />);
    await flush();
    expectSelected(initialIndex);
    expect(decodeRequests.length).toBeLessThanOrEqual(1);
    await advance(5999);
    expectSelected(initialIndex);
    await advance(1);
    expectSelected(nextIndex);
    expect(decodeRequests.length).toBeLessThanOrEqual(2);
  });

  it("waits for a decoded image and retains the visible SKU if it cannot load", async () => {
    decodeImmediately = false;
    render(<TechShowcase />);
    await advance();
    expectSelected(initialIndex);
    expect(decodeRequests).toHaveLength(1);
    await act(async () => { decodeRequests[0].reject(new Error("Image unavailable")); });
    expectSelected(initialIndex);
    fireEvent.click(screen.getByRole("button", { name: "COMPRAR ESTA ESTAMPA" }));
    expect(cart.add).toHaveBeenCalledWith(products[initialIndex].id);
    expect(cart.openCart).toHaveBeenCalledOnce();
  });

  it("keeps a manually chosen print and buys that print until rotation is explicitly resumed", async () => {
    render(<TechShowcase />);
    const chosen = products.findIndex((product) => product.id === "bigode-branco");
    fireEvent.change(screen.getByRole("combobox", { name: "Escolher estampa" }), { target: { value: String(chosen) } });
    await flush();
    expectSelected(chosen);
    await advance(18000);
    expectSelected(chosen);
    fireEvent.click(screen.getByRole("button", { name: "COMPRAR ESTA ESTAMPA" }));
    expect(cart.add).toHaveBeenCalledWith(products[chosen].id);
    expect(screen.getByRole("button", { name: "Reproduzir apresentação" })).toBeInTheDocument();
  });

  it("pauses when keyboard focus enters and restarts only after explicit Play", async () => {
    render(<TechShowcase />);
    const select = screen.getByRole("combobox", { name: "Escolher estampa" });
    act(() => select.focus());
    act(() => select.blur());
    await advance(18000);
    expectSelected(initialIndex);
    fireEvent.click(screen.getByRole("button", { name: "Reproduzir apresentação" }));
    await advance();
    expectSelected(nextIndex);
  });

  it("cancels a pending automatic change when paused before decoding finishes", async () => {
    decodeImmediately = false;
    render(<TechShowcase />);
    await advance();
    fireEvent.click(screen.getByRole("button", { name: "Pausar apresentação" }));
    await act(async () => { decodeRequests[0].resolve(); });
    expectSelected(initialIndex);
    await advance(18000);
    expectSelected(initialIndex);
  });

  it("does not resume automatic changes before a pending manual selection is ready", async () => {
    decodeImmediately = false;
    render(<TechShowcase />);
    const chosen = products.findIndex((product) => product.id === "bigode-branco");
    fireEvent.change(screen.getByRole("combobox", { name: "Escolher estampa" }), { target: { value: String(chosen) } });
    expect(screen.getByRole("button", { name: "COMPRAR ESTA ESTAMPA" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reproduzir apresentação" }));
    await advance();
    await act(async () => { decodeRequests[0].resolve(); });
    expectSelected(initialIndex);
    await act(async () => { decodeRequests[1].resolve(); });
    expectSelected(chosen);
    expect(screen.getByRole("button", { name: "COMPRAR ESTA ESTAMPA" })).toBeEnabled();
  });

  it("keeps the last manual choice when earlier image decodes finish later", async () => {
    decodeImmediately = false;
    render(<TechShowcase />);
    const firstChoice = products.findIndex((product) => product.id === "bigode-branco");
    const lastChoice = products.findIndex((product) => product.id === "grisalho-sorridente");
    const select = screen.getByRole("combobox", { name: "Escolher estampa" });
    fireEvent.change(select, { target: { value: String(firstChoice) } });
    fireEvent.change(select, { target: { value: String(lastChoice) } });
    await act(async () => { decodeRequests[2].resolve(); });
    expectSelected(lastChoice);
    await act(async () => { decodeRequests[1].resolve(); });
    expectSelected(lastChoice);
    fireEvent.click(screen.getByRole("button", { name: "COMPRAR ESTA ESTAMPA" }));
    expect(cart.add).toHaveBeenCalledWith(products[lastChoice].id);
  });

  it("does not rotate off screen and gives a full interval when the card returns", async () => {
    render(<TechShowcase />);
    setIntersection(false);
    await advance(18000);
    expectSelected(initialIndex);
    setIntersection(true);
    await advance(5999);
    expectSelected(initialIndex);
    await advance(1);
    expectSelected(nextIndex);
  });

  it("does not rotate in a hidden tab or catch up when the tab becomes visible", async () => {
    render(<TechShowcase />);
    visible = false;
    fireEvent(document, new Event("visibilitychange"));
    await advance(18000);
    expectSelected(initialIndex);
    visible = true;
    fireEvent(document, new Event("visibilitychange"));
    await advance(5999);
    expectSelected(initialIndex);
    await advance(1);
    expectSelected(nextIndex);
  });

  it("suspends rotation while the cart is open", async () => {
    cart.isOpen = true;
    const view = render(<TechShowcase />);
    await advance(18000);
    expectSelected(initialIndex);
    cart.isOpen = false;
    view.rerender(<TechShowcase />);
    await advance();
    expectSelected(nextIndex);
  });

  it("respects reduced motion while keeping manual navigation available", async () => {
    reducedMotion = true;
    render(<TechShowcase />);
    await advance(18000);
    expectSelected(initialIndex);
    fireEvent.click(screen.getByRole("button", { name: "Próxima estampa" }));
    await flush();
    expectSelected(nextIndex);
    await advance(18000);
    expectSelected(nextIndex);
  });

  it("stops automatic changes if reduced motion is enabled during the visit", async () => {
    render(<TechShowcase />);
    reducedMotion = true;
    act(() => {
      for (const listener of motionListeners) listener({ matches: true } as MediaQueryListEvent);
    });
    await advance(18000);
    expectSelected(initialIndex);
  });
});

describe("Campaign landing hero", () => {
  function expectHeroProduct(index: number) {
    expect(screen.getByRole("img", {
      name: `Balaclava ${products[index]!.name} da SW Sports, vista de frente`,
    })).toBeInTheDocument();
  }

  it("does not decode or rotate more images while the hero is off screen", async () => {
    intersecting = false;
    render(<Hero />);
    await advance(18000);
    expectHeroProduct(initialIndex);
    expect(decodeRequests).toHaveLength(0);
    setIntersection(true);
    await advance(4500);
    expectHeroProduct(nextIndex);
  });

  it("honors reduced motion instead of downloading automatic slides", async () => {
    reducedMotion = true;
    render(<Hero />);
    await advance(18000);
    expectHeroProduct(initialIndex);
    expect(decodeRequests).toHaveLength(0);
  });

  it("keeps the current image visible when the next photo fails to decode", async () => {
    decodeImmediately = false;
    render(<Hero />);
    await advance(4500);
    expectHeroProduct(initialIndex);
    await act(async () => { decodeRequests[0]!.reject(new Error("Offline")); });
    await advance(9000);
    expectHeroProduct(initialIndex);
    expect(decodeRequests).toHaveLength(1);
  });
});
