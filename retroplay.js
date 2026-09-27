/* RetroPlay — comportamento sob medida da página.
 *
 * 1. A TV liga com a rolagem (pico) — lê --avanco publicado por rolagem.js
 * 2. O jogo do cartucho roda na tela: passo fixo de 60 quadros por segundo
 * 3. Entrada: setas + Z + X no teclado, ou o controle na tela (toque)
 * 4. Movimento-assinatura: soprar o cartucho e encaixar na TV
 * 5. Som: select, chiado, estalo do tubo, música e vinhetas (audio.js)
 *
 * Os jogos vivem em jogos.js; as animações de rolagem, em rolagem.js.
 */
(function () {
  "use strict";

  var LARGURA = 256, ALTURA = 224, PASSO = 1000 / 60;
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CATALOGO = window.RetroJogos;
  var noop = function () {};
  var som = window.RetroSom || { sfx: noop, jingle: noop, musica: noop, parar: noop, chiado: noop, motor: noop, pronto: noop };

  var secao = document.getElementById("tela");
  var canvas = document.getElementById("tela-jogo");
  if (!secao || !canvas || !CATALOGO) return;

  var tv = secao.querySelector(".crt");
  var tela = canvas.getContext("2d");
  var luz = secao.querySelector(".crt__luz");
  var botaoJogar = document.getElementById("tv-jogar");
  var botoes = Array.prototype.slice.call(secao.querySelectorAll(".ctl"));
  var saidaCartucho = document.getElementById("no-cartucho");
  var saidaDica = document.getElementById("dica-jogo");
  var aviso = document.getElementById("aviso-cartucho");

  // o jogo desenha aqui; a TV copia para a tela com os efeitos da fase
  var quadroJogo = document.createElement("canvas");
  quadroJogo.width = LARGURA; quadroJogo.height = ALTURA;
  var gJogo = quadroJogo.getContext("2d");

  var chiado = document.createElement("canvas");
  chiado.width = LARGURA / 2; chiado.height = ALTURA / 2;
  var gChiado = chiado.getContext("2d");
  var dadosChiado = gChiado.createImageData(chiado.width, chiado.height);

  var idAtual = "irmaos-tijolo";
  var jogo = CATALOGO[idAtual].criar();
  var estado = "atrair";        // atrair | jogando | pausa | fim
  var trocaAte = 0;
  var visivel = false;
  var acumulado = 0, ultimo = 0;
  var progressoAnterior = 0;

  /* ---------- entrada ---------- */

  var segura = { esq: false, dir: false, cima: false, baixo: false, a: false, b: false };
  var apertou = { a: false, b: false };
  var soltou = { b: false };

  function montarEntrada() {
    var ent = {
      esq: segura.esq, dir: segura.dir, cima: segura.cima, baixo: segura.baixo,
      a: segura.a, b: segura.b, aPress: apertou.a, bPress: apertou.b, bSolto: soltou.b
    };
    apertou.a = apertou.b = soltou.b = false;
    return ent;
  }

  function pressionar(nome, ligado) {
    if (ligado && !segura[nome] && (nome === "a" || nome === "b")) apertou[nome] = true;
    if (!ligado && segura[nome] && nome === "b") soltou.b = true;
    segura[nome] = ligado;
  }

  function soltarTudo() {
    Object.keys(segura).forEach(function (k) { segura[k] = false; });
    apertou.a = apertou.b = false;
  }

  /* ---------- estados do jogo ---------- */

  function tvPronta() { return progresso() >= 0.6 && (visivel || reduzido); }

  function iniciar() {
    if (estado === "fim" || estado === "atrair") jogo.reiniciar();
    estado = "jogando";
    som.sfx("start");
    som.musica(idAtual);
    soltarTudo();
    acumulado = 0;
    tv.classList.add("crt--jogando");
    // garante a TV inteira presa na tela enquanto se joga
    var p = progresso();
    if (!reduzido && (p < 0.8 || p > 0.99)) rolarAteTV(false);
  }

  function pausar() {
    if (estado !== "jogando") return;
    estado = "pausa";
    soltarTudo();
    som.parar(); som.motor(null); som.sfx("pausa");
    tv.classList.remove("crt--jogando");
  }

  function alternarStart() {
    if (estado === "jogando") pausar();
    else if (tvPronta()) iniciar();
  }

  function rolarAteTV(instantaneo) {
    var topo = secao.getBoundingClientRect().top + window.scrollY;
    var destino = reduzido ? topo : topo + (secao.offsetHeight - window.innerHeight) * 0.9;
    window.scrollTo({ top: destino, behavior: instantaneo || reduzido ? "auto" : "smooth" });
  }

  /* ---------- desenho da tela ---------- */

  function faixa(p, a, b) { return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a); }

  function pintarChiado() {
    var d = dadosChiado.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = (Math.random() * 200) | 0;
      d[i] = v + 20; d[i + 1] = v + 14; d[i + 2] = v + 30; d[i + 3] = 255;
    }
    gChiado.putImageData(dadosChiado, 0, 0);
    tela.drawImage(chiado, 0, 0, LARGURA, ALTURA);
  }

  function texto(s, x, y, cor) {
    tela.font = '8px "Press Start 2P", monospace';
    tela.textBaseline = "top";
    tela.textAlign = "center";
    tela.fillStyle = "#0A0612"; tela.fillText(s, x + 1, y + 1);
    tela.fillStyle = cor || "#F2ECFF"; tela.fillText(s, x, y);
    tela.textAlign = "left";
  }

  function painel(linhas, agora) {
    var alto = linhas.length * 14 + 14;
    var y0 = Math.round((ALTURA - alto) / 2) + 20;
    tela.fillStyle = "rgba(10,6,18,0.82)";
    tela.fillRect(24, y0, LARGURA - 48, alto);
    tela.fillStyle = "#FF3E9E";
    tela.fillRect(24, y0, LARGURA - 48, 2); tela.fillRect(24, y0 + alto - 2, LARGURA - 48, 2);
    linhas.forEach(function (l, i) {
      if (l.piscar && !reduzido && Math.floor(agora / 520) % 2) return;
      texto(l.t, LARGURA / 2, y0 + 10 + i * 14, l.cor);
    });
  }

  function sobreposicao(agora) {
    var meta = CATALOGO[idAtual];
    if (estado === "atrair") {
      painel([
        { t: meta.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(), cor: "#FFD23F" },
        { t: "PRESS START", piscar: true },
        { t: "ENTER OU CLIQUE", cor: "#A99FCC" }
      ], agora);
    } else if (estado === "pausa") {
      painel([{ t: "PAUSA", cor: "#3FE0F0" }, { t: "ENTER PARA VOLTAR", cor: "#A99FCC" }], agora);
    } else if (estado === "fim") {
      var venceu = jogo.fim() === "venceu";
      painel([
        { t: venceu ? "VOCE VENCEU!" : "FIM DE JOGO", cor: venceu ? "#5ED16A" : "#FF3E9E" },
        { t: "PONTOS " + String(jogo.pontos()).padStart(6, "0") },
        { t: "ENTER: DE NOVO", piscar: true }
      ], agora);
    }
  }

  function renderizar(p, agora) {
    tela.imageSmoothingEnabled = false;

    // ponto de luz → linha → tela cheia (0.08 a 0.2)
    if (luz) {
      var a = faixa(p, 0.08, 0.2);
      if (a > 0 && a < 1) {
        var sx = a < 0.5 ? Math.max(0.02, a / 0.5) : 1;
        var sy = a < 0.5 ? 0.012 : 0.012 + ((a - 0.5) / 0.5) * 0.988;
        luz.style.opacity = a > 0.85 ? String(1 - (a - 0.85) / 0.15) : "1";
        luz.style.transform = "scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
      } else {
        luz.style.opacity = "0";
      }
    }
    tv.classList.toggle("crt--ligada", p >= 0.1);

    // som acompanha a imagem: estalo ao ligar, chiado enquanto a tela procura sinal
    if (p >= 0.08 && progressoAnterior < 0.08 && som.pronto()) som.sfx("liga");
    progressoAnterior = p;
    var nivelChiado = agora < trocaAte ? 1 : p >= 0.2 && p < 0.4 ? 1 : p >= 0.4 && p < 0.6 ? 1 - faixa(p, 0.4, 0.6) : 0;
    som.chiado(reduzido ? 0 : nivelChiado);

    if (estado !== "jogando") jogo.desenhar(gJogo);

    if (agora < trocaAte) {
      pintarChiado();
    } else if (p < 0.2) {
      tela.fillStyle = "#050607";
      tela.fillRect(0, 0, LARGURA, ALTURA);
    } else if (p < 0.4) {
      pintarChiado();
    } else if (p < 0.6) {
      var linhas = Math.round(faixa(p, 0.4, 0.6) * ALTURA);
      pintarChiado();
      if (linhas > 0) tela.drawImage(quadroJogo, 0, 0, LARGURA, linhas, 0, 0, LARGURA, linhas);
      tela.fillStyle = "rgba(242,236,255,0.85)";
      tela.fillRect(0, linhas, LARGURA, 2);
    } else {
      tela.drawImage(quadroJogo, 0, 0);
      if (p >= 0.75 || estado !== "atrair") sobreposicao(agora);
    }

    var acesos = p < 0.6 ? 0 : Math.min(grupos.length, Math.ceil(faixa(p, 0.6, 0.78) * grupos.length));
    grupos.forEach(function (grupo, i) {
      grupo.forEach(function (b) { b.classList.toggle("aceso", i < acesos); });
    });
  }

  var grupos = [
    botoes.filter(function (b) { return b.closest(".controle__dpad"); }),
    botoes.filter(function (b) { return b.dataset.botao === "select"; }),
    botoes.filter(function (b) { return b.dataset.botao === "start"; }),
    botoes.filter(function (b) { return b.dataset.botao === "a"; }),
    botoes.filter(function (b) { return b.dataset.botao === "b"; })
  ];

  function progresso() {
    if (reduzido) return 1;
    return parseFloat(secao.style.getPropertyValue("--avanco")) || 0;
  }

  /* ---------- laço principal ---------- */

  function laco(agora) {
    if (!visivel && !reduzido) return;
    var p = progresso();
    if (estado === "jogando" && !tvPronta()) pausar();
    if (estado === "jogando") {
      acumulado += Math.min(100, agora - (ultimo || agora));
      while (acumulado >= PASSO) {
        jogo.passo(montarEntrada());
        acumulado -= PASSO;
        if (jogo.fim()) {
          estado = "fim"; tv.classList.remove("crt--jogando");
          som.parar(); som.motor(null); som.jingle(jogo.fim() === "venceu" ? "venceu" : "perdeu");
          break;
        }
      }
      jogo.desenhar(gJogo);
    }
    ultimo = agora;
    renderizar(p, agora);
    requestAnimationFrame(laco);
  }

  if (reduzido) {
    visivel = true;
    requestAnimationFrame(laco);
  } else {
    new IntersectionObserver(function (entradas) {
      var agora = entradas[0].isIntersecting;
      if (agora && !visivel) { visivel = true; ultimo = 0; requestAnimationFrame(laco); }
      visivel = agora;
      if (!agora) { pausar(); som.chiado(0); }
    }).observe(secao);
    renderizar(0, performance.now());
  }

  /* ---------- teclado ---------- */

  var TECLAS = { ArrowLeft: "esq", ArrowRight: "dir", ArrowUp: "cima", ArrowDown: "baixo", z: "a", Z: "a", x: "b", X: "b" };

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var foco = document.activeElement;
    var focoComum = foco && foco !== document.body && foco !== botaoJogar && !(foco.closest && foco.closest(".controle"));

    if (e.key === "Enter" || e.key === "Escape") {
      if (e.key === "Escape") { pausar(); return; }
      // com um botão ou link focado, o Enter vira o clique nativo dele
      if ((foco && foco !== document.body) || e.repeat || !tvPronta()) return;
      e.preventDefault();
      alternarStart();
      return;
    }
    var nome = TECLAS[e.key];
    if (!nome) return;
    if (estado === "jogando") {
      e.preventDefault();                           // setas não rolam a página durante o jogo
      if (!e.repeat) pressionar(nome, true);
    } else if ((nome === "a") && tvPronta() && !focoComum && !e.repeat && estado !== "pausa") {
      e.preventDefault();
      iniciar();
    }
  });

  document.addEventListener("keyup", function (e) {
    var nome = TECLAS[e.key];
    if (nome) pressionar(nome, false);
  });
  window.addEventListener("blur", soltarTudo);

  if (botaoJogar) {
    botaoJogar.addEventListener("click", function () {
      if (estado === "jogando") pausar(); else iniciar();
    });
  }

  /* ---------- controle na tela (toque e mouse) ---------- */

  botoes.forEach(function (b) {
    var nome = b.dataset.botao;
    function ligar(e) {
      e.preventDefault();
      b.classList.add("apertado");
      if (nome === "start") { alternarStart(); return; }
      if (nome === "select") return;
      if (estado !== "jogando" && tvPronta() && (nome === "a" || nome === "b")) { iniciar(); return; }
      if (estado === "jogando") pressionar(nome, true);
    }
    function desligar() {
      b.classList.remove("apertado");
      if (nome !== "start" && nome !== "select") pressionar(nome, false);
    }
    b.addEventListener("pointerdown", ligar);
    b.addEventListener("pointerup", desligar);
    b.addEventListener("pointerleave", desligar);
    b.addEventListener("pointercancel", desligar);
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    // teclado sobre o botão focado: Enter/Espaço funcionam como toque
    b.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) { ligar(e); setTimeout(desligar, 150); }
    });
  });

  /* ---------- 4. Movimento-assinatura: soprar e encaixar o cartucho ---------- */

  var cartuchos = Array.prototype.slice.call(document.querySelectorAll(".cartucho"));

  function soprar(btn) {
    if (reduzido || btn.dataset.soprado) return;
    btn.dataset.soprado = "1";
    setTimeout(function () { delete btn.dataset.soprado; }, 700);
    for (var i = 0; i < 7; i++) {
      var grao = document.createElement("span");
      grao.className = "poeira";
      grao.style.left = (22 + Math.random() * 56) + "%";
      grao.style.setProperty("--dx", Math.round(Math.random() * 36 - 18) + "px");
      grao.style.animationDelay = Math.round(Math.random() * 140) + "ms";
      if (Math.random() < 0.4) { grao.style.width = "4px"; grao.style.height = "4px"; }
      btn.appendChild(grao);
      setTimeout(grao.remove.bind(grao), 1200);
    }
  }

  function aplicarMeta(id) {
    var meta = CATALOGO[id];
    tv.style.setProperty("--luz-tela", meta.luz);
    secao.style.setProperty("--luz-tela", meta.luz);
    canvas.setAttribute("aria-label", "Tela do jogo " + meta.nome);
    if (botaoJogar) botaoJogar.setAttribute("aria-label", "Jogar " + meta.nome);
    if (saidaCartucho) saidaCartucho.textContent = meta.nome + " · " + meta.genero + " · " + meta.console;
    if (saidaDica) saidaDica.textContent = meta.dica;
  }

  function encaixar(id) {
    if (!CATALOGO[id]) return;
    idAtual = id;
    jogo = CATALOGO[id].criar();
    estado = "atrair";
    soltarTudo();
    som.parar(); som.motor(null);
    tv.classList.remove("crt--jogando");
    cartuchos.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.jogo === id)); });
    aplicarMeta(id);
    if (aviso) aviso.textContent = CATALOGO[id].nome + " encaixado na TV. Aperte Enter para jogar.";
    trocaAte = reduzido ? 0 : performance.now() + 900;
    rolarAteTV();
    if (botaoJogar) botaoJogar.focus({ preventScroll: true });
    renderizar(progresso(), performance.now());
  }

  cartuchos.forEach(function (btn) {
    btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") soprar(btn); });
    btn.addEventListener("click", function () {
      som.sfx("select");
      btn.classList.remove("soprando");
      void btn.offsetWidth; // reinicia a animação
      btn.classList.add("soprando");
      soprar(btn);
      setTimeout(function () {
        btn.classList.remove("soprando");
        encaixar(btn.dataset.jogo);
      }, reduzido ? 0 : 420);
    });
  });

  // capas dos cartuchos: a primeira tela de cada jogo, desenhada em miniatura
  function desenharCapas() {
    document.querySelectorAll(".cartucho__tela").forEach(function (c) {
      var meta = CATALOGO[c.dataset.jogo];
      if (!meta) return;
      var g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      meta.criar().desenhar(g);
    });
  }

  /* ---------- painel de som: volume de efeitos, música e mudo ---------- */

  var botaoSom = document.getElementById("botao-som");
  var painelSom = document.getElementById("painel-som");
  var sliderEfeitos = document.getElementById("vol-efeitos");
  var sliderMusica = document.getElementById("vol-musica");
  var botaoMudo = document.getElementById("som-mudo");
  var RS = window.RetroSom;

  function mostrarSom() {
    var desligado = RS.mudo();
    botaoSom.setAttribute("aria-pressed", String(!desligado));
    botaoMudo.setAttribute("aria-pressed", String(desligado));
    botaoMudo.textContent = desligado ? "Ligar som" : "Silenciar tudo";
    sliderEfeitos.value = Math.round(RS.volumeEfeitos() * 100);
    sliderMusica.value = Math.round(RS.volumeMusica() * 100);
    document.getElementById("vol-efeitos-valor").textContent = sliderEfeitos.value + "%";
    document.getElementById("vol-musica-valor").textContent = sliderMusica.value + "%";
  }

  function abrirPainel(abrir) {
    painelSom.hidden = !abrir;
    botaoSom.setAttribute("aria-expanded", String(abrir));
  }

  if (botaoSom && painelSom && RS) {
    botaoSom.addEventListener("click", function () { abrirPainel(painelSom.hidden); });
    document.addEventListener("click", function (e) {
      if (!painelSom.hidden && !e.target.closest(".som")) abrirPainel(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !painelSom.hidden) { abrirPainel(false); botaoSom.focus(); }
    });

    var ultimaAmostra = 0;
    sliderEfeitos.addEventListener("input", function () {
      RS.volumeEfeitos(sliderEfeitos.value / 100);
      if (RS.mudo()) RS.alternarMudo();
      mostrarSom();
      // amostra do volume, sem metralhar enquanto arrasta
      var agora = performance.now();
      if (agora - ultimaAmostra > 160) { ultimaAmostra = agora; RS.sfx("moeda"); }
    });
    sliderMusica.addEventListener("input", function () {
      RS.volumeMusica(sliderMusica.value / 100);
      if (RS.mudo()) RS.alternarMudo();
      mostrarSom();
    });
    botaoMudo.addEventListener("click", function () { RS.alternarMudo(); mostrarSom(); });
    mostrarSom();
  } else if (botaoSom) {
    botaoSom.hidden = true;
  }

  aplicarMeta(idAtual);
  desenharCapas();
  if (document.fonts && document.fonts.load) {
    document.fonts.load('8px "Press Start 2P"').then(function () {
      desenharCapas();
      renderizar(progresso(), performance.now());
    }, function () {});
  }
})();
