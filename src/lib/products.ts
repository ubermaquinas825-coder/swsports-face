import gatoAsset from "@/assets/gato-divertido.png.asset.json";
import bebeAsset from "@/assets/bebe-chupeta.png.asset.json";
import beijoAsset from "@/assets/boca-de-beijo.png.asset.json";
import velhinhoAsset from "@/assets/velhinho-bigodudo.png.asset.json";
import vovoAsset from "@/assets/vovo-rebelde.png.asset.json";
import banguelaAsset from "@/assets/sorriso-banguela.png.asset.json";

export const BRAND = "SW Sports";
export const WHATSAPP_NUMBER = "5534984350833";
export const INSTAGRAM_URL = "https://www.instagram.com/swsport.s/";
export const UNIT_PRICE = 49.9;

export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  category?: "balaclava" | "camiseta";
  priceCents?: number;
  size?: string;
};

export const products: Product[] = [
  {
    id: "velhinho-bigodudo",
    name: "Velhinho Bigodudo",
    description: "Bigode branco de respeito e cara de quem cobra a conta no bar.",
    image: velhinhoAsset.url,
  },
  {
    id: "boca-de-beijo",
    name: "Boca de Beijo",
    description: "Boca estalada e carinha de quem vive o momento.",
    image: beijoAsset.url,
  },
  {
    id: "vovo-rebelde",
    name: "Vovó Rebelde",
    description: "Cabelo grisalho, mau humor e um cigarro no canto da boca.",
    image: vovoAsset.url,
  },
  {
    id: "sorriso-banguela",
    name: "Sorriso Banguela",
    description: "Sorriso largo de quem não tem um dente na boca — e não se importa.",
    image: banguelaAsset.url,
  },
  {
    id: "gato-divertido",
    name: "Gato Divertido",
    description: "Bigodes, focinho e cara de gato pedindo carinho.",
    image: gatoAsset.url,
  },
  {
    id: "bebe-chupeta",
    name: "Bebê com Chupeta",
    description: "Cara de bebê rabugento com chupeta azul de ursinho.",
    image: bebeAsset.url,
  },
  {
    id: "sorriso-grisalho",
    name: "Sorriso Grisalho",
    description: "Estampa de rosto com cabelos grisalhos e sorriso banguela.",
    image: "/products/balaclavas/sorriso-grisalho.jpeg",
  },
  {
    id: "grisalho-com-charuto",
    name: "Grisalho com Charuto",
    description: "Estampa de rosto grisalho, bigode e charuto no canto da boca.",
    image: "/products/balaclavas/grisalho-com-charuto.jpeg",
  },
  {
    id: "bigodudo-irreverente",
    name: "Bigodudo Irreverente",
    description: "Estampa de bigode branco, língua de fora e expressão irreverente.",
    image: "/products/balaclavas/bigodudo-irreverente.jpeg",
  },
  {
    id: "sorriso-rebelde",
    name: "Sorriso Rebelde",
    description: "Estampa de cabelos grisalhos, sorriso e cigarro no canto da boca.",
    image: "/products/balaclavas/sorriso-rebelde.jpeg",
  },
  {
    id: "bigode-branco",
    name: "Bigode Branco",
    description: "Estampa de rosto com bigode branco e charuto.",
    image: "/products/balaclavas/bigode-branco.jpeg",
  },
  {
    id: "grisalho-sorridente",
    name: "Grisalho Sorridente",
    description: "Estampa de cabelos claros, sorriso e cigarro no canto da boca.",
    image: "/products/balaclavas/grisalho-sorridente.jpeg",
  },
];

export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export type ShirtGalleryImage = { src: string; alt: string; label: string };
export type ShirtSizeMeasurement = { size: string; widthCm: number; heightCm: number };

export type ShirtModel = {
  id: string;
  reference: string;
  name: string;
  description: string;
  priceCents: number;
  image: string | null;
  gallery: ShirtGalleryImage[];
  sizes: string[];
  sizeChart: ShirtSizeMeasurement[] | null;
  features: { label: string; value: string }[];
  sourceUrl: string;
  // Enable only after sizes, original photos, internal stock SKUs and shipping are confirmed.
  checkoutReady: boolean;
};

