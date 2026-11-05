import type { ImgHTMLAttributes } from "react";
import type { Product } from "@/lib/products";

type ProductImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height"
> & {
  product: Pick<Product, "id" | "name"> & Partial<Pick<Product, "category" | "image" | "size">>;
  variant?: "responsive" | "thumbnail";
};

/** Balaclava selectors use the optimized thumbnail instead of the full-size photo. */
export function ProductImage({
  product,
  variant = "responsive",
  alt = product.category === "camiseta" ? `${product.name} — tamanho ${product.size}` : `Balaclava ${product.name}`,
  sizes = "(min-width: 1024px) 360px, (min-width: 375px) 45vw, 90vw",
  loading = "lazy",
  decoding = "async",
  ...props
}: ProductImageProps) {
  if (product.category === "camiseta") {
    return <img {...props} src={product.image} alt={alt} width={800} height={800}
      loading={loading} decoding={decoding} sizes={sizes} />;
  }
  const base = `/products/optimized/${product.id}`;
  if (variant === "thumbnail") {
    return (
      <img
        {...props}
        src={`${base}-96.webp`}
        alt={alt}
        width={96}
        height={96}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  return (
    <img
      {...props}
      src={`${base}-400.webp`}
      srcSet={`${base}-400.webp 400w, ${base}-800.webp 800w`}
      sizes={sizes}
      alt={alt}
      width={800}
      height={600}
      loading={loading}
      decoding={decoding}
    />
  );
}
