import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Ruler, Shirt, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatBRL, shirtModels, shirtVariantFor, type ShirtGalleryImage, type ShirtModel } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ShirtPhoto({ model, photo = null, eager = false }: { model: ShirtModel; photo?: ShirtGalleryImage | null; eager?: boolean }) {
  const source = photo?.src ?? model.image ?? model.gallery[0]?.src;
  if (source) {
    return <img src={source} alt={photo?.alt ?? model.name} width={800} height={800}
      loading={eager ? "eager" : "lazy"} decoding="async"
      className="h-full w-full object-contain p-5 transition-transform duration-300 motion-safe:group-hover:scale-[1.025]" />;
  }
  return <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
    <Shirt aria-hidden className="h-20 w-20 stroke-[1] text-white/20 sm:h-24 sm:w-24" />
    <span className="text-xs leading-5 text-muted-foreground">Foto do modelo em atualização</span>
  </div>;
}

function ShirtGallery({ model }: { model: ShirtModel }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const photos = model.gallery.length > 0 ? model.gallery : model.image
    ? [{ src: model.image, alt: model.name, label: "Foto do modelo" }]
    : [];
  const selectedPhoto = photos[activeIndex] ?? null;

  return <div className="min-w-0 bg-[#141414] p-4 sm:p-5">
    <figure>
      <div className="aspect-square overflow-hidden rounded-lg bg-[#181818]">
        <ShirtPhoto model={model} photo={selectedPhoto} eager />
      </div>
      {selectedPhoto && <figcaption aria-live="polite" className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground">
        <span>{selectedPhoto.label}</span><span>{activeIndex + 1} de {photos.length}</span>
      </figcaption>}
    </figure>
    {photos.length > 1 && <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Fotos de ${model.name}`}>
      {photos.map((photo, index) => <button key={photo.src} type="button" aria-label={`Ver foto: ${photo.label}`}
        aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)}
        className={`flex min-h-20 w-20 flex-col items-center overflow-hidden rounded-md border bg-[#181818] transition-colors ${activeIndex === index ? "border-brand" : "border-white/15 hover:border-white/50"}`}>
        <img src={photo.src} alt="" width={72} height={64} loading="lazy" decoding="async" className="h-14 w-full object-contain p-1" />
        <span className="max-w-full px-1 pb-1 text-[10px] leading-4 text-white/70">{photo.label}</span>
      </button>)}
    </div>}
  </div>;
}

