# Card automático de balaclavas

A área de produto em `/experiencia` passa a ser um card com borda discreta, cantos moderados, contador, nome da estampa e controles próprios. A imagem muda a cada seis segundos, com uma transição de opacidade de 420ms. Não há rolagem animada, efeitos de cursor, 3D ou biblioteca adicional.

A próxima foto WebP é preparada somente quando o card está visível e a reprodução pode continuar. A troca espera a decodificação; imagem, nome, seleção e compra mudam juntos. Se a foto falhar, o modelo anterior permanece disponível e uma mensagem permite tentar novamente. Durante seleção manual pendente, o CTA aguarda a foto e seleções anteriores não podem substituir a última escolha.

Pausa temporária ao passar o mouse pelo hero, abrir carrinho, ocultar a aba ou sair da tela. Foco por teclado, setas, seletor e compra interrompem a reprodução até retomada explícita. Com movimento reduzido, a troca é manual e não há crossfade. O nome da estampa não é anunciado repetidamente durante reprodução automática.

## Verificação

- Lint sem erros; sete avisos existentes.
- 213 testes em 26 arquivos, incluindo 12 cenários de rotação, decode, pausas, movimento reduzido e concorrência de seleção.
- Testes financeiros em PostgreSQL isolado; builds normal e Vercel Preview aprovados.
- Chromium com build Vercel compilado: 320, 375, 390, 430, 768 e 1440px; movimento reduzido em 390 e 1440px. Verificados seleção, wrap das setas, pausa/retomada, hover, saída da tela, compra da estampa exibida, alvos de 44px, estabilidade do card e ausência de overflow/erros de hidratação.
- Falha da próxima imagem simulada no navegador: a foto atual continua visível e a rotação pausa.
- Rotação também confirmada com temporizador real, sem clock simulado, em desktop e mobile.
- Nenhum original PNG/JPEG de produto foi requisitado nesses fluxos. A codificação das fotos continua sendo a etapa anterior; este card reutiliza os WebPs.

Capturas reais do build local em `docs/previews/swsports-auto-card-desktop.png` e `swsports-auto-card-mobile.png`. Os scripts e resultados brutos desta sessão ficam em `/workspace/swsports-audit`. As métricas de carga de `premium-performance.md` medem a etapa anterior, antes deste autoplay; o novo card prepara uma foto adicional para evitar intervalos em branco.

Nenhuma alteração em preços, estoque, pedidos, autenticação, frete, pagamento, dependências ou migrations. Nenhuma transação real foi executada. A publicação em Production permanece pendente do cadastro e dos saldos reais dos seis novos modelos, conforme confirmado pelo proprietário.
