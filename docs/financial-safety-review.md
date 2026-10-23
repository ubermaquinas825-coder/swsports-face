# Revisão da segurança financeira

Base desta revisão: commit `2970eb0`, na branch `fix/financial-safety-phase-1`.

## Diagnóstico antes das correções

| Ponto | Evidência e classificação |
| --- | --- |
| Concessão Appmax de 60 segundos | Falta de renovação demonstrável; paginação e leituras sequenciais podiam ultrapassar o prazo. A sobrescrita era bloqueada, mas uma conferência válida deixava de terminar. |
| Espera por bloqueio no banco | Um predicado temporal em UPDATE pode ser avaliado antes da espera por uma linha. Operações de concessão agora adquirem a linha sem esperar e só depois verificam o prazo. O teste usa duas sessões reais. |
| `processing` abandonado | Ausência de timestamp e recuperação demonstrável. Não é possível concluir, só pelo tempo decorrido, que o Bling não recebeu o pedido. |
| Resolução administrativa | Ausência demonstrável. A fase anterior preservava o bloqueio, mas não havia decisão administrativa rastreável. |
| Frescor financeiro | `appmax_checked_at` também marca tentativas inconclusivas. Isso não pode servir de prova de aprovação recente para liberar uma revisão. |
| Retentativas do cron | HTTP 503 também para falhas manuais era demonstrável. O comportamento efetivo do agendador externo não foi consultado. |
| SECURITY DEFINER | As tabelas financeiras já eram qualificadas e as RPCs já restringiam EXECUTE. Não foi demonstrada exploração em produção. Search path, sobrecarga de funções, privilégios e papéis foram endurecidos e testados localmente. |
| Versões em paralelo | Workers anteriores podiam tentar operações incompatíveis. Não se promete processamento sem interrupção durante uma implantação mista; operações antigas inseguras agora falham fechadas. |

## Garantias e limites implementados

### Funções e papéis

- Migração aditiva `0006`; a migração `0005` não foi reescrita.
- Funções SECURITY DEFINER usam `search_path = pg_catalog, pg_temp`, relações
  qualificadas e chamadas ao helper de papel com enum explícito, sem resolução
  ambígua para uma sobrecarga `has_role(uuid, text)`.
- Somente `service_role` executa aquisição, renovação, adiamento e recuperação.
  O fluxo de resolução usa o cliente autenticado, deriva o ator de `auth.uid()` e
  verifica seu papel no banco. Não aceita `actor_id` fornecido pelo cliente.
- Auditoria e evidências têm RLS, leitura administrativa e escrita restrita às
  funções controladas. Nem service role nem administrador possuem DML direto
  nesses registros; não existe GUC de sessão para liberar bloqueios.
- Os testes executam chamadas reais com SET ROLE para anon, usuário comum,
  administrador autenticado e service role. Testam uma relação temporária falsa,
  uma sobrecarga adversarial do helper, falsificação de auditoria e repetição de
  resoluções. As claims SQL são fixtures do teste: na implantação, o limite de
  confiança continua sendo o JWT verificado pelo middleware e pelo PostgREST.
- O proprietário continua sendo o papel confiável que aplica as migrações.
  Homologação deve conferir proprietário, membros e ACLs efetivos. Não foram
  criados papéis privilegiados nem presumidas permissões do banco publicado.

### Operações Appmax demoradas

- Concessão inicial de 60 segundos, renovada antes da autenticação, de cada GET e
  da confirmação final. Cada renovação entrega uma nova revisão de propriedade.
- Limite absoluto de dois minutos no banco e orçamento de 110 segundos na
  aplicação. Não há renovação infinita ou ressurreição de concessão expirada.
- Aquisição, renovação, confirmação e adiamento usam FOR UPDATE SKIP LOCKED:
  se a linha estiver ocupada, a função não espera ultrapassando seu prazo.
- Perda de concessão interrompe as chamadas seguintes e não grava uma observação
  antiga. HTTP 429, 5xx e falhas de transporte das consultas são adiados com
  backoff persistente de 30 segundos até uma hora. Uma nova leitura bem-sucedida
  limpa o backoff. Erros de autenticação/contrato não reconhecidos continuam
  exigindo revisão em vez de uma repetição especulativa.
