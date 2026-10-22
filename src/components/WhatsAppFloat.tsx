import { motion, useReducedMotion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/products";

export function WhatsAppFloat() {
  const reduce = useReducedMotion();
  return (
    <motion.a
      href={waLink("Olá, equipe SW Sports! Gostaria de tirar uma dúvida.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a SW Sports no WhatsApp"
      initial={reduce ? false : { opacity: 0, scale: 0.6, rotateY: -90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      whileHover={reduce ? undefined : { scale: 1.08, rotateZ: -6 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.6 }}
      className="group fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full bg-whatsapp p-3.5 text-whatsapp-foreground shadow-whatsapp md:bottom-7 md:left-7"
    >
      {!reduce && <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-whatsapp opacity-30" />}
      <MessageCircle className="h-6 w-6" />
      <span className="hidden pr-1 text-sm font-bold sm:inline">WhatsApp</span>
    </motion.a>
  );
}