import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, Instagram, MapPin, MessageCircle, PackageSearch, Phone } from "lucide-react";
import { INSTAGRAM_URL, WHATSAPP_NUMBER, waLink } from "@/lib/products";
import { business } from "@/lib/business";
import { Button } from "@/components/ui/button";

const MELHOR_RASTREIO_URL = "https://melhorrastreio.com.br/";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#101010] py-10 md:py-14">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.1fr_1fr_1fr] md:px-6">
        <div className="min-w-0">
          <Link to="/" className="inline-flex" aria-label="SW Sports — início">
            <img src="/products/optimized/sw-sports-logo-192.webp" srcSet="/products/optimized/sw-sports-logo-192.webp 192w, /products/optimized/sw-sports-logo-384.webp 384w" sizes="176px" alt="SW Sports" width={384} height={216} loading="lazy" decoding="async" className="h-24 w-44 object-contain" />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Balaclavas SW Sports. Estampas com personalidade, em poliéster com elastano.</p>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>Pagamento seguro via Mercado Pago</p>
            <p>Frete calculado pelo Melhor Envio</p>
          </div>
        </div>

        <div className="min-w-0 text-sm text-muted-foreground">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-foreground"><MapPin className="h-4 w-4 text-brand" />NOSSA LOJA</h2>
          <p className="mb-2 font-medium text-foreground">{business.name}</p>
          <p className="mb-3 text-xs">{business.legalName}<br />CNPJ {business.cnpj}</p>
          <address className="not-italic leading-relaxed">{business.address}<br />{business.city}<br />CEP {business.postalCode}</address>
          <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-brand transition-colors hover:text-foreground">Ver no Google Maps <ArrowUpRight className="h-4 w-4" /></a>
        </div>

        <div className="min-w-0 text-sm text-muted-foreground">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-foreground"><Clock3 className="h-4 w-4 text-brand" />HORÁRIOS</h2>
          <dl className="space-y-3">{business.hours.map(({ days, time }) => (<div key={days}><dt>{days}</dt><dd className="mt-1 text-foreground">{time}</dd></div>))}</dl>
        </div>

        <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
          <h2 className="mb-3 font-display font-bold text-foreground">ATENDIMENTO E POLÍTICAS</h2>
          <a href={`tel:+${WHATSAPP_NUMBER}`} className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-foreground"><Phone className="h-4 w-4 shrink-0 text-brand" />{business.phone}</a>
          <a href={`mailto:${business.email}`} className="inline-flex min-h-11 items-center hover:text-foreground">{business.email}</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-foreground"><Instagram className="h-4 w-4 text-brand" />@swsport.s</a>
          <a href={waLink("Olá, equipe SW Sports! Gostaria de ajuda com uma compra.")} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-whatsapp transition-colors hover:text-whatsapp/80"><MessageCircle className="h-4 w-4 text-whatsapp" />WhatsApp</a>
          <a href={MELHOR_RASTREIO_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-foreground"><PackageSearch className="h-4 w-4 text-brand" />Rastrear pedido</a>
          <a href="/privacidade#privacidade" className="inline-flex min-h-11 items-center hover:text-foreground">Política de Privacidade</a>
          <a href="/privacidade#cookies" className="inline-flex min-h-11 items-center hover:text-foreground">Política de Cookies</a>
          <a href="/privacidade#trocas" className="inline-flex min-h-11 items-center hover:text-foreground">Trocas, Devoluções e Reembolsos</a>
          <a href="/privacidade#entrega" className="inline-flex min-h-11 items-center hover:text-foreground">Política de Entrega</a>
          <a href="/privacidade#termos" className="inline-flex min-h-11 items-center hover:text-foreground">Termos de Uso</a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-border px-4 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
        <span>© {new Date().getFullYear()} SW Sports. Todos os direitos reservados.</span>
        <Button variant="link" size="sm" className="h-auto justify-start p-0 text-sm text-muted-foreground" onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}>Configurações de cookies</Button>
      </div>
    </footer>
  );
}
