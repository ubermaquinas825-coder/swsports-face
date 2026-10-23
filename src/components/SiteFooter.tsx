import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { INSTAGRAM_URL, WHATSAPP_NUMBER, waLink } from "@/lib/products";
import { business } from "@/lib/business";
import logoAsset from "@/assets/sw-sports-logo.png.asset.json";
import { Button } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.1fr_1fr_1fr] md:px-6">
        <div className="min-w-0">
          <Link to="/" className="inline-flex" aria-label="SW Sports — início">
            <img src={logoAsset.url} alt="SW Sports Uniformes" width={453} height={255} className="h-24 w-44 object-contain" />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Balaclavas divertidas com estampas realistas. Uma nova personalidade por{" "}
            R$ 49,90.
          </p>
        </div>
        <div className="min-w-0 text-sm text-muted-foreground">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-foreground"><MapPin className="h-4 w-4 text-brand" /> NOSSA LOJA</h2>
          <p className="mb-3 font-medium text-foreground">{business.name}</p>
          <address className="not-italic leading-relaxed">
            {business.address}<br />{business.city}<br />CEP {business.postalCode}
          </address>
          <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-brand transition-colors hover:text-foreground">
            Ver no Google Maps <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="min-w-0 text-sm text-muted-foreground">
          <h2 className="mb-4 flex items-center gap-2 font-display font-bold text-foreground"><Clock3 className="h-4 w-4 text-brand" /> HORÁRIOS</h2>
          <dl className="space-y-3">
            {business.hours.map(({ days, time }) => (
              <div key={days}><dt>{days}</dt><dd className="mt-1 text-foreground">{time}</dd></div>
            ))}
          </dl>
        </div>
        <div className="flex min-w-0 flex-col gap-3 text-sm text-muted-foreground">
          <h2 className="mb-1 font-display font-bold text-foreground">FALE COM A SW SPORTS</h2>
          <a href={`tel:+${WHATSAPP_NUMBER}`} className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
            <Phone className="h-4 w-4 shrink-0 text-brand" /> {business.phone}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Instagram className="h-4 w-4 text-brand" /> @swsport.s
          </a>
          <a
            href={waLink(
              "Olá, equipe SW Sports!\n\nGostaria de mais informações sobre as balaclavas.",
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4 text-brand" /> WhatsApp comercial
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border px-4 pt-6 text-xs text-muted-foreground md:px-6">
        © {new Date().getFullYear()} SW Sports. Todos os direitos reservados.
        <Link to="/frete-envios" className="ml-4 inline-block transition-colors hover:text-foreground">Área administrativa</Link>
        <Link to="/privacidade" className="ml-4 inline-block transition-colors hover:text-foreground">Privacidade</Link>
        <Button variant="link" size="sm" onClick={() => window.dispatchEvent(new Event("sw-cookie-settings"))}>Configurações de cookies</Button>
      </div>
    </footer>
  );
}
