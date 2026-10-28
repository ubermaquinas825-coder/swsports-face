import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useCart } from "@/hooks/use-cart";
import { reportLovableError } from "@/lib/lovable-error-reporting";

const CartDrawer = lazy(() => import("@/components/CartDrawer").then((module) => ({ default: module.CartDrawer })));

class CartLoadBoundary extends Component<{ children: ReactNode; isOpen: boolean; closeCart: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error) { reportLovableError(error, { boundary: "cart_loading" }); }
  override render() {
    if (!this.state.failed) return this.props.children;
    if (!this.props.isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6" role="dialog" aria-modal="true" aria-label="Carrinho de compras">
        <div className="max-w-sm rounded-xl border border-border bg-popover p-6 text-center">
          <p role="alert">Não foi possível abrir o carrinho. Recarregue a página para tentar novamente.</p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={this.props.closeCart} className="min-h-11 rounded-md border border-border px-4 py-2">Fechar</button>
            <button onClick={() => window.location.reload()} className="min-h-11 rounded-md bg-primary px-4 py-2 text-primary-foreground">Recarregar</button>
          </div>
        </div>
      </div>
    );
  }
}

// Keep the drawer mounted after its first use so freight/CEP state survives
// closing it, without downloading checkout code on the initial storefront visit.
export function DeferredCartDrawer() {
  const { isOpen, closeCart } = useCart();
  const [wasOpened, setWasOpened] = useState(false);
  useEffect(() => { if (isOpen) setWasOpened(true); }, [isOpen]);
  if (!isOpen && !wasOpened) return null;
  return (
    <CartLoadBoundary isOpen={isOpen} closeCart={closeCart}>
    <Suspense fallback={isOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6" role="dialog" aria-modal="true" aria-label="Carrinho de compras">
        <div className="rounded-xl border border-border bg-popover p-6 text-center">
          <p role="status">Abrindo seu carrinho…</p>
          <button onClick={closeCart} className="mt-4 min-h-11 rounded-md border border-border px-5 py-2">Fechar</button>
        </div>
      </div>
    ) : null}>
      <CartDrawer />
    </Suspense>
    </CartLoadBoundary>
  );
}
