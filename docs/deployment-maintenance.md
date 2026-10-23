# Manutenção financeira e implantação controlada

## Escopo e estado

Esta alteração prepara um bloqueio de admissão no servidor. Não ativa manutenção,
não modifica segredos, não pausa jobs e não publica o projeto. Não substitui backup,
identificação do backend, autorização ou drenagem de processos.

O estado final persistido do envio Bling é `synced`, com `bling_order_id` associado.
`exported` é o resultado/contador da aplicação, não um estado persistido. Nem um
pedido `synced`, nem a expiração de uma concessão demonstram que todos os workers
terminaram. Consulta de estoque não constitui manutenção. O botão de conferência
administrativa pode criar pedidos reais no ERP e não é um smoke test.

## Controle implementado

Variável exclusivamente de runtime do servidor:
`SWSPORTS_FINANCIAL_MAINTENANCE`.

| Valor | Comportamento |
| --- | --- |
| Ausente | Operação habitual, para compatibilidade com instalações existentes |
| `false` | Operação habilitada |
| `true` | Manutenção |
| Vazio ou outro valor | Manutenção; configuração inválida falha fechada |

Espaços externos e maiúsculas são normalizados. Não usar prefixo `VITE_`, parâmetro
de requisição, cookie, localStorage ou configuração enviada pelo navegador.
O código lê a variável em cada admissão; o host ainda pode exigir reinício ou nova
publicação para propagar alterações. Esse comportamento precisa ser confirmado.

Exceção explícita para a migração Vercel: `SWSPORTS_BLING_SETUP_ENABLED=true`,
somente com `VERCEL=1`, permite as três ações administrativas de conexão OAuth,
renovação e leitura de produtos Bling e suas rotas start/callback. Esse flag é
server-only, desabilitado por padrão, e não altera os bloqueios de checkout,
pedidos, estoque, etiquetas ou cron. Sem a exceção, mantém-se o bloqueio total
de OAuth e diagnósticos descrito abaixo. Desativar o flag depois da conexão.

Quando habilitado, o controle recusa antes dos acessos operacionais:

- Checkout público e cotação pública.
- Cron, conferência administrativa e exportação/reconciliação direta.
- Inspeção de recuperação, resolução administrativa e recuperação automática.
- Configurações logísticas e de estoque.
- Diagnósticos que consultam provedores e podem renovar tokens.
- Início e callback OAuth Bling.

As rotas HTTP respondem 503, `Cache-Control: no-store`, `Retry-After: 60` e código
`FINANCIAL_MAINTENANCE`. O cron continua exigindo autenticação antes dessa resposta.
As server functions recusam com erro explícito de manutenção; seu transporte HTTP
é administrado pelo TanStack e deve ser validado no host. Erro não é sincronização
bem-sucedida. Um callback interrompido exige reiniciar a autorização após a janela.

Catálogo, navegação, autenticação e leituras administrativas locais continuam
disponíveis. Nenhum botão permite desligar a manutenção. A retomada é operacional.

## Limites obrigatórios

- A variável não é um mutex distribuído nem impede chamadas de versões antigas.
- Não cancela uma chamada externa já iniciada. Um ciclo admitido pode concluir
  etapas já iniciadas; entradas subordinadas reavaliam o bloqueio. Se houver
  interrupção entre etapas, preservar pendências/bloqueios e reconciliar depois.
- Não bloqueia acesso direto autorizado ao banco, jobs externos ou webhooks fora
  deste código. Inventariar e suspender esses escritores separadamente.
- Não contar requisições em memória como evidência global de drenagem em um host
  com múltiplas instâncias. Não foi implementado um contador distribuído sem antes
  conhecer o banco de produção e seu mecanismo de migração.
- Não comprova exclusividade de `numeroLoja` no Bling, reserva de estoque ou
  acompanhamento de estornos. Essas dependências permanecem fora desta alteração.

## Procedimento de implantação, condicionado às evidências

1. Confirmar backend de produção, branch conectada, gatilhos de Git Sync/Publish,
   migrador oficial, histórico real e backup recuperável. Informações de um chat
   sobre menus, retenção ou transações não substituem evidência do projeto.
