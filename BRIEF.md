# BRIEF — RetroPlay

Fonte: "Briefing Técnico — RetroPlay (Landing Page de Emulador Retrô)", 27/09/2026, @Nícolas.

## Entrevista

**1. O que é e pra quem é?**
Landing page de portfólio que apresenta o conceito de um emulador retrô (SNES/Mega Drive)
jogável no navegador. Mockup de produto, sem emulação real. Visitante: recrutadores e devs
avaliando design, UX e qualidade de código.

**2. Vibe (3–5 palavras) + referências de fora da internet**
"Locadora de sábado à tarde: nostálgica, calorosa, tátil."
Referências: uma locadora de VHS dos anos 90, a embalagem de cartucho, uma revista de
dicas de games impressa.

**3. Caminho do visitante**
Header/Nav → Hero → Como funciona → Tela do emulador (mock) → Biblioteca de jogos →
Stack técnica / Sobre → CTA final → Footer.

**4. O que ele precisa ACREDITAR no final?**
"Quem fez isso tem olho de designer e mão de engenheiro."

**5. Energia e O momento**
Hero média (convite) → Como funciona calma → **Tela do emulador INTENSA (pico)** →
Biblioteca média (exploração) → Stack/Sobre calma (leitura) → CTA final média (fechamento firme).
Pico: a TV de tubo "liga" com a rolagem — chiado, linha de varredura, cena de pixel art se
montando, controles acendendo.

**6. O que essa página faz que nenhuma outra faz?**
Soprar o cartucho: na biblioteca cada card é um cartucho; no hover/toque ele treme e solta
poeira em pixel; no clique ele "encaixa" na TV — a página rola até a tela e a cena muda de
cor e título conforme o gênero. Estado compartilhado entre seções.

**7. Materiais existentes**
Nenhum. Toda arte = pixel art original em código. Sem capas, logos, mascotes, personagens
ou ROMs. Jogos da biblioteca com nomes genéricos/fictícios (sem títulos comerciais).

---

## Jornada em cenas

| # | Cena | Vê | Sente | Passa a acreditar | Energia | Família de efeito |
|---|---|---|---|---|---|---|
| 1 | **Balcão** (Hero) | Título grande ancorado à esquerda em papel creme; TV de tubo desligada à direita, acompanhando o mouse; etiqueta de aluguel vermelha como CTA | Reconhecimento, sorriso | "Isso foi feito com cuidado" | média | Texto que se monta + Profundidade |
| 2 | **Verso da caixa** (Como funciona) | 3 passos como o verso de uma embalagem de cartucho, em colunas assimétricas com ícones em pixel | Calma, clareza | "A ideia é simples e bem explicada" | calma | Revelações |
| 3 | **A TV liga** ⚡ PICO | Sala escurece; ponto de luz → linha de varredura → chiado → cena de pixel art se monta linha a linha → D-pad/A/B/Start acendem | Arrepio nostálgico | "Olho de designer E mão de engenheiro" | INTENSA | Cena fixa longa (5 telas) + Fundo que viaja |
| 4 | **Prateleira** (Biblioteca) | Grid de cartuchos com nome, gênero e console; soprar e encaixar na TV | Brincadeira, curiosidade | "Até o detalhe tem estado e lógica" | média | Movimento-assinatura (JS próprio) + Revelações |
| 5 | **Revista de dicas** (Stack/Sobre) | Layout de revista em duas colunas: decisões de arquitetura, stack, terminal que digita o build | Confiança, leitura tranquila | "Sabe explicar o porquê das escolhas" | calma | Revelações laterais + Digitar (1x) |
| 6 | **Devolução** (CTA + Footer) | Fundo escuro, título firme, UMA chamada: ver o código; rodapé com aviso de portfólio | Fechamento | Vontade de abrir o repositório | média | Fundo que viaja |

**Curva de energia:** média → calma → **INTENSA** → média → calma → média. Nenhuma vizinha igual.

**Pico:** cena 3 — a TV ligando, cena fixa de 5 telas de rolagem.

**Movimento-assinatura:** soprar e encaixar o cartucho (cena 4 → cena 3).

## Decisões de design

- **Paleta (locadora de sábado à tarde):** fundo papel creme `#F1E6D2`, superfície papelão
  `#E2D3B8`, tinta marrom-café `#1F1712`, tinta suave `#6B5A4A`, sala escura `#15110E`.
  **Acento único:** vermelho etiqueta de aluguel `#D6402A` (CTA, pico, detalhe).