// Product data and measurements confirmed from the owner's listing screenshots.
// Original image files, measured shipping and stock SKUs are confirmed separately.
const shirtSizeChart: ShirtSizeMeasurement[] = [
  { size: "PP", widthCm: 49, heightCm: 66 },
  { size: "P", widthCm: 50, heightCm: 68 },
  { size: "M", widthCm: 52, heightCm: 70 },
  { size: "G", widthCm: 55, heightCm: 76 },
  { size: "GG", widthCm: 57, heightCm: 79 },
  { size: "XG", widthCm: 60, heightCm: 80 },
  { size: "XGG", widthCm: 62, heightCm: 84 },
];
const commonShirtFeatures = [
  { label: "Marca", value: "SW SPORTS" },
  { label: "Tecido", value: "DrySport" },
  { label: "Modelo", value: "Unissex" },
  { label: "Manga", value: "Longa" },
  { label: "Proteção solar", value: "UV 50+" },
];

export const shirtModels: ShirtModel[] = [
  {
    id: "camisa-ifood-ref-02",
    reference: "02",
    name: "Camisa iFood Entregador — Ref. 02",
    description: "Camisa iFood SW SPORTS em vermelho, preto e branco, com manga longa, gola com zíper e caimento slim. Tecido DrySport e proteção solar UV 50+ para a rotina de entregas e o uso diário. Modelo unissex.",
    priceCents: 7990,
    image: "/products/camisetas/ref-02-frente.png",
    gallery: [
      { src: "/products/camisetas/ref-02-frente.png", alt: "Camisa iFood Ref. 02 vermelha, preta e branca, vista de frente", label: "Frente" },
      { src: "/products/camisetas/ref-02-costas.png", alt: "Camisa iFood Ref. 02 vermelha, preta e branca, vista de costas", label: "Costas" },
      { src: "/products/camisetas/ref-02-modelo-frente.png", alt: "Camisa iFood Ref. 02 vestida por modelo, vista de frente", label: "No modelo" },
      { src: "/products/camisetas/ref-02-uso.png", alt: "Camisa iFood Ref. 02 em uso", label: "Em uso" },
      { src: "/products/camisetas/ref-02-detalhe-gola.png", alt: "Detalhe da gola com zíper da camisa iFood Ref. 02", label: "Gola" },
    ],
    sizes: ["PP", "P", "M", "G", "GG", "XG", "XGG"],
    sizeChart: null,
    features: [
      ...commonShirtFeatures,
      { label: "Cores", value: "Vermelho, preto e branco" },
      { label: "Gola", value: "Com zíper" },
      { label: "Caimento", value: "Slim" },
    ],
    sourceUrl: "https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-02-protecao-uv50/up/MLBU4740694356",
    checkoutReady: false,
  },
  {
    id: "camisa-ifood-ref-03",
    reference: "03",
    name: "Camisa iFood Entregador — Ref. 03",
    description: "Camisa iFood SW SPORTS com estampa diagonal em vermelho, preto e branco e gola com zíper. Manga longa em tecido DrySport, com proteção solar UV 50+ para acompanhar a rotina de entregas e o uso diário. Modelo unissex.",
    priceCents: 7990,
    image: "/products/camisetas/ref-03-frente.png",
    gallery: [
      { src: "/products/camisetas/ref-03-frente.png", alt: "Camisa iFood Ref. 03 com estampa diagonal vermelha, preta e branca, vista de frente", label: "Frente" },
      { src: "/products/camisetas/ref-03-costas.png", alt: "Camisa iFood Ref. 03 com estampa diagonal vermelha, preta e branca, vista de costas", label: "Costas" },
    ],
    sizes: ["P", "M", "G", "GG", "XG", "XGG"],
    sizeChart: shirtSizeChart.map((measurement) => ({ ...measurement })),
    features: [
      ...commonShirtFeatures,
      { label: "Cores", value: "Vermelho, preto e branco" },
      { label: "Estampa", value: "Diagonal" },
      { label: "Gola", value: "Com zíper" },
    ],
    sourceUrl: "https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-03-protecao-uv50/up/MLBU4714185455",
    checkoutReady: false,
  },
  {
    id: "camisa-ifood-ref-01",
    reference: "01",
    name: "Camisa iFood Entregador — Ref. 01",
    description: "Camisa iFood SW SPORTS em preto e branco, com gola com zíper e manga longa. Tecido DrySport e proteção solar UV 50+ para a rotina de entregas e o uso diário. Modelo unissex.",
    priceCents: 7990,
    image: "/products/camisetas/ref-01-frente.png",
    gallery: [
      { src: "/products/camisetas/ref-01-frente.png", alt: "Camisa iFood Ref. 01 preta e branca, vista de frente", label: "Frente" },
      { src: "/products/camisetas/ref-01-costas.png", alt: "Camisa iFood Ref. 01 preta e branca, vista de costas", label: "Costas" },
      { src: "/products/camisetas/ref-01-modelo-frente.png", alt: "Camisa iFood Ref. 01 vestida por modelo, vista de frente", label: "No modelo" },
      { src: "/products/camisetas/ref-01-modelo-lateral.png", alt: "Camisa iFood Ref. 01 vestida por modelo, vista lateral", label: "Lateral" },
      { src: "/products/camisetas/ref-01-detalhe.png", alt: "Detalhe da camisa iFood Ref. 01 preta e branca", label: "Detalhe" },
    ],
    sizes: ["PP", "P", "M", "G", "GG", "XG", "XGG"],
    sizeChart: shirtSizeChart.map((measurement) => ({ ...measurement })),
    features: [
      ...commonShirtFeatures,
      { label: "Cores", value: "Preto e branco" },
      { label: "Gola", value: "Com zíper" },
    ],
    sourceUrl: "https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-01-protecao-uv50/up/MLBU4741204286",
    checkoutReady: false,
  },
];

