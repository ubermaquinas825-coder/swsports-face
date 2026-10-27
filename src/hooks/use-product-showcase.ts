import { useCallback, useEffect, useRef, useState } from "react";
import { products } from "@/lib/products";

export const SHOWCASE_IMAGE_SIZES =
  "(min-width: 1280px) 600px, (min-width: 1024px) 45vw, calc(100vw - 32px)";

const SLIDE_INTERVAL = 6000;
const FADE_DURATION = 420;

type ProductShowcaseOptions = {
  uninterruptedAutoplay?: boolean;
  intervalMs?: number;
};

export function useProductShowcase(
  cartOpen: boolean,
  options: ProductShowcaseOptions = {},
) {
  const uninterruptedAutoplay = options.uninterruptedAutoplay ?? false;
  const intervalMs = options.intervalMs ?? SLIDE_INTERVAL;
  const [selected, setSelected] = useState(() =>
    Math.max(0, products.findIndex((item) => item.id === "sorriso-grisalho")),
  );
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const requestVersion = useRef(0);
  const prepared = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    const requests = requestVersion;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setMotionAllowed(!preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      requests.current++;
    };
  }, []);

  useEffect(() => {
    if (!cardRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: 0.25 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Decode only the requested responsive photo; never preload the whole catalog.
  const prepare = useCallback((index: number) => {
    const product = products[index];
    const key = `${product.id}:${window.innerWidth}:${window.devicePixelRatio}`;
    const cached = prepared.current.get(key);
    if (cached) return cached;
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.sizes = SHOWCASE_IMAGE_SIZES;
    image.srcset = `/products/optimized/${product.id}-400.webp 400w, /products/optimized/${product.id}-800.webp 800w`;
    image.src = `/products/optimized/${product.id}-400.webp`;
    const ready = image.decode().catch((error: unknown) => {
      prepared.current.delete(key);
      throw error;
    });
    prepared.current.set(key, ready);
    return ready;
  }, []);

  const commit = useCallback(
    (index: number) => {
      if (index === selected) return;
      setPrevious(motionAllowed ? selected : null);
      setSelected(index);
    },
    [motionAllowed, selected],
  );

  const running =
    pageVisible &&
    !paused &&
    !cartOpen &&
    !loading &&
    (uninterruptedAutoplay || (motionAllowed && inView && !hovered));

  useEffect(() => {
    if (!running || products.length < 2) return;
    let active = true;
    const version = requestVersion.current;
    const next = (selected + 1) % products.length;

    if (uninterruptedAutoplay) {
      void prepare(next).catch(() => undefined);
      const timer = window.setTimeout(() => {
        if (!active || version !== requestVersion.current) return;
        commit(next);
      }, intervalMs);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const ready = prepare(next).then(() => true, () => false);
    const timer = window.setTimeout(async () => {
      const decoded = await ready;
      if (!active || version !== requestVersion.current) return;
      if (decoded) commit(next);
      else {
        setPaused(true);
        setImageError(true);
      }
    }, intervalMs);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [commit, intervalMs, prepare, running, selected, uninterruptedAutoplay]);

  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), FADE_DURATION);
    return () => window.clearTimeout(timer);
  }, [previous, selected]);

  const select = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= products.length) return;
    setPaused(true);
    const version = ++requestVersion.current;
    setLoading(true);
    setImageError(false);
    void prepare(index)
      .then(() => {
        if (version === requestVersion.current) commit(index);
      })
      .catch(() => {
        // Keep the displayed photo, its name and its purchase action together.
        if (version === requestVersion.current) setImageError(true);
      })
      .finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
  };

  return {
    product: products[selected],
    previousProduct: previous === null ? null : products[previous],
    selected,
    paused,
    motionAllowed,
    loading,
    imageError,
    cardRef,
    select,
    setHovered,
    pause: () => setPaused(true),
    togglePlayback: () => {
      setImageError(false);
      setPaused((value) => !value);
    },
  };
}
