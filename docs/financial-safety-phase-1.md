# Segurança financeira — fase 1

A revisão desta fase está detalhada em [financial-safety-review.md](financial-safety-review.md).

Esta alteração preserva bloqueios operacionais, torna falhas de banco explícitas,
valida timestamps completos de pagamento e impede gravações financeiras com uma
versão antiga do pedido. Não ativa cron, pagamentos, exportações ou integrações.

## Contrato de transição

- `blocked` e `reconciliation_required` nunca são liberados automaticamente.
  Confirmar um pagamento pode atualizar a situação financeira, preservando o
  bloqueio e seu motivo. A resolução administrativa exige evidências recentes e auditadas; não existe
  liberação para reenfileirar uma criação incerta. Consulte o procedimento da revisão.
- `approved` não retorna a `pending`; `failed` não volta automaticamente a
  `pending` ou `approved`. Uma nova tentativa legítima após falha precisa ser
  tratada separadamente, sem reaproveitar silenciosamente a decisão anterior.
- A associação `provider_payment_id`, uma vez estabelecida, não é substituída.
- Toda atualização de `shipping_orders` troca `financial_revision`, inclusive
  mudanças administrativas e aquisição de trava por código anterior.
- A reconciliação recebe a revisão na aquisição da trava e só confirma uma
  observação se ainda possuir essa revisão e uma concessão não expirada no relógio
  do banco. Uma gravação rejeitada não conta como pagamento conferido.
- As conclusões e sinalizações de erro da exportação Bling exigem a revisão
  adquirida, pagamento aprovado e estado `processing`. Uma decisão mais recente
  nunca é substituída por essas gravações. Conflitos exigem conferência operacional.
- Falhas de consulta interrompem o ciclo, falhas individuais são contabilizadas e
  o endpoint de cron distingue HTTP 503 para falhas transitórias e HTTP 207 para
  casos que exigem revisão manual, sempre com contadores explícitos. Antes de
  retomar o agendamento, conferir sua política de repetição: não introduzir repetição
  cega de criações externas para compensar respostas de erro.
- `paid_at` aprovado exige data e hora completas, calendário válido, segundos,
  fração opcional e deslocamento válido quando informado. São aceitos o formato
  SQL `YYYY-MM-DD HH:mm:ss` e o formato ISO com `T`, com ou sem fuso. Datas sem hora
  e normalizações como 31 de abril são rejeitadas. Não se presume um fuso para o
  formato sem deslocamento; esta validação não compara cronologia entre provedores.

## Validação local

```sh
npm test -- --no-cache
npm run test:financial-db
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
```

`test:financial-db` exige Docker e `rg`. Cria PostgreSQL 17.6 descartável com
imagem oficial fixada por digest, sem rede, portas publicadas ou credenciais da
aplicação. Aplica as migrações apenas nesse banco, executa casos de revisão,
regressão, associação, concessão expirada, versões antigas e privilégios, e remove
o contêiner ao terminar. Não lê `DATABASE_URL` nem conecta ao banco da loja.

Os testes TypeScript substituem todas as chamadas Appmax/Bling dos cenários
adicionados. Não criam links, pagamentos, contatos ou pedidos reais.

## Implantação após revisão e aprovação

1. Validar as migrações `0005_financial_transition_guards.sql` e
   `0006_financial_recovery_and_access.sql` em homologação e
   revisar os estados existentes. A adição da coluna com UUID pode reescrever a
   tabela e adquirir trava; avaliar tamanho, duração e janela de manutenção.
2. Pausar o agendamento e as ações administrativas de sincronização pelo mecanismo
   já utilizado na implantação. Drenar execuções em andamento antes da mudança.
3. Com backup e plano operacional aprovados, aplicar **a migração antes do novo
   código** pelo processo oficial do projeto. A migração está registrada no journal;
   não usar geração/push de schema a partir do `drizzle/schema.ts` vazio.
4. Confirmar a coluna, trigger e permissões das RPCs financeiras; aguardar a
   atualização do cache de schema PostgREST pelo mecanismo oficial, se necessária.
5. Implantar a aplicação somente após essa verificação. As novas RPCs são
   obrigatórias: sua ausência resulta em erro explícito, sem fallback inseguro.
6. Fazer verificações de leitura e revisar as exceções antes de retomar a
   sincronização sob supervisão. Homologar o formato real de `paid_at` com fixtures
   sanitizadas; formato desconhecido deve permanecer bloqueado para revisão.

Esta tarefa não executa nenhum desses passos na produção. Em reversão, pausar a
sincronização e manter as proteções do banco; não remover bloqueios, coluna ou
trigger para fazer código antigo voltar a processar automaticamente. A versão
anterior não oferece as mesmas garantias e requer decisão operacional específica.

## Limitações que permanecem

- Não há transação distribuída com o Bling. Se o ERP aceitar um pedido antes de
  surgir um bloqueio concorrente, a conclusão local será recusada, mas o efeito
  externo exige reconciliação manual; não repetir a criação automaticamente.
- Expiração ou alteração concorrente é erro explícito. A renovação é limitada a
  dois minutos; a recuperação de `processing` é somente por consulta e revisão,
  sem recriar pedidos ou presumir que o processo anterior não produziu efeitos.
- Permanecem a janela de três dias e os lotes atuais, a ausência de monitoramento
  contínuo de estornos após aprovação, reserva de estoque, endereço final validado,
  idempotência do checkout e recuperação de resultados externos ambíguos.
- Os snapshots Drizzle anteriores não representam o schema SQL; esta fase não
  tenta regenerá-los ou alterar a autoridade de migrações do projeto.
