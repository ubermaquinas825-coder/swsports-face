# Camisetas UV 50+

## Implementado

- Aba `/camisetas` no cabeçalho (desktop/mobile) e rodapé.
- Destaque com os três modelos logo após o hero da página inicial e link adicional no hero.
- Vitrine e modal de detalhes com a paleta escura, vermelho, fontes e botões existentes.
- Fotos originais na vitrine e nas galerias: cinco fotos na referência 01, cinco na 02 e duas na 03, com frente/costas e detalhes disponíveis.
- Preço de R$ 79,90 por camisa, confirmado pelo proprietário na conversa.
- Modelo/tamanho representados por SKUs distintos no carrinho persistente.
- Preços por SKU em centavos no carrinho, resumo, pedido e payload de pagamento Mercado Pago/Appmax.
- Embalagens de camisetas e carrinhos mistos por combinação exata medida, no painel **Frete e Envios**.
- Metadados e sitemap da nova página.

## Dados confirmados e fontes

As URLs e o índice do Mercado Livre identificam camisas iFood para entregador, manga longa, com proteção solar UV 50+, nas referências abaixo:

| Referência | Anúncio |
| --- | --- |
| 02 | https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-02-protecao-uv50/up/MLBU4740694356 |
| 03 | https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-03-protecao-uv50/up/MLBU4714185455 |
| 01 | https://www.mercadolivre.com.br/camisa-ifood-entregador-manga-longa-ref-01-protecao-uv50/up/MLBU4741204286 |

O proprietário enviou imagens e capturas dos anúncios na conversa. Com isso foram confirmados o tecido DrySport, modelo unissex, cores, descrições e tamanhos. As referências 01 e 02 oferecem PP, P, M, G, GG, XG e XGG; a referência 03 oferece P, M, G, GG, XG e XGG. A tabela de medidas da peça foi enviada para as referências 01 e 03: PP 49×66, P 50×68, M 52×70, G 55×76, GG 57×79, XG 60×80, XGG 62×84 (peito×altura em cm). PP aparece na tabela da referência 03 mas não no seletor do anúncio, portanto não é oferecido. Caimento Slim foi confirmado somente para a referência 02. Descontos condicionados ao Mercado Livre, avaliações e contagens de vendas não foram copiados.

O proprietário enviou um ZIP com 13 arquivos PNG: 12 fotos únicas e uma cópia idêntica da foto de frente da referência 03. Os originais foram copiados sem processamento de imagem, recorte ou alteração de cores; apenas receberam nomes por referência e vista. O arquivo `docs/camisetas-asset-manifest.json` registra os 13 uploads, a duplicata e os hashes SHA-256, tamanhos em bytes e dimensões de cada original. As galerias usam 5/5/2 fotos para as referências 01/02/03, respectivamente. Nenhuma foto de outro produto foi usada, nem foi gerada uma substituição.

Os arquivos também estão agrupados em ZIPs públicos por referência, sem adicionar downloads ao fluxo de compra:

- Referência 01: `/products/camisetas/arquivos/ref-01.zip`.
- Referência 02: `/products/camisetas/arquivos/ref-02.zip`.
- Referência 03: `/products/camisetas/arquivos/ref-03.zip`.

## Pendências para ativar a compra

Os modelos estão em `src/lib/products.ts`, em `shirtModels`, com `image` e `gallery` apontando para os PNGs originais, tamanhos confirmados preenchidos e `checkoutReady: false`. A vitrine exibe as fotos, características, tamanhos e medidas confirmados e mantém o botão de compra desativado. Esses modelos não são aceitos pelo checkout real enquanto faltam estoque e dados de embalagem.

Para cada referência:

1. Cadastrar os SKUs de tamanho no estoque interno pelo fluxo administrativo existente, com os mesmos identificadores produzidos por `shirtVariantFor`, por exemplo `camisa-ifood-ref-02-m`. Informar estoque real. A baixa de estoque de pagamentos aprovados requer o cadastro; não basta criar o SKU no frontend.
2. Medir os pacotes prontos e cadastrar em **Frete e Envios → Embalagens para camisetas**. Cada configuração descreve a quantidade exata de camisetas e de balaclavas, peso total embalado e medidas externas. Uma camisa, duas camisas e uma camisa + uma balaclava são combinações independentes; não há estimativa de capacidade.
3. Ativar `checkoutReady` só depois das confirmações anteriores, executar os testes e build e validar frete/pagamento no ambiente autorizado. A página não envia a compra ao Mercado Livre.

As fotos e grades já estão preenchidas. A tabela da referência 02 só deve ser acrescentada após confirmação; nenhuma tabela foi estimada para esse modelo.

As configurações antigas de frete continuam válidas: `apparelPackages` é opcional e pedidos apenas de balaclavas usam a regra anterior. Sem uma embalagem para a combinação de camisetas, o servidor não fornece cotação nem permite prosseguir com um frete estimado.

Nenhum banco de dados, estoque de produção ou cobrança foi alterado nesta implementação. O proprietário autorizou a publicação do código e o deploy do site existente, mantendo as camisetas sem compra ativa enquanto faltam dados logísticos e estoque real.

## Verificação

- Build de produção: `npm run build`.
- 97 testes locais em 14 arquivos passaram, incluindo seleção de tamanho, retorno de foco, carrinho misto, totais em centavos, payloads/snapshots dos pagamentos, embalagens exatas, validação de checkout e proteção de manutenção financeira. Os testes de pagamento usam respostas simuladas, sem criar cobranças.
- A suíte `shirt-assets.test.ts` valida hashes SHA-256, bytes, assinatura PNG e dimensões dos 13 uploads, a duplicata, os vínculos das 12 fotos às referências corretas e a presença dos três ZIPs públicos. Os testes de galeria usam fotos sintéticas isoladas e preservam o cenário sem fotos para um cadastro ainda incompleto.
- `git diff --check` passou.
- `tsc --noEmit` aponta erros em arquivos anteriores fora das alterações (estoque/relatórios, showcase, logística histórica e testes antigos). Não foram encontrados erros de tipos nos componentes/helpers/testes adicionados.
- Não houve verificação visual em navegador: o controlador `cua_repl.js` não está disponível neste ambiente. Também não houve transação real nem validação de credenciais de produção.

O build regenera `src/routeTree.gen.ts`; a árvore anterior também estava desatualizada em relação a rotas já presentes no repositório.
