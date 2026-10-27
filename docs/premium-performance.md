# SW Sports — revisão premium e leveza

## Entrega

A etapa aprovada remove a iluminação ligada ao cursor, o cubo, a cena de produtos repetida e os 175svh de rolagem sticky. O destaque passa a ser a balaclava, com título concreto, preço unitário visível e seleção por controle nativo. A página `/experiencia` foi preservada para comparação; a home também recebe as fotos otimizadas e a apresentação sem fundo.

Cabeçalho, menu e carrinho usam DOM normal e transições discretas de cor, sem Motion ou filtros de desfoque decorativos. Estados, handlers, quantidades, subtotal, seleção de frete, guard de checkout, autenticação e integrações não foram alterados. A dependência Motion permanece no lockfile para compatibilidade com um componente antigo sem importadores; ela não aparece nos bundles ativos da home ou da proposta.

## Fotos e arquivos

As seis novas montagens seguem a amostra aprovada e reutilizam o modelo de referência. São montagens digitais, não fotos de um novo ensaio. As estampas foram comparadas visualmente com os arquivos do ZIP. Os originais continuam intactos nos caminhos anteriores, com o manifesto SHA-256 do ZIP preservado.

As fontes de edição foram mantidas no ambiente, em `/workspace/swsports-audit/premium-models` e `/workspace/generated_images`. Não são carregadas pelo site. Os arquivos efetivamente publicados são derivados WebP transparentes, em 96px para miniaturas e 400/800px para imagens responsivas; os logos têm versões de 192/384px. `docs/product-image-variants.json` registra origem, SHA-256, dimensões e tamanho de cada derivado. A codificação foi feita fora do bundle da aplicação; nenhuma dependência de runtime foi adicionada.

| Conjunto | Bytes |
| --- | ---: |
| 12 fotos originais | 3.757.330 |
| 12 versões de 400px | 213.656 |
| 12 versões de 800px | 625.800 |
| 12 miniaturas de 96px | 29.700 |

As versões de 400px somam 94,3% menos bytes que os originais. O navegador escolhe o tamanho por `srcset`/`sizes`, e não baixa todas as variantes. Logo, esse inventário não equivale ao total transferido por uma visita. A troca das fotos não altera `UNIT_PRICE`, IDs, nomes, estoque ou histórico de pedidos.

## Comparação medida no navegador

Ensaio local com os builds de produção Vercel anterior e novo, usando o mesmo servidor de teste somente leitura. Cache frio, conexão simulada de 1,6Mbps/150ms e CPU 4x. Uma execução por viewport; serviços externos/fontes foram bloqueados igualmente. Assets locais foram servidos sem compressão HTTP adicional, portanto os bytes de JS/CSS não representam o Brotli/gzip real da Vercel. O ensaio serve para comparação controlada; não é Lighthouse, CrUX ou garantia de tempo em dispositivos reais.

| Viewport | Carga inicial anterior | Nova carga | Redução | LCP anterior | Novo LCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile 390px / DPR 2 | 5.007.218B | 1.161.584B | 76,8% | 6.080ms | 3.948ms |
| Desktop 1440px / DPR 1 | 5.007.218B | 1.215.310B | 75,7% | 5.980ms | 3.192ms |

No mobile, imagens baixadas na carga inicial passaram de 3.857.797 para 178.838 bytes. CLS foi 0 nos dois cenários. As somas de long tasks caíram de 1.176 para 866ms em mobile e de 1.902 para 1.158ms em desktop nessa amostra.

Separadamente, o inventário estático dos bundles mostrou JS gzip da home caindo de 288.820 para 243.989 bytes, e de `/experiencia` de 293.779 para 243.830 bytes. O chunk principal caiu de 220.250 para 175.676 bytes gzip. Os marcadores de Motion do bundle anterior não aparecem no novo.

Medições brutas da sessão: `/workspace/swsports-audit/baseline-production-profile.json`, `premium-production-profile.json`, `premium-comparison.json` e `premium-artifact-comparison.json`. Esses artefatos ficam fora do Git. As capturas da versão compilada estão em `docs/previews`.

## Verificação e limites

- Lint sem erros, com sete avisos existentes; 201 testes em 25 arquivos.
- Suíte financeira PostgreSQL isolada; build normal e build Vercel Preview.
- Browser em 320, 375, 390, 430, 768 e 1440px; movimento reduzido em 390/1440 e toque/DPR 2 no mobile.
- Doze produtos e todas as novas fotos carregados; transparência confirmada no pixel decodificado; nenhum pedido das fotos originais nos fluxos testados.
- Seleção, compra, quantidade, subtotal, persistência, guard sem frete, menu mobile, FAQ, atacado, políticas e resumo do checkout.
- Checkout completo apenas com fixture de frete no navegador local; nenhuma cotação, mensagem de WhatsApp, compra, etiqueta ou alteração de produção.

O Preview hospedado e o merge permanecem sujeitos à revisão autorizada. Autenticação administrativa, compra real, domínio/HTTPS e Production não foram revalidados por este ensaio. Não há publicação em Production nesta etapa. O material de avaliações reais e a tabela de medidas continuam dependendo de dados verdadeiros da marca; nada foi inventado.
