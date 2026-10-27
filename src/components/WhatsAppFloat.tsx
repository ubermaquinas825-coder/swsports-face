import { motion, useReducedMotion } from "motion/react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/products";

const HIDDEN_PREFIXES = [
  "/admin",
  "/checkout",
  "/auth",
  "/redefinir-senha",
  "/frete-envios",
  "/integracoes",
];

export function WhatsAppFloat() {
  const reduce = useReducedMotion();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <motion.a
      href={waLink("Olá, equipe SW Sports! Gostaria de tirar uma dúvida.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Precisa de ajuda? Fale com a SW Sports no WhatsApp"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      {...(reduce ? {} : { whileHover: { scale: 1.04 } })}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] z-30 flex min-h-11 items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-whatsapp-foreground shadow-sm"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden pr-1 text-sm font-bold sm:inline">WhatsApp</span>
    </motion.a>
  );
}
