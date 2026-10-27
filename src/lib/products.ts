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

export function productFor(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type OrderLine = { product: Product; qty: number };

export function buildOrderMessage(lines: OrderLine[]): string {
  const code = `SW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const total = lines.reduce((sum, l) => sum + l.qty * UNIT_PRICE, 0);
  const items = lines
    .map((l) => `${l.qty}x Balaclava ${l.product.name} — ${formatBRL(UNIT_PRICE)}`)
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
