<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — SW Sports

## Padrão obrigatório: Issues, Pull Requests e deploys

Estas instruções se aplicam a qualquer agente, ferramenta ou modelo que trabalhe neste projeto. Leia este arquivo antes de implementar mudanças. Preserve o trabalho existente e consulte o estado atual do GitHub antes de abrir tarefas duplicadas.

1. **Issue antes da implementação.** Toda nova tarefa deve ter uma Issue no GitHub, classificada com exatamente uma destas labels: **Correção**, **Melhoria** ou **Nova função**. Use o mesmo tipo no início do título. A Issue deve registrar objetivo/problema, escopo, critérios de aceite, dependências e validação prevista.
2. **Branch e PR por entrega coerente.** Trabalhe em uma branch vinculada à Issue e entregue por Pull Request. Não envie mudanças diretamente à `main`, não reescreva histórico publicado e não misture tarefas independentes. Preserve commits e alterações de outros colaboradores.
3. **Descrição obrigatória de todo PR.** Informe a Issue relacionada (`Refs #numero`; use `Closes #numero` somente quando o aceite estiver atendido), o que mudou, como foi validado, riscos, limitações e próximos passos. Use `.github/PULL_REQUEST_TEMPLATE.md`. Diferencie testes executados, falhas, verificações pendentes e dependências externas; não invente números de Issues ou resultados.
4. **Deploy acompanhado pelo PR.** Use o PR para registrar a prévia, a versão/commit entregue, migrações necessárias, resultado dos checks, estado da publicação e reversão. A publicação em produção deve seguir o fluxo de revisão/integração do repositório e permanecer rastreável ao PR. Não substitua esse fluxo por um deploy direto de arquivos locais. Uma exceção exige autorização explícita posterior e deve ser registrada na Issue e no PR.
5. **Atualize o contexto e as tarefas.** Registre decisões duráveis neste arquivo e atualize as Issues com bloqueios, progresso e validação. Consulte `docs/entregas/README.md` para o backlog preparado e suas dependências. Feche tarefas somente quando os critérios de aceite forem satisfeitos; merge ou build bem-sucedido não comprovam, por si, uma integração financeira funcionando.
6. **Sem acesso ao GitHub.** Preserve e prepare a documentação, as descrições de Issues e os commits em branches. Informe o bloqueio exato e solicite apenas o acesso necessário. Não declare Issues/PRs como criados nem avance uma nova implementação sem a Issue correspondente. Nunca inclua credenciais nas Issues, PRs, commits, logs ou arquivos de contexto.

Use os modelos em `.github/ISSUE_TEMPLATE/` para manter os três tipos de tarefa consistentes. Os arquivos locais de planejamento não substituem Issues reais no GitHub.

Technical decisions for this project:

- Advertising base tags are centralized in a browser-only effect with regional advertising consent, versioned visitor choice history and cross-tab withdrawal; only public storefront paths are measured, never admin/auth or checkout personal data. No matching, purchase reporting or Google conversion labels are inferred from base tag IDs.