function ShirtSizeChart({ model }: { model: ShirtModel }) {
  if (!model.sizeChart?.length) return null;
  return <details className="mt-5 rounded-lg border border-white/15 px-4 py-3">
    <summary className="min-h-7 cursor-pointer text-sm font-semibold marker:text-brand">
      <span className="ml-1 inline-flex items-center gap-2"><Ruler aria-hidden className="h-4 w-4 text-brand" />Tabela de medidas</span>
    </summary>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs leading-5 sm:text-sm">
        <caption className="mb-3 text-left text-xs leading-5 text-muted-foreground">Medidas da peça em centímetros: largura do peito e altura.</caption>
        <thead><tr className="border-b border-white/15 text-white/75">
          <th scope="col" className="py-2 pr-3 font-semibold">Tamanho</th>
          <th scope="col" className="px-2 py-2 font-semibold">Peito (cm)</th>
          <th scope="col" className="py-2 pl-2 font-semibold">Altura (cm)</th>
        </tr></thead>
        <tbody>{model.sizeChart.map((measurement) => <tr key={measurement.size} className="border-b border-white/10 last:border-0">
          <th scope="row" className="py-2 pr-3 font-semibold">{measurement.size}{!model.sizes.includes(measurement.size) && <span className="block text-[10px] font-normal leading-4 text-muted-foreground">Indisponível</span>}</th>
          <td className="px-2 py-2 text-white/75">{measurement.widthCm}</td>
          <td className="py-2 pl-2 text-white/75">{measurement.heightCm}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </details>;
}

function ShirtPurchase({ model, onAdded }: { model: ShirtModel; onAdded: () => void }) {
  const [size, setSize] = useState("");
  const { add, openCart } = useCart();
  const variant = shirtVariantFor(model, size);

  return <div className="mt-6">
    {model.sizes.length > 0 ? <fieldset>
      <legend className="mb-3 text-sm font-semibold">Escolha seu tamanho</legend>
      <div className="flex flex-wrap gap-2">
        {model.sizes.map((value) => <label key={value} className="relative cursor-pointer">
          <input type="radio" name={`size-${model.id}`} value={value} checked={size === value}
            onChange={() => setSize(value)} className="peer sr-only" />
          <span className="inline-flex min-h-11 min-w-12 items-center justify-center rounded-md border border-white/20 px-3 text-sm font-bold transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">{value}</span>
        </label>)}
      </div>
    </fieldset> : <p className="text-sm text-muted-foreground">Tamanhos em atualização.</p>}
    <Button type="button" disabled={!variant} className="mt-5 min-h-12 w-full rounded-md font-bold shadow-none"
      onClick={() => {
        if (!variant) return;
        add(variant.id);
        onAdded();
        openCart();
      }}>
      <ShoppingBag aria-hidden className="h-4 w-4" />
      {model.checkoutReady ? size ? "ADICIONAR AO CARRINHO" : "ESCOLHA UM TAMANHO" : "EM BREVE"}
    </Button>
    {!model.checkoutReady && <p className="mt-3 text-xs leading-5 text-muted-foreground">Este modelo ainda não está disponível para compra no site.</p>}
  </div>;
}

export function ShirtCollection({ featured = false }: { featured?: boolean }) {
  const [selected, setSelected] = useState<ShirtModel | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  return <>
    <section id="camisetas" aria-labelledby="shirts-title" className="scroll-mt-24 border-b border-border bg-[#0d0d0d] py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-brand">{featured ? "NOVA COLEÇÃO · CAMISETAS" : "OS MODELOS"}</p>
            <h2 id="shirts-title" className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">Manga longa. Proteção UV 50+.</h2>
          </div>
          {featured ? <Link to="/camisetas" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold transition-colors hover:text-brand">
            Conhecer as camisetas <ArrowRight aria-hidden className="h-4 w-4" />
          </Link> : <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Camisas iFood para entregadores.<br />Três referências para escolher.</p>}
        </div>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {shirtModels.map((model) => <article key={model.id} className="group flex min-w-0 flex-col">
            <button type="button" onClick={(event) => { opener.current = event.currentTarget; setSelected(model); }} aria-label={`Ver detalhes de ${model.name}`}
              className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#141414] transition-colors hover:border-brand/40">
              <ShirtPhoto model={model} />
              <span className="absolute left-4 top-4 rounded-full border border-brand/30 bg-[#141414] px-3 py-1 text-[11px] font-bold tracking-wider text-brand">UV 50+</span>
              <span className="absolute bottom-4 right-4 text-[11px] font-semibold tracking-wider text-white/50">REF. {model.reference}</span>
            </button>
            <div className="flex flex-1 flex-col pt-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">DRYSPORT · MANGA LONGA · UNISSEX</p>
              <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{model.name}</h3>
              <p className="mt-3 font-display text-2xl font-bold tracking-tight text-brand">{formatBRL(model.priceCents / 100)}</p>
              <Button type="button" variant="outline" onClick={(event) => { opener.current = event.currentTarget; setSelected(model); }} className="mt-5 min-h-12 w-full rounded-md font-bold">
                VER MODELO <ArrowRight aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
      {selected && <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }} className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-md gap-0 overflow-y-auto rounded-2xl border-white/10 bg-[#0d0d0d] p-0 text-white sm:max-w-2xl lg:max-w-5xl">
        <div className="grid min-w-0 lg:grid-cols-2">
        <ShirtGallery key={selected.id} model={selected} />
        <div className="min-w-0 p-5 sm:p-7">
          <DialogHeader className="text-left">
            <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-brand">CAMISETAS UV 50+</p>
            <DialogTitle className="font-display text-2xl font-bold leading-tight sm:text-3xl">{selected.name}</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-6 text-muted-foreground">{selected.description}</DialogDescription>
          </DialogHeader>
          <p className="mt-5 font-display text-3xl font-bold text-brand">{formatBRL(selected.priceCents / 100)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-white/10 py-4 text-xs leading-5 sm:text-sm">
            <div><dt className="text-muted-foreground">Referência</dt><dd className="mt-1 font-semibold">{selected.reference}</dd></div>
            {selected.features.map(({ label, value }) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
          </dl>
          <ShirtPurchase key={selected.id} model={selected} onAdded={() => setSelected(null)} />
          <ShirtSizeChart model={selected} />
        </div>
        </div>
      </DialogContent>}
    </Dialog>
  </>;
}
