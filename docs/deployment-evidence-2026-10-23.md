# Evidências para o operador — implantação financeira (23/10/2026)

Registro somente leitura. Nenhuma migração foi aplicada, nenhum histórico foi alterado
e nada foi publicado.

## Backend
- Lovable Cloud, instância Live, ref `iiswivsqvzdfsfbiicfi` (fonte: `supabase--project_info`).
  Preview e site publicado usam a mesma instância. Não é `sw-sports-homologacao`.
- Projeto Lovable `45740091-8f59-41fb-957a-c2f263b7b39c`. Site publicado: deployment
  `psr2.908c5127-f2eb-44fb-b9b1-d014dfa32abb…`, anterior ao PR #1 (sem o controle de manutenção).
- Backup: o operador viu a listagem de 2026-10-23 12:17:41 UTC. O agente não tem ferramenta
  para ler a lista de backups, então não conseguiu verificar se existe um backup mais recente.
  Não houve teste de restauração.

## Histórico real (`drizzle.__drizzle_migrations`)
| id | hash sha256 (igual ao arquivo) | created_at (ms) | arquivo |
|---|---|---|---|
| 1 | f4d315281d2bad9915409811bae6e8d4cfade67f230e3eb3d755ad70bda92abf | 1792700281345 | 0000_prepare_shipping_admin |
| 2 | 9cd0267a23810ac8a8685b10ef6a5c172935beefe9dea58c5eabd7411a585345 | 1792706849203 | 0001_bling_oauth_infrastructure |
| 3 | d9874182e39adf021a4601b8214961769aa36c43f0e13fa63f155794470a6df1 | 1792707020524 | 0002_restrict_bling_oauth_grants |
| 4 | 5639146c63ae53acb332c6080d17e2fff1c86845ee12ea1ca8c56ca9feaac374 | 1792708333343 | 0003_bling_inventory_and_checkout_records |
| 5 | bc7ece1a331b70c264517dcfd2f3fff1f98280a268534d3b29f8ab3f3363b2e8 | 1792710100454 | 0004_appmax_payment_reconciliation |

Os `created_at` são iguais aos `when` do journal. **Produção = 0004.**

## Pendentes (journal idx 5 e 6; `when` > último created_at, então o migrador não os ignora)
| arquivo | sha256 | when |
|---|---|---|
| 0005_financial_transition_guards.sql | 2b7b3e3710aa49034d68d318368e0eb42129ca346eaee67cb4145aebb9779fea | 1792756800000 |
| 0006_financial_recovery_and_access.sql | 7b24972f4b0750058b64fb201ea14f63ae987300762e09b51c5a94b9097ca338 | 1792757400000 |

Estado observado: 0 linhas em `shipping_orders` e em `shipping_events`. Nenhuma função
existe no schema `public`, e as colunas da 0005/0006 estão ausentes.

## Mecanismo de aplicação necessário (fora do alcance do agente)
O migrador do Drizzle (`drizzle-kit migrate`, usando `drizzle.config.ts` com
`LOVABLE_DB_MIGRATION_URL`), executado com conexão privilegiada sobre o journal existente,
aplica só as entradas pendentes. Ele grava o hash sha256 do arquivo e `created_at = when`.
Observação: por padrão, o migrador do Drizzle no Postgres executa **todas as pendentes numa
única transação**. Isso é atômico para 0005+0006 juntas. Para ter uma transação por arquivo,
é preciso rodar o migrador duas vezes, expondo apenas a 0005 no journal na primeira vez, ou
pedir confirmação ao suporte. O sandbox do agente não tem `LOVABLE_DB_MIGRATION_URL`, e o
papel `sandbox_exec` não tem acesso ao schema `drizzle`. A ferramenta disponível ao agente
só cria migrações novas, o que geraria duplicatas, e por isso não foi usada.

## Agendador removido (recriar depois via ferramenta oficial; a autenticação é gerenciada, sem token no repositório)
- nome `sync-paid-orders-to-bling`, id antigo 1, cron `*/5 * * * *`
- alvo relativo `/api/public/cron/sync-orders`, método POST, corpo `{}`
- removido em 2026-10-23 ~15:28 UTC; última execução registrada às 15:25 UTC (HTTP 200)

## Contenção — o que realmente bloqueia o servidor
- A versão publicada não lê `SWSPORTS_FINANCIAL_MAINTENANCE`, então configurar a variável
  não bloqueia nada.
- O cron já foi contido (removido).
- Continuam executáveis no servidor publicado: checkout/cotação (server functions públicas),
  "Conferir pagamentos e enviar ao Bling" (admin), configurações, diagnósticos e OAuth Bling.
- Candidatos efetivos, nenhum deles verificado ainda: (a) uma versão de manutenção compatível
  com o schema 0004, publicada antes; (b) tornar a publicação não pública, desde que se
  confirme que o bloqueio vale para as rotas `/api` e as server functions, e não só para a
  página; (c) pausar o backend, que bloqueia as gravações, mas também impede a migração.
  Remover credenciais está fora das regras.

## Alterações de código nesta sessão
- `src/integrations/supabase/types.ts`: a plataforma regenerou os tipos duas vezes a partir do
  banco em 0004 (commits automáticos `10befcd` e `9fe9b00`). As duas vezes ele foi restaurado
  byte a byte para a versão `2cc771d`. Diff final contra `2cc771d`: vazio.
- `docs/deployment-evidence-2026-10-23.md`: este arquivo (novo).

## Visibilidade da publicação antes da contenção (15:40 UTC)
- is_published=true, publish_visibility=public, effective=public, audience_tier=public.
- Restaurar para: **public**.
- Neste plano, um site privado só aceita pessoas convidadas uma a uma. Por isso a ferramenta
  do agente recusa a mudança automática, e o proprietário precisa fazê-la em Publish → Invite only.

## Verificação externa após "Invite only" (15:45 UTC, sem login, sem criar pedidos)
Visibilidade efetiva: private, audience custom/named_only.
| Rota | Resposta | Quem respondeu |
|---|---|---|
| GET / , /frete-envios, /integracoes/bling, assets JS | 401 | bloqueio da plataforma |
| POST /_serverFn/* (checkout, cotação e ações admin) | 401 | bloqueio da plataforma |
| POST /api/public/cron/sync-orders | 401 | **app** (autenticação do cron; cabeçalho diferente) |
| GET/POST /api/public/bling/start, /callback | 400 / 200 | **app** (o código da loja executou) |
Conclusão: as rotas `/api/public/*` não passam pelo bloqueio de visibilidade e chegam ao código
publicado, protegidas só pela autenticação da própria aplicação. A contenção está
**incompleta** pelo critério do operador. As migrações NÃO foram aplicadas.
Observação: o deployment-id mudou de `psr2.908c5127…` para `psr2.4bb369f9…` depois da troca de
visibilidade. Não foi feita nenhuma publicação pelo agente.