- Product photos are CDN assets: cut transparent from the user's original photos via `/mnt/user-uploads/` + Lovable Assets pointers (`src/assets/*.png.asset.json`). Never replace them with AI-generated images; keep the original stamp colors.
- Hero uses a 2.5D presentation (CSS perspective tilt + idle float) in `src/components/Hero.tsx`, kept as a standalone component so it can be swapped for a real GLB/GLTF model later. Do not fake a 3D model from the 2D photos.
- Storefront motion uses Motion with reduced-motion fallbacks; the global WhatsApp contact link sits below the cart overlay so it cannot interfere with payment.
- Cart state lives in `src/hooks/use-cart.tsx`, with one provider and drawer in the root layout so it remains available across storefront routes; product data and WhatsApp helpers in `src/lib/products.ts` are the single source of truth for prices and links.
- Retail checkout uses a public validated server function that re-quotes the chosen SuperFrete service and creates a Mercado Pago checkout for the catalog subtotal plus freight; redirect in the same tab without clearing the cart or marking payment complete. WhatsApp is contact/wholesale only.
- Kit offers are rendered disabled ("EM APROVAÇÃO") until the owner approves the commercial values.
- Public business identity, address and hours live in `src/lib/business.ts`; sales links remain in `src/lib/products.ts` so listing metadata cannot override checkout contacts.
- Logistics rules and configuration schemas live in `src/lib/shipping.ts`; admin configuration functions verify protected `user_roles`. Public quotation reads only operational settings server-side, never exposes private settings, and blocks quantities lacking confirmed packaging. Provider adapters live in `checkout.server.ts`, with client-safe RPC wrappers; quotes and checkout never create labels.
- SuperFrete runtime calls use the linked custom connector gateway on Lovable; standalone Vercel deployments use the official api.superfrete.com API with a server-only SUPERFRETE_API_TOKEN and contact email. Mercado Pago credentials remain server-only. Admin diagnostics verify credentials using read-only provider calls, without creating orders or charges; never expose credentials or log token-endpoint bodies. Ambiguous checkout failures stay pending and are flagged for reconciliation, never retried automatically.
- Bling uses the owner's explicitly requested site-hosted Authorization Code flow via TanStack public server routes; admin RPC issues a single-use ticket, start binds an HttpOnly browser cookie, callback atomically consumes hashed state and rechecks roles. Tokens use AES-GCM with a Cloud secret, service-role-only storage and a durable refresh lock; status RPC never returns credentials. OAuth redirects use the published storefront origin and must not be enabled before deployment of its callback is verified.
- Bling product verification is an admin-only, read-only API request through the shared token helper, returning an allowlisted product projection without persisting or creating ERP records; refresh occurs on demand before API calls to avoid unnecessary background work.
- Bling inventory settings require owner-confirmed catalog/SKU mappings verified against existing active ERP products and a selected warehouse; discovery matches unique returned product names, never SKU sequence, and stock is validated before saving. Optional checkout checks read warehouse virtual balances without writing stock. Checkout persists pending orders and payment-link IDs. When /depositos lacks scope, depots are derived from stock-balance responses.
- Mercado Pago reconciliation verifies the provider order, store external reference, exact total and single accredited payment. Refunds, ambiguity and mismatched payment IDs hold fulfillment; unsigned webhooks never establish payment or address truth. Approved payments are queued and exported once as Bling sales orders (numeroLoja = store order id, queued->processing conditional lock, existing-order lookup before POST). Automation runs after confirmed webhooks/checkout returns and has a scheduled recovery check; do not claim a five-minute schedule when the configured cron is daily. Failures go to reconciliation_required and are never blindly retried. Contacts are matched by CPF/CNPJ before creation; checkouts collect and validate a delivery-address snapshot before payment, with CEP matching the freight quote. Orders without a verified Mercado Pago link remain for manual review.

- Automatic SuperFrete labels use the configured provider adapter, declaration of contents, saved provider-quoted volume and an independently reconfirmed exact-amount Mercado Pago payment after Bling sync. Migration 0008 provides one durable attempt per order; migration 0010 restricts label authorization to Mercado Pago. Inspect existing schema before applying a migration; the owner's database already received an equivalent targeted update. Never retry ambiguous cart creation or wallet debits automatically; quarantine for review. Keep the admin switch disabled until schema, sender configuration and provider validation are complete.

- Vercel + Supabase migration: keep the existing Lovable deployment intact while validating the new project. Use docs/vercel-supabase.md, preserve original exported public images, keep financial maintenance enabled during cutover, and never apply all migrations blindly to the owner-prepared Supabase database. Vercel builds do not migrate data or publish DNS.
- A temporary server-only `SWSPORTS_BLING_SETUP_ENABLED=true` flag on Vercel permits only admin-protected OAuth connection/renewal and product reads during financial maintenance. Preserve ticket/state/browser checks. All commerce, cron, export, stock and label operations remain blocked; disable the flag after connection setup.

- Current owner requirement: Mercado Pago is the only active payment provider. Public and administrative screens, payment diagnostics, ERP exports, hold reviews and automatic labels must use Mercado Pago only. Preserve historical database records and migration history; do not automatically fulfill orders without a verified Mercado Pago association.

- Confirmed shipping inputs: one balaclava weighs 100 g; the plastic packaging weighs 5 g, measures 22 × 15 × 10 cm and holds up to 10 units. Total weight is 100 g × quantity + 5 g. The sender/configuration was saved in the owner's Supabase project. Provider validation, Bling product/warehouse mappings and automatic-label activation are still pending; do not infer readiness from saved settings.
- The proposed Nuvemshop work is a visual theme adaptation of https://www.balaclavaswsports.com.br/. The destination store URL, plan and theme access have not been supplied. Preserve Nuvemshop's native catalog, cart, shipping, payment and checkout; never transfer this application's backend or credentials into a theme. Use original SW Sports assets and preview/compare the theme before publication.
