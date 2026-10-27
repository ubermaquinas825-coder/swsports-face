import type { ReactNode } from "react";

// Keep content visible in SSR and with reduced motion. Visibility must never
// depend on hydration or on an animation reaching its final frame.
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
