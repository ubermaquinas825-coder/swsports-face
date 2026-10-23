# Publicação na Vercel com Supabase próprio

Destino informado pelo proprietário: projeto Supabase `ybgglngfutfsenhlwtei`
(`sw-sports-homologacao`). O banco anterior Lovable usa outro projeto.
Este repositório não estabelece que os dados ou credenciais foram migrados.

## Código preparado

- `vercel.json`: framework Other, instalação que preserva versões e hashes do
  bun.lock e substitui somente URLs de cache em uma cópia temporária, build Vercel.
- Nitro produz `.vercel/output`, SSR e funções Node 24; não tratar como SPA estática.
- Sete imagens PNG originais foram preservadas em `public/__l5e/assets-v1`, nas
  URLs já usadas. `docs/asset-manifest.json` registra tamanhos e SHA-256.
- Supabase Auth nativo com `VITE_STANDALONE_AUTH=true`: e-mail/senha e Google
  configurado no Supabase; botão Lovable é ocultado nessa modalidade.
- SuperFrete em Vercel usa `SUPERFRETE_API_TOKEN` direto na API oficial, com
  e-mail técnico. A instalação antiga continua usando o gateway do Lovable.
- Bling e tags de etiquetas usam a origem `VITE_PUBLIC_SITE_URL`.
- Cron aceita GET/POST autenticados. Em Vercel usa somente `CRON_SECRET`, sem
  aceitar a credencial antiga do agendador Lovable.

## Importação na Vercel

1. Add New > Project > importar `ubermaquinas825-coder/swsports-face` do GitHub.
2. Framework Preset **Other**, Root Directory raiz. Os comandos vêm do vercel.json.
3. Configurar Environment Variables com base em `.env.vercel.example`.
   Não copiar o `.env` antigo: ele referencia outro banco. Variáveis `VITE_*`
   são públicas e incluídas no build; nunca usá-las para service role ou tokens.
4. Manter `SWSPORTS_FINANCIAL_MAINTENANCE=true` durante a transição e a emissão
   automática de etiquetas desligada. Um build não aplica migrações.
5. Publicar inicialmente no endereço `.vercel.app`. Validar antes de alterar DNS.
   `VITE_PUBLIC_SITE_URL` deve corresponder à origem usada para os testes OAuth;
   depois da troca de domínio, ajustar e refazer o build.

## Variáveis e onde obter

| Variável | Origem / uso |
|---|---|
| `VITE_SUPABASE_URL`, `SUPABASE_URL` | `https://ybgglngfutfsenhlwtei.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Mesma chave pública publishable/anon do Supabase em Settings > API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servidor do MESMO projeto; inserir somente na Vercel |
| `VITE_PUBLIC_SITE_URL` | Origem HTTPS pública escolhida, sem caminhos |
| `VITE_STANDALONE_AUTH` | `true` |
| `SWSPORTS_FINANCIAL_MAINTENANCE` | `true` até validação da migração; depois `false` |
| `CRON_SECRET` | Segredo aleatório longo criado e guardado com segurança; não enviar em chat |
| `SUPERFRETE_API_TOKEN` | Integração desenvolvedor da conta SuperFrete; server-only |
| `SUPERFRETE_CONTACT_EMAIL` | E-mail técnico da loja para User-Agent obrigatório da API |
| `APPMAX_CLIENT_ID`, `APPMAX_CLIENT_SECRET` | Credenciais do lojista Appmax; server-only |
| `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` | Aplicativo OAuth Bling; server-only |
| `BLING_TOKEN_ENCRYPTION_KEY` | Preservar a chave original se copiar tokens criptografados, ou reautorizar o Bling e usar uma nova chave segura |
| `DATABASE_URL` | Apenas migração administrativa; conexão documentada do Supabase com TLS verificado, nunca pública |

Credenciais do Lovable não são exportadas automaticamente pelo GitHub. Esta
sessão não tem autenticação nas contas Vercel/Supabase para preencher segredos.

## Banco existente: preservar o trabalho já feito

O proprietário já executou SQL neste Supabase. Portanto **não rodar todas as
migrações como se o banco estivesse vazio**. `scripts/supabase-readiness.sql`
faz inventário somente leitura de tabelas, colunas e privilégios esperados.
Comparar o inventário com o histórico real antes de aplicar apenas o que faltar.
Não criar registros fictícios no histórico para ocultar diferenças de schema.

Schema não migra usuários, roles administrativas, dados de pedidos, configurações,
conexões OAuth ou arquivos automaticamente. Restaurar cada conjunto pelo mecanismo
suportado, sem substituir dados existentes. Confirmar o usuário administrador e
seu vínculo `user_roles`; nunca promover automaticamente o primeiro cadastro.

No Supabase Auth, configurar Site URL e redirects `/auth` e `/redefinir-senha`
para a URL de teste e, depois, o domínio final. Google OAuth requer o aplicativo
Google e sua callback do Supabase. Registrar a callback `/api/public/bling/callback`
da nova origem no Bling e reautorizar quando necessário.

## Agendamento e virada

Nenhum agendador novo é ativado por esta configuração: evitar dois servidores
processando a mesma conta enquanto o Lovable continua publicado.
Depois de validar banco, credenciais, permissões e origem:

- Configurar um único scheduler autenticado para `/api/public/cron/sync-orders`.
  Vercel Cron faz GET e envia `Bearer CRON_SECRET`; a frequência permitida depende
  do plano. Alternativamente, Supabase Cron pode chamar o POST com segredo no
  Vault. Não colocar tokens em SQL versionado, URL, código ou logs.
- Desativar o cron antigo no momento da virada e manter os registros de pedidos.
- Testar cotação, login, callback e processamento controlado, sem cobranças de teste
  não autorizadas. Homologar as etiquetas antes de habilitar débito da carteira.
- Somente após revisar o site Vercel e a migração, trocar o DNS de `swsports.com.br`
  para os valores que a Vercel fornecer. Não inventar IP ou CNAME.

Ainda dependem de acesso externo: importação e publicação na conta Vercel,
segredos, inventário/migração do banco, scheduler, autenticação e DNS. Um build
local bem-sucedido não comprova essas etapas nem uma publicação em produção.
