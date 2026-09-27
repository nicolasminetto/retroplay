# RetroPlay

Landing page conceitual de um emulador retrô de SNES e Mega Drive que roda no navegador — com
**cinco jogos originais jogáveis**, uma TV de tubo dos anos 90 que liga conforme você rola a
página e trilha sonora chiptune sintetizada em tempo real.

Peça de portfólio: o foco é design, experiência e qualidade de código. Não há emulação real
nem ROMs.

## Como rodar

Não há etapa de build. Basta servir a pasta:

```bash
git clone https://github.com/nicolasminetto/retroplay
npx serve retroplay
```

Controles: **setas** movem, **Z** pula, **X** age, **Enter** inicia ou pausa, **Esc** pausa.
No celular, use o controle na tela.

## Os jogos

| Cartucho | Gênero | Destaques técnicos |
|---|---|---|
| Super Irmãos Tijolo | Plataforma | Colisão por tiles, câmera com rolagem, buffer de pulo e *coyote time* |
| Gorila no Guindaste | Arcade | Máquina de estados para escadas, barris que descem vigas e escadas |
| Ratinho a Jato | Corrida infinita | Velocidade progressiva, pulo duplo, turbo com recarga |
| Robô Faísca | Ação | Plataformas de mão única, tiro carregado ao segurar X, ondas de inimigos |
| Turbo Asfalto '94 | Corrida | Estrada pseudo-3D linha a linha, força centrífuga nas curvas, contra o relógio |

Personagens, nomes e arte são autorais, inspirados em gêneros clássicos.

## Decisões de arquitetura

- **Sem framework, de propósito.** HTML semântico, CSS com custom properties e JavaScript puro.
  Uma landing estática não precisa de React, e o código fica legível do começo ao fim.
- **Passo fixo de 1/60 s.** O laço acumula o tempo real e avança a simulação em passos
  iguais, então o jogo roda na mesma velocidade em monitores de 60 a 144 Hz.
- **Sprites feitos de texto.** Cada personagem é uma lista de linhas em que cada letra é uma
  cor da paleta. As capas dos cartuchos são a primeira tela de cada jogo, desenhada em miniatura.
- **Canvas 256 × 224**, a resolução nativa do SNES, ampliado com `image-rendering: pixelated`
  e exibido em 4:3, como numa TV de verdade.
- **A rolagem é o botão de liga.** `rolagem.js` prende a TV na tela com `position: sticky` e
  publica um único valor de avanço (0 a 1) na variável CSS `--avanco`; ele comanda o feixe de
  luz, o chiado, a imagem descendo e os controles acendendo. As demais animações são declaradas
  no HTML (`data-entra`, `data-fundo`, `data-paralaxe`) e disparadas por `IntersectionObserver`.
- **Som sem arquivos.** `audio.js` sintetiza pulso, triângulo e ruído com a Web Audio API, como
  os chips da época. Um sequenciador com agendamento antecipado toca as faixas sem atrasos.
  As músicas são composições originais; a do Ratinho a Jato é *La Cucaracha* (domínio público).
- **Acessibilidade.** As setas só são capturadas durante a partida, para nunca sequestrar a
  rolagem. Com movimento reduzido, nada se mexe sozinho. Cartuchos e controles são botões
  de verdade, com foco visível, e a troca de jogo é anunciada para leitores de tela.

## Estrutura

```
index.html            página e conteúdo
estilos.css           identidade visual e a TV de tubo em CSS
jogos.js              os cinco jogos (física, colisão, desenho)
retroplay.js          TV, entrada (teclado e toque), cartuchos, painel de som
audio.js              síntese de som, efeitos e sequenciador de músicas
rolagem.js            animações guiadas pela rolagem (entradas, cena presa, fundo, paralaxe)
```

## Créditos

- Fontes: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) e
  [Archivo](https://fonts.google.com/specimen/Archivo), via Google Fonts.

SNES e Mega Drive são marcas de seus respectivos proprietários.

---

Feito por **Nícolas Minetto** · [GitHub](https://github.com/nicolasminetto) ·
[LinkedIn](https://www.linkedin.com/in/nicolas-minetto-658938ab/)