export function shirtVariantFor(model: ShirtModel, size: string): Product | undefined {
  const normalizedSizes = model.sizes.map((value) => value.trim().toLowerCase());
  if (!model.checkoutReady || !model.image?.trim() || !size.trim() || size !== size.trim()
    || model.sizes.some((value) => !value.trim() || value !== value.trim())
    || new Set(normalizedSizes).size !== normalizedSizes.length || !model.sizes.includes(size)
    || !Number.isSafeInteger(model.priceCents) || model.priceCents <= 0) return;
  return {
    id: `${model.id}-${encodeURIComponent(size.toLowerCase())}`,
    name: model.name,
    description: model.description,
    image: model.image,
    category: "camiseta",
    priceCents: model.priceCents,
    size,
  };
}

export const purchasableProducts: Product[] = [
  ...products,
  ...shirtModels.flatMap((model) => model.sizes.flatMap((size) => {
    const variant = shirtVariantFor(model, size);
    return variant ? [variant] : [];
  })),
];

export function productFor(id: string): Product | undefined {
  return purchasableProducts.find((p) => p.id === id);
}

export function unitPriceCents(product: Product): number {
  const cents = product.category === "camiseta" ? product.priceCents : Math.round(UNIT_PRICE * 100);
  if (!Number.isSafeInteger(cents) || cents === undefined || cents <= 0) {
    throw new Error("Preço do produto não confirmado.");
  }
  return cents;
}

export function productTitle(product: Pick<Product, "name" | "category" | "size">): string {
  return product.category === "camiseta"
    ? `${product.name}${product.size ? ` · Tamanho ${product.size}` : ""}`
    : `Balaclava ${product.name}`;
}

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type OrderLine = { product: Product; qty: number };

export function buildOrderMessage(lines: OrderLine[]): string {
  const code = `SW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const total = lines.reduce((sum, l) => sum + l.qty * unitPriceCents(l.product) / 100, 0);
  const items = lines
    .map((l) => `${l.qty}x ${productTitle(l.product)} — ${formatBRL(unitPriceCents(l.product) / 100)}`)
    .join("\n");
  return [
    "Olá, equipe SW Sports!",
    "",
    "Gostaria de realizar o seguinte pedido:",
    "",
    `Pedido ${code}`,
    "",
    items,
    "",
    `Total dos produtos: ${formatBRL(total)}`,
    "",
    "Podem confirmar a disponibilidade e o valor do frete?",
  ].join("\n");
}