- `appmax_payment_verified_at` só é preenchido por observação aprovada válida.
  Iniciar outra conferência o invalida; tentativa inconclusiva não o renova.

### Recuperação e decisão administrativa

1. Uma aquisição Bling recebe token exclusivo e timestamp. DML antigo de aquisição
   é recusado; um processamento incerto não pode voltar diretamente a queued.
2. O ciclo coloca até cinco processamentos com mais de dez minutos em revisão.
   Registros antigos sem timestamp recebem o horário da migração, não uma
   conclusão de abandono. Execuções recentes permanecem intactas.
3. A recuperação consulta a lista e o detalhe do pedido existente, conferindo ID
   e `numeroLoja`. Nunca cria contato ou pedido, nunca reenfileira e não escolhe
   o primeiro de resultados ambíguos. O helper OAuth existente pode renovar seu
   token quando necessário; isso não é uma repetição da criação do pedido.
4. Nenhum resultado, vários resultados ou indisponibilidade mantêm o bloqueio.
   A ausência em uma consulta não prova ausência no ERP: consistência eventual
   ou uma execução anterior ainda ativa impedem recriação automática segura.
5. Em **Frete e Envios > Pedidos e etiquetas**, o administrador pode conferir
   pagamento/vínculo dos pedidos em revisão, informar motivo e referência de
   evidência e registrar uma decisão. Não inserir credenciais ou dados pessoais
   nos campos de auditoria; usar referência de chamado/checklist.
6. `keep_blocked` registra o reconhecimento e mantém o estado e motivo original.
   `accept_verified_export` somente conclui a associação já encontrada: exige
   pagamento local aprovado, confirmação financeira e evidência ERP de até cinco
   minutos, revisão atual e nenhuma conferência financeira ainda em andamento.
   O operador deve conferir valores, cliente, entrega e estoque antes de aceitar.
7. A decisão, ator, motivo, referência, estado/motivo anteriores e revisão aplicada
   são gravados na mesma transação. Falha, evidência antiga, pagamento falho ou
   alteração concorrente recusam a resolução sem gravação parcial. A resolução
   não muda payment_status nem substitui identificadores estabelecidos.

O painel mantém seu limite preexistente de 50 pedidos. Para casos mais antigos,
o suporte administrativo deve identificar o pedido por acesso autorizado e usar
o mesmo fluxo de revisão, sem UPDATE manual. Paginação e histórico completo no
painel permanecem trabalho separado. As tabelas `shipping_recovery_checks` e
`shipping_hold_resolutions` preservam o histórico protegido para consulta por
administradores. Não há botão para reenviar uma criação de resultado incerto.

### Cron e falhas parciais

- HTTP 200: ciclo sem falhas; não significa ausência de pendências históricas.
- HTTP 207, `ok:false` e `manualReviewFailures`: revisão manual, sem instrução de
  repetição automática. Monitoramento deve ler esses campos, não apenas o 2xx.
- HTTP 503, `retryableFailures` e Retry-After de 60 segundos: falha classificada
  como segura para nova tentativa. O banco também impõe backoff e propriedade.
- Criação Bling ambígua não é classificada como repetível. O próximo ciclo não
  exporta pedidos em revisão ou processing. Retentativas concorrentes continuam
  passando pela aquisição condicional de cada pedido.
- A política do agendador deve respeitar a distinção e possuir limite de tentativas
  e alerta. Essa configuração externa não foi alterada nem presumida correta.

## Implantação e reversão

1. Em banco descartável/homologação, executar todas as migrações e os testes.
   Conferir ACLs/proprietários reais, cache PostgREST, tamanhos e duração das travas.
2. Pausar cron e ações administrativas de sincronização. Drenar as execuções de
   todas as versões, incluindo workers separados. A loja não recebe publicação
   automática por esta alteração.