2. Homologar este bloqueio com provedores simulados, incluindo a operação normal
   com a variável ausente/`false`. Validar no host sua propagação a todas as
   instâncias. Não usar credenciais de produção na homologação.
3. Preparar o bloqueio antes da migração. Se for necessário publicá-lo primeiro,
   utilizar uma versão de manutenção compatível com o schema atual, revisada e
   testada contra esse schema; não presumir compatibilidade do pacote financeiro
   completo. Um backport ao código publicado é uma alteração separada. Não
   ativar código financeiro novo em banco antigo para instalar o bloqueio.
4. Pela ferramenta oficial, suspender o agendador e suas retentativas. Ativar o
   bloqueio no servidor, suspender ações administrativas e outros escritores.
   Não remover credenciais ou revogar ACLs para simular manutenção.
5. Confirmar todas as versões sem novas admissões. Obter logs de início/fim e
   contagem de execuções ativas da plataforma. Inspecionar transações relevantes
   por acesso autorizado. Se o host não oferecer observabilidade, exigir seu
   limite máximo documentado, isolar novas entradas e definir uma janela de
   drenagem baseada nesse limite. Nenhuma dessas evidências está presumida aqui.
6. Registrar pendências/associações de forma segura e obter backup consistente
   da janela. Backup diário pode anteceder pedidos recentes; registrar a lacuna e
   sua recuperação. Validar separadamente Auth, Storage e chaves de criptografia.
7. Aplicar apenas migrações realmente pendentes, na ordem 0005 e 0006 se o banco
   estiver comprovadamente em 0004. A 0006 exige transação integral. Conferir
   histórico, funções, trigger, ACLs, RLS e cache PostgREST. Parar em divergência.
8. Publicar o SHA revisado mantendo manutenção e jobs suspensos. Confirmar versão,
   backend, permissões e leitura sem acionar checkout, cron, OAuth ou diagnósticos
   reais. A tabela de pedidos sozinha não demonstra drenagem.
9. Antes de retirar o bloqueio ou reativar jobs, apresentar pendências, evidências
   e riscos ao operador e obter confirmação explícita. Links Appmax já emitidos
   podem receber pagamentos durante a pausa; planejar sua reconciliação, inclusive
   casos fora da janela automática de três dias. Não reexportar casos incertos.

Se qualquer pré-requisito não for demonstrável, parar antes da operação afetada.
Não executar merge para descobrir se ele dispara migração/publicação.

## Reversão

Pausar novas admissões e jobs, drenar e preservar dados, auditoria e proteções SQL.
Uma versão anterior sem este bloqueio não pode ser considerada protegida pela
variável: manter também contenção externa comprovada. Não reativar workers antigos
incompatíveis, remover triggers ou reenfileirar `processing`. Restaurar backup
sobre dados recentes não é uma reversão automática segura; requer plano próprio
e reconciliação dos efeitos externos.

## Evidências ainda exigidas do operador/Lovable

- Identidade do backend e histórico real das migrações.
- Gatilhos efetivos de sincronização, migração e publicação.
- Execução transacional e registro do migrador.
- Backup identificável, cobertura e restauração isolada.
- Scheduler, retentativas, versões ativas, limites e prova de drenagem.
- Testes JWT/PostgREST e orçamento total do ciclo no runtime publicado.

O identificador do job, caminhos de painel e retenção de backup informados pelo
operador continuam sujeitos a confirmação no ambiente, não são contratos
implementados por este repositório.

## Validação desta alteração

- 154 testes aprovados em 18 arquivos; inclui 14 entradas de server functions,
  seis entradas diretas do núcleo, três rotas HTTP e manutenção entre etapas.
- TypeScript sem emissão e build aprovados.
- ESLint estrutural dos arquivos alterados aprovado com a regra de formatação
  Prettier desativada; não representa aprovação do lint global de formatação.
- 90 verificações PostgreSQL aprovadas (86 SQL e quatro de concorrência), no
  contêiner descartável PostgreSQL 17.6 sem rede. Nenhum SQL de migração mudou.
- Execução em cópia temporária, sem arquivos .env ou segredos herdados, provedores
  simulados. Nenhuma publicação, operação de pagamento ou exportação ERP real.

Esses resultados não demonstram comportamento do runtime publicado, autenticação
JWT/PostgREST real, propagação da variável ou término de workers de outras versões.
