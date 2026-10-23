import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Instagram, Menu, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/hooks/use-cart";
import { INSTAGRAM_URL } from "@/lib/products";
import logoAsset from "@/assets/sw-sports-logo.png.asset.json";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Início", to: "/", hash: "" },
  { label: "Coleção", to: "/", hash: "#colecao" },
  { label: "Personalidades", to: "/", hash: "#personalidade" },
  { label: "Atacado", to: "/atacado", hash: "" },
] as const;

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

  const go = (to: "/" | "/atacado", hash: string) => {
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

    if (window.location.pathname === "/" && !hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    navigate({ to: "/", hash: hash.replace(/^#/, "") });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/90 backdrop-blur-[14px]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 md:h-[76px] md:px-6">
        <Link to="/" className="flex min-h-11 items-center gap-2 font-display text-lg font-bold tracking-tight">
          <img
            src={logoAsset.url}
            alt="SW Sports"
            width={453}
            height={255}
            className="h-12 w-28 object-contain md:h-16 md:w-36"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Button
              variant="ghost"
              key={item.label}
              onClick={() => go(item.to, item.hash)}
              className="min-h-11 px-1 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da SW Sports"
            className="hidden h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground sm:grid"
          >
            <Instagram className="h-4 w-4" />
          </a>

          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            aria-label="Abrir carrinho"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-border transition-colors hover:border-brand hover:text-brand"
          >
            <ShoppingBag className="h-4 w-4" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-primary-foreground"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          <Button
            onClick={() => go("/", "#colecao")}
            className="hidden min-h-11 rounded-full bg-brand px-5 text-xs font-bold tracking-wide text-primary-foreground transition-colors hover:bg-brand-deep md:inline-flex"
          >
            COMPRAR
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-full border border-border md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border bg-background/95 backdrop-blur-[14px] md:hidden"
            aria-label="Navegação mobile"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Button
                  variant="ghost"
                  key={item.label}
                  onClick={() => go(item.to, item.hash)}
                  className="min-h-11 justify-start rounded-lg px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
