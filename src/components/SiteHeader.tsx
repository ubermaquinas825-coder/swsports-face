import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Instagram, Menu, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/hooks/use-cart";
import { INSTAGRAM_URL } from "@/lib/products";

const NAV = [
  { label: "Início", to: "/", hash: "" },
  { label: "Coleção", to: "/", hash: "#colecao" },
  { label: "Kits", to: "/", hash: "#kits" },
  { label: "Atacado", to: "/atacado", hash: "" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (to: string, hash: string) => {
    setMenuOpen(false);
    if (to !== "/") {
      navigate({ to });
      return;
    }
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    navigate({ to: "/" });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-black/70 backdrop-blur-[16px]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-[76px] md:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            SW
          </span>
          <span>
            SW<span className="text-brand"> SPORTS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.to, item.hash)}
              className="transition-colors hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da SW Sports"
            className="hidden h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-white sm:grid"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <button
            onClick={openCart}
            aria-label="Abrir carrinho"
            className="relative grid h-9 w-9 place-items-center rounded-full border border-border transition-colors hover:border-brand hover:text-brand"
          >
            <ShoppingBag className="h-4 w-4" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => go("/", "#colecao")}
            className="hidden rounded-full bg-brand px-4 py-2 text-xs font-bold tracking-wide text-white transition-colors hover:bg-brand-deep md:block"
          >
            COMPRAR
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            className="grid h-9 w-9 place-items-center rounded-full border border-border md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border bg-black/90 backdrop-blur-[16px] md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item.to, item.hash)}
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-card hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