- **Tipografia:** Press Start 2P (display: logo, rótulos, títulos curtos) + Archivo (texto).
  Escala 15 / 18 / 24 / 36 / 56 / 88.
- **Stack:** HTML semântico + CSS (custom properties) + JavaScript puro + Canvas 2D para a
  pixel art + motor de rolagem próprio. Sem build — foco em fundamentos.
- **Biblioteca:** nomes de jogos fictícios, capas = padrões geométricos em CSS.
- **Legal:** nenhuma capa, logo, mascote, personagem ou ROM.

---

## Revisão 1 — 27/09/2026 (feedback do Nícolas)

**Pedido:** "ficou muito bege" → usar como referência de tons a foto de uma sala de games à
noite (fliperamas, neon, TVs de tubo); jogos que *lembrem* clássicos de plataforma, arcade de
barris, ratinho veloz e robô com canhão; TV de tubo dos anos 90 realista; jogar de verdade com
setas + Z + X.

**Decisões:**
- **Nova vibe:** "sala de games à noite" — índigo `#0E0A1F`, breu `#06040C`, tinta `#F2ECFF`,
  **acento magenta** `#FF3E9E` (CTAs, neon), ciano `#3FE0F0` (interação/tela), âmbar `#FFB347`
  (abajur, rótulos). O piso de design evitava neon; foi usado **a pedido**, com moderação:
  só o letreiro "Insert coin" e o título final brilham, como luz de ambiente.
- **Jogos jogáveis (jogos.js):** 5 originais em canvas 256×224, passo fixo 60 fps —
  Super Irmãos Tijolo (plataforma), Gorila no Guindaste (arcade de barris), Ratinho a Jato
  (corrida infinita), Robô Faísca (ação com tiro carregado), Turbo Asfalto '94 (corrida pseudo-3D).
- **Limite legal mantido:** mecânicas e gêneros homenageiam os clássicos; personagens, nomes e
  arte são autorais (briefing proíbe reproduzir personagens/franquias).
- **TV:** plástico preto/grafite anos 90, antena, vidro curvo com vinheta e reflexo, grade de
  fósforo + scanlines, painel com marca fictícia, botões e LED que fica verde ao ligar; a luz da
  tela tinge a sala com a cor do jogo.
- As setas só são capturadas durante a partida (não sequestram a rolagem); rolar para longe pausa.

## Revisão 2 — 27/09/2026 (som)

- **audio.js:** síntese em tempo real (Web Audio API), sem arquivos — pulso, triângulo e ruído,
  como os chips de 8/16 bits. Nada toca antes do primeiro gesto (regra dos navegadores).
- **Selecionar cartucho:** "select" de menu + chiado de troca de canal até a imagem voltar.
- **TV ligando com a rolagem:** estalo do tubo ao ligar; chiado acompanha a fase de busca de sinal.
- **Músicas:** composições originais no estilo de cada gênero (melodias protegidas não foram
  transcritas); Ratinho a Jato usa "La Cucaracha" (domínio público). Vinhetas de start, pausa,
  vitória e fim de jogo; efeitos de pulo, moeda, pisão, tiro, explosão, turbo, batida e motor.
- **Botão de som** no menu, com preferência lembrada no navegador.

## Revisão 3 — 27/09/2026 (precisão do pulo + volume)

- **Irmãos Tijolo:** o teste de chão olhava o último pixel dentro do personagem; com gravidade
  de 0,3 px/quadro, o operário só "pisava" em 1 de cada 3 quadros e o Z era perdido. Agora testa
  a linha logo abaixo dos pés, e ganhou buffer de pulo (6 quadros) e coyote time (6 quadros).
  Teste automatizado: 200/200 pulos parado e andando.
- **Painel de som** no menu: sliders de Efeitos e Música (0–100%, amostra sonora ao ajustar),
  botão "Silenciar tudo"; fecha com Esc ou clique fora; preferências salvas no navegador.

## Revisão 4 — 27/09/2026 (motor próprio)

- O motor de rolagem de terceiros foi substituído por `rolagem.js`, escrito para este projeto
  (entradas, títulos palavra a palavra, digitação, cena presa com avanço e etapas, fundo que
  muda, paralaxe e ponteiro). O repositório passa a conter só código próprio.