3. Aplicar 0005, se ainda ausente, e depois 0006 pelo migrador oficial.
   A 0006 deve ser uma única transação: CREATE FUNCTION e REVOKE/GRANT precisam
   ficar invisíveis a outros clientes até o commit. Verificar essa garantia do
   migrador; se não existir, não aplicar em autocommit. O teste local usa psql
   --single-transaction. Não incluir BEGIN/COMMIT dentro de um migrador que já
   administra transações. Não usar
   schema push a partir do schema Drizzle vazio. Preservar histórico e backup.
4. Confirmar coluna, funções, trigger e acesso por papel. Atualizar o cache de
   schema PostgREST pelo mecanismo suportado antes de subir o novo worker.
5. Implantar o novo código. Conferir campos e permissões do painel sem criar
   transações comerciais; revisar a política de HTTP 207/503 do agendador.
6. Homologar orçamento de execução: até cinco conferências de 110 segundos,
   consultas de recuperação e exportações podem exceder o limite do host. Ajustar
   lote/infraestrutura antes de habilitar processamento; não ampliar concessões
   ou reenviar pedidos como solução para encerramentos do processo.
7. Retomar gradualmente sob supervisão, conferindo exceções e correspondência de
   pedidos. Testes atuais não comprovam contratos ou permissões reais dos provedores.

Reversão: pausar e drenar novamente, manter 0005/0006, auditoria e bloqueios, e
reverter apenas a aplicação para operação de leitura/loja enquanto a sincronização
fica desativada. Código pré-0005 perde a RPC booleana; a versão 0005 mantém leituras
financeiras versionadas curtas, mas sua aquisição direta de exportação é recusada.
Não é seguro reativar workers antigos, apagar revisões ou desabilitar triggers
para contornar erros. Após corrigir o código, reimplantar e repetir as verificações
antes da retomada. Não há down migration destrutiva automática.

## Riscos não resolvidos nesta revisão

Não existe transação distribuída com o ERP, garantia externa de unicidade ou prova
de inexistência a partir de um GET vazio. Correção de associação errada, pedido
sem vínculo encontrado, estorno posterior, reserva de estoque, endereço final,
idempotência de checkout, janela de três dias e operação em grande volume continuam
exigindo os trabalhos descritos na auditoria. Esta revisão não autoriza expedição
nem implica que um pedido Bling movimentou corretamente o estoque.

## Validação realizada nesta revisão

- `npm test -- --no-cache`: 116 testes aprovados em 16 arquivos.
- `npm run test:financial-db`: 86 verificações SQL e quatro verificações de
  concessão com uma segunda sessão real, todas aprovadas no PostgreSQL 17.6
  descartável, sem rede e sem credenciais da loja. Migrações aplicadas com
  `--single-transaction`; contêiner removido ao final.
- TypeScript sem emissão e build de produção: aprovados.
- ESLint estrutural dos arquivos alterados: aprovado com a regra Prettier
  desativada. Não foi corrigida a dívida de formatação global preexistente.
- Nenhuma chamada operacional a Appmax, Bling, SuperFrete ou banco publicado.
  Nenhum push, merge, publicação ou alteração de credenciais foi realizado.

## Arquivos desta revisão

- `docs/financial-safety-phase-1.md`
- `docs/financial-safety-review.md`
- `drizzle/migrations/0006_financial_recovery_and_access.sql`
- `drizzle/migrations/meta/_journal.json`
- `scripts/test-financial-db.sh`
- `src/components/OrderHoldReview.tsx`
- `src/integrations/supabase/types.ts`
- `src/lib/bling-orders.server.ts`
- `src/lib/bling-recovery.server.ts`
- `src/lib/financial-errors.ts`
- `src/lib/order-review.functions.ts`
- `src/lib/payment-reconciliation.server.ts`
- `src/routes/_authenticated/frete-envios.tsx`
- `src/routes/api/public/cron/sync-orders.ts`
- `src/test/bling-orders-server.test.ts`
- `src/test/bling-recovery.test.ts`
- `src/test/financial-recovery-access.sql`
- `src/test/financial-transitions.sql`
- `src/test/order-hold-review.test.tsx`
- `src/test/order-review.test.ts`
- `src/test/order-sync-cron.test.ts`
- `src/test/payment-reconciliation-server.test.ts`
