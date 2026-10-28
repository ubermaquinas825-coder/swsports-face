import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { productFor, UNIT_PRICE, type Product } from "@/lib/products";
import { trackAddToCart } from "@/lib/advertising";

export type CartItem = { id: string; qty: number };

type CartContextValue = {
  items: CartItem[];
  lines: { product: Product; qty: number }[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (id: string, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "swsports-cart-v1";

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i) => typeof i?.id === "string" && Number.isFinite(i?.qty) && i.qty > 0);
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setItems(readStored()); setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* cart stays in memory */ }
  }, [items, hydrated]);

  const add = useCallback((id: string, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      return existing ? prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i)) : [...prev, { id, qty }];
    });
    const product = productFor(id);
    if (product) {
      trackAddToCart(product, qty, UNIT_PRICE);
      toast("Adicionada ao carrinho", { description: `Balaclava ${product.name}` });
    }
  }, []);

  const remove = useCallback((id: string) => { setItems((prev) => prev.filter((i) => i.id !== id)); }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = items.map((i) => {
      const product = productFor(i.id);
      return product ? { product, qty: i.qty } : null;
    }).filter((l): l is { product: Product; qty: number } => l !== null);
    const count = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.qty * UNIT_PRICE, 0);
    return { items, lines, count, subtotal, isOpen, openCart, closeCart, add, remove, setQty, clear };
  }, [items, isOpen, openCart, closeCart, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
