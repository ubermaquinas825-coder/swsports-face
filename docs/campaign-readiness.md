# Preparação para campanhas de tráfego

## Melhorias implementadas

- A vitrine deixa de baixar a interface administrativa, o SDK de autenticação e o
  cálculo de frete na entrada. O carrinho carrega no primeiro uso e mantém o frete
  escolhido ao fechar e reabrir. Uma falha no download do carrinho apresenta uma
  recuperação local, sem derrubar a vitrine.
- A imagem inicial do destaque tem preload responsivo. O catálogo informa o
  tamanho real das imagens ao navegador. A rotação pausa fora da tela, com a aba
  oculta, com o carrinho aberto ou com preferência por movimento reduzido.
- Inter e Space Grotesk são servidas pela própria loja, com `font-display: swap`;
  não há dependência de CSS ou conexão com Google Fonts.
- Fontes com nome versionado têm cache imutável de um ano. Fotos otimizadas têm
  cache de um dia e revalidação em segundo plano. As regras estão também no
  artefato Nitro/Vercel; não abrangem HTML, dados de clientes ou APIs.
- A consulta opcional ViaCEP tem limite de oito segundos. Falhas liberam o
  preenchimento manual; respostas atrasadas não sobrescrevem esse preenchimento.
  A cotação de frete e as validações de pagamento continuam obrigatórias.

## Medição publicitária

O Pixel Meta `725374147272634` mede **PageView** em `/` e `/atacado`, respeitando
o consentimento e a preferência de privacidade do navegador. Não mede compra
confirmada nem envia dados de cadastro ou pagamento.

URLs de campanha aceitam `fbclid`, `gclid`, `gbraid`, `wbraid`, `utm_source`,
`utm_medium`, `utm_campaign`, `utm_id`, `utm_term` e `utm_content`. Os valores podem
conter letras, inclusive acentos, números, espaços, `_`, `.`, `~`, `+` e `-`, até
500 caracteres. Não inserir dados pessoais nas UTMs. Parâmetros desconhecidos,
valores fora desse formato ou fragmentos desconhecidos bloqueiam a inicialização
publicitária. As âncoras permitidas são `#colecao`, `#personalidade`, `#kits` e
`#faq`. A política de privacidade, login, administração e checkout não são páginas
de medição.

Downloads publicitários que falham podem ser retomados numa nova atualização
permitida de página, consentimento ou conexão. Não há repetição automática
infinita. Recusar durante o download remove eventos ainda pendentes da fila.

## Evidências locais

Comparação do mesmo conjunto recursivo de imports estáticos da entrada e da
home, em builds de produção, excluindo imports dinâmicos:

| JavaScript inicial | Antes | Depois | Redução |
| --- | ---: | ---: | ---: |
| Sem compressão | 860.582 bytes | 551.541 bytes | 35,9% |
| Gzip, mesmo compressor | 270.786 bytes | 182.713 bytes | 32,5% |

Isso mede o grafo de dependências, não latência real, Core Web Vitals ou capacidade
de usuários simultâneos. As duas fontes locais somam 70.544 bytes, contabilizados
separadamente do JavaScript.

Validações executadas:

- 240 testes em 30 arquivos, incluindo carrinho sob demanda, persistência de frete,
  falha de carregamento, autenticação de RPC, consulta de CEP e consentimento.
- `npm run lint`: zero erros, sete avisos existentes de Fast Refresh.
- `npm run build` e `VERCEL=1 npm run build`: builds aprovados. Este último valida
  a compilação do alvo Vercel; não substitui a verificação de variáveis feita por
  `build:vercel` nem executa uma publicação.
- Chromium em 360, 390 e 1440px, tanto no desenvolvimento quanto no artefato
  Vercel servido localmente: sem rolagem horizontal; fontes e imagem carregadas;
  produto preservado após recarregar; PageView único com UTMs acentuadas após o
  aceite. SDK da Meta simulado; nenhum evento artificial enviado à conta.
- `tsc --noEmit` ainda aponta erros anteriores de tipos do banco, páginas
  administrativas e testes existentes; não é uma validação aprovada.

## Validação no site publicado

As alterações locais precisam ser publicadas antes de afetar o domínio real.
O acesso ao domínio publicado não está liberado na rede desta sessão; a entrega
real de eventos à Meta e o funcionamento dos provedores de produção não foram
confirmados por estes testes.

Após publicar, acessar a home com uma URL de campanha, aceitar os cookies e
confirmar o Pixel e um único PageView no Meta Pixel Helper e em **Testar eventos**
no Gerenciador de Eventos. Confirmar também uma cotação de frete e o fluxo de
pagamento no ambiente apropriado. Campanhas otimizadas para compra dependem de
uma integração de compra confirmada, que não faz parte deste Pixel de PageView.
Não desativar manutenção financeira nem aplicar migrações para executar estes
testes de desempenho.
