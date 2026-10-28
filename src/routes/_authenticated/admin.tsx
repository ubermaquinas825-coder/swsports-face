import { createFileRoute } from "@tanstack/react-router";
import { SalesAdmin } from "@/components/admin/SalesAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Vendas e pedidos | SW Sports" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SalesAdmin,
});
