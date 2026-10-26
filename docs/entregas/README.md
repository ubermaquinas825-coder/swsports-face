# Entregas SW Sports

O padrão obrigatório está em [AGENTS.md](../../AGENTS.md). Toda implementação nova precisa de uma Issue real, com exatamente uma classificação: **Correção**, **Melhoria** ou **Nova função**, e deve ser entregue por PR.

## Estado do registro no GitHub

Os itens abaixo são **descrições preparadas localmente**, não Issues criadas. `T01` a `T12` são identificadores deste planejamento, nunca números de Issues do GitHub. O campo `github_url` em [backlog.json](backlog.json) permanece `null` até a criação ser confirmada pela API.

O Git consegue ler o repositório, mas a API `api.github.com` está bloqueada pela rede deste ambiente. A inclusão do domínio foi salva no rascunho da configuração e ainda precisa ser aplicada. Não concluir que falta um token somente a partir desse bloqueio de rede; testar a autenticação existente depois da liberação.

## Backlog

| ID local | Tipo | Tarefa | Dependências | GitHub |
| --- | --- | --- | --- | --- |
| T01 | Melhoria | [Adotar Issues, Pull Requests e contexto obrigatório para todos os agentes](issues/t01.md) | — | Pendente |
| T02 | Correção | [Consolidar Mercado Pago como único provedor nos fluxos ativos](issues/t02.md) | T01 | Pendente |
| T03 | Melhoria | [Validar remetente, embalagens e cotação real da SuperFrete](issues/t03.md) | T01, T02 | Pendente |
| T04 | Melhoria | [Validar conexão Bling, produtos, depósito e estoque](issues/t04.md) | T01, T02 | Pendente |
| T05 | Nova função | [Disponibilizar emissão automática de etiquetas após pagamento Mercado Pago](issues/t05.md) | T02, T03, T04 | Pendente |
| T06 | Melhoria | [Confirmar recebimento dos eventos do pixel Meta e consentimento](issues/t06.md) | T01 | Pendente |
| T07 | Nova função | [Habilitar e validar login Google pelo Supabase](issues/t07.md) | T01 | Pendente |
| T08 | Melhoria | [Inspecionar loja, plano e tema de destino da Nuvemshop](issues/t08.md) | T01 | Pendente |
| T09 | Melhoria | [Reproduzir identidade visual, cabeçalho e rodapé no tema Nuvemshop](issues/t09.md) | T08 | Pendente |
| T10 | Melhoria | [Reproduzir a página inicial e imagens originais na Nuvemshop](issues/t10.md) | T08, T09 | Pendente |
| T11 | Melhoria | [Adaptar catálogo, página de produto e carrinho nativos da Nuvemshop](issues/t11.md) | T08, T09 | Pendente |
| T12 | Melhoria | [Validar fidelidade visual e publicar o tema Nuvemshop pelo PR](issues/t12.md) | T09, T10, T11 | Pendente |

## Criar as Issues e preparar os PRs

1. Após a liberação da API, listar Issues de todos os estados e PRs existentes para evitar duplicatas. Reusar tarefas equivalentes e atualizar seus critérios quando necessário.
2. Criar apenas labels ausentes com os nomes exatos `Correção`, `Melhoria` e `Nova função`; não renomear ou sobrescrever labels de outros colaboradores.
3. Criar as Issues com os títulos de `backlog.json` e os corpos em `issues/`. Substituir as dependências locais por links reais e salvar as URLs confirmadas em `backlog.json` e nesta tabela.
4. Abrir um PR de contexto/modelos para T01. As alterações de Mercado Pago iniciadas anteriormente pertencem a uma entrega separada, vinculada a T02. Não misturar mudanças independentes.
5. Usar o modelo de PR; mencionar a Issue, mudanças, resultados reais de validação, riscos, limitações, próximos passos, deploy e reversão. Para aceite ainda pendente, usar `Refs`, não `Closes`.

## Limites de escopo

- T01–T07 acompanham o site SW Sports e suas integrações. A configuração das etiquetas ainda não equivale a uma operação validada/ativa.
- T08–T12 acompanham a adaptação visual para Nuvemshop. URL, plano e acesso ao tema ainda não foram fornecidos; após a inspeção, implementar no repositório correto do tema e atualizar os vínculos das tarefas. Preservar os recursos nativos da Nuvemshop.
- Publicações diretas anteriores à adoção deste padrão devem ser documentadas como histórico, não tratadas como autorização permanente para novos deploys fora de PR.
- Nunca registrar tokens, senhas, dados de clientes ou conteúdo bruto dos provedores nos documentos ou no GitHub.
