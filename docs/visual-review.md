# Revisão visual da SW Sports

## Escopo

Identidade exclusivamente escura, com fotos oficiais, vermelho da marca e WhatsApp verde. Cabeçalho simplificado, hero com produto e preço, coleção com uma ação de compra por modelo, diferenciais sem caixas repetitivas, seção própria de atacado, FAQ e rodapé institucional. O carrossel repetido, o bloco vazio de avaliações e o CTA com brilho não são mais exibidos na home. A âncora histórica `#personalidade` continua levando à coleção.

O wrapper de conteúdo permanece visível em SSR e com movimento reduzido. As seções inferiores não dependem de animações nem de espaços reservados por `content-visibility`. Carrinho e checkout receberam apenas classes de apresentação; cálculos, handlers, estados, validações e integrações foram preservados. O checkout usa uma coluna em tablet e duas em desktop para manter o formulário legível.

Home tem imagem Open Graph oficial; atacado e políticas têm canonical próprio. Nenhuma dependência, preço, credencial, migration, regra de autenticação, estoque, pagamento, pedido ou frete foi alterado. O painel administrativo não recebeu alterações nesta revisão.

## Verificação

- Lint, testes existentes, suíte financeira PostgreSQL isolada e builds normal e Vercel Preview.
- Navegador em 320, 375, 390, 430, 768 e 1440 px; movimento reduzido também verificado.
- Imagens e visibilidade da coleção, quantidade/subtotal do carrinho, bloqueio sem frete, navegação, FAQ, links institucionais e formulário de atacado.
- Formulário de atacado verificado interceptando `window.open`: nenhuma mensagem foi enviada.
- Layout completo do checkout verificado com seleção sintética de frete apenas no armazenamento do navegador local, nunca enviada ao servidor. O endereço automático foi bloqueado nesse teste; o preenchimento manual permanece disponível. Isso não comprova cotação nem pagamento reais.
- Resultados e capturas da sessão estão em `/workspace/swsports-audit` (fora do Git).

## Publicação e limites

PR #15 na branch `feat/sw-sports-visual-stage-1`. Validar a implantação correspondente ao último commit antes de merge. O Preview exige autenticação Vercel e não deve ser declarado visualmente aprovado sem acesso ao site. Nenhum merge ou deploy de Production foi realizado pelo agente.

Login autenticado, painel privado, cotação real, pagamento, rastreamento, DNS e Production dependem de homologação autorizada. Os testes com mocks e o banco isolado não substituem essa homologação. Não desativar a proteção Vercel nem conectar credenciais financeiras de produção ao Preview para contornar esses limites.

## Conteúdo a coletar

- [PREENCHER COM AVALIAÇÕES REAIS DE CLIENTES] — comentário de comprador, produto adquirido e autorização para publicar nome/foto. Nenhuma estrela, média ou contagem deve ser inventada.
- [PENDENTE — CONFIRMAR MEDIDAS] — medidas reais de cada modelo e orientação de ajuste para uma tabela de tamanho. A FAQ orienta consultar o atendimento enquanto essas medidas não estão publicadas.
- [PENDENTE — PRODUZIR FOTO REAL] — fotografia opcional de pessoa usando a balaclava em ambiente outdoor, com estampa legível e versões horizontal e vertical. Não foi usada imagem genérica para substituir essa fotografia.
