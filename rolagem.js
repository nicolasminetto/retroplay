/* RetroPlay — animações guiadas pela rolagem.
 *
 * Declarativo: o HTML diz o que animar e este arquivo cuida do quando.
 *
 *   data-entra="surgir|subir|esquerda|direita"   aparece ao entrar na tela
 *   data-entra="palavras"                        título que se monta palavra por palavra
 *   data-entra="digitar"                         texto datilografado
 *   data-atraso="300" · data-duracao="900"       ajustes em milissegundos
 *
 *   <section class="cena-presa" data-telas="5" data-etapas="5">
 *     <div class="cena-presa__palco"> … .etapa … </div>
 *   </section>
 *   → o palco fica preso enquanto a seção rola; a seção recebe --avanco (0 a 1)
 *     e a .etapa da vez ganha a classe "ativa".
 *
 *   data-fundo="#0E0A1F"     cor de fundo da página quando a seção domina a tela
 *   data-paralaxe="0.2"      desloca contra a rolagem
 *   data-segue-mouse="10"    acompanha o ponteiro de leve (px)
 *
 * Com "reduzir movimento" ligado no sistema, tudo aparece parado e legível.
 */
(function () {
  "use strict";

  var raiz = document.documentElement;
  var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (semMovimento) raiz.classList.add("movimento-reduzido");

  function entre(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ---------- 1. entradas ---------- */

  function separarPalavras(el) {
    var palavras = el.textContent.trim().split(/\s+/);
    var passo = (parseFloat(el.dataset.duracao) || 700) / palavras.length;
    el.style.setProperty("--passo", Math.round(passo) + "ms");
    el.textContent = "";
    palavras.forEach(function (p, i) {
      var span = document.createElement("span");
      span.className = "palavra";
      span.style.setProperty("--i", i);
      span.textContent = p;
      el.appendChild(span);
      if (i < palavras.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  function digitar(el) {
    var texto = el.dataset.texto, duracao = parseFloat(el.dataset.duracao) || 1400, inicio = 0;
    el.classList.add("digitando");
    requestAnimationFrame(function quadro(t) {
      if (!inicio) inicio = t;
      var fracao = entre((t - inicio) / duracao, 0, 1);
      el.textContent = texto.slice(0, Math.round(texto.length * fracao));
      if (fracao < 1) requestAnimationFrame(quadro);
      else el.classList.remove("digitando");
    });
  }

  function prepararEntradas() {
    var elementos = Array.prototype.slice.call(document.querySelectorAll("[data-entra]"));
    elementos.forEach(function (el) {
      if (el.dataset.atraso) el.style.setProperty("--atraso", el.dataset.atraso + "ms");
      if (el.dataset.entra === "palavras") separarPalavras(el);
      if (el.dataset.entra === "digitar" && !semMovimento) {
        el.dataset.texto = el.textContent;
        el.textContent = "";
      }
    });

    if (semMovimento) {
      elementos.forEach(function (el) { el.classList.add("visivel"); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        observador.unobserve(el);
        el.classList.add("visivel");
        if (el.dataset.entra === "digitar") digitar(el);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    elementos.forEach(function (el) { observador.observe(el); });
  }

  /* ---------- 2. cenas presas ---------- */

  var cenas = [];

  function prepararCenas() {
    document.querySelectorAll(".cena-presa").forEach(function (secao) {
      var cena = {
        secao: secao,
        etapas: Array.prototype.slice.call(secao.querySelectorAll(".etapa")),
        ativa: -1
      };
      if (!semMovimento) secao.style.height = (parseFloat(secao.dataset.telas) || 3) * 100 + "vh";
      cenas.push(cena);
    });
  }

  function medirCena(cena) {
    var curso = cena.secao.offsetHeight - window.innerHeight;
    var avanco = curso > 0 ? entre(-cena.secao.getBoundingClientRect().top / curso, 0, 1) : 0;
    cena.secao.style.setProperty("--avanco", avanco.toFixed(4));
    if (!cena.etapas.length) return;
    var indice = Math.min(cena.etapas.length - 1, Math.floor(avanco * cena.etapas.length));
    if (indice === cena.ativa) return;
    cena.etapas.forEach(function (etapa, i) { etapa.classList.toggle("ativa", i === indice); });
    cena.ativa = indice;
  }

  /* ---------- 3. fundo da página ---------- */

  function prepararFundos() {
    var secoes = document.querySelectorAll("[data-fundo]");
    if (!secoes.length) return;
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) raiz.style.setProperty("--fundo-pagina", entrada.target.dataset.fundo);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    secoes.forEach(function (s) { observador.observe(s); });
  }

  /* ---------- 4. paralaxe e ponteiro ---------- */

  var paralaxes = [];

  function prepararParalaxes() {
    document.querySelectorAll("[data-paralaxe]").forEach(function (el) {
      paralaxes.push({ el: el, forca: parseFloat(el.dataset.paralaxe) || 0.2 });
    });
  }

  function moverParalaxes() {
    var meio = window.innerHeight / 2;
    paralaxes.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      p.el.style.transform = "translateY(" + ((r.top + r.height / 2 - meio) * -p.forca).toFixed(1) + "px)";
    });
  }

  function prepararPonteiro() {
    var alvos = document.querySelectorAll("[data-segue-mouse]");
    if (!alvos.length || !window.matchMedia("(pointer: fine)").matches) return;
    window.addEventListener("pointermove", function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      alvos.forEach(function (el) {
        var f = parseFloat(el.dataset.segueMouse) || 10;
        el.style.transform = "translate(" + (nx * f).toFixed(1) + "px, " + (ny * f).toFixed(1) + "px)";
      });
    }, { passive: true });
  }

  /* ---------- laço ---------- */

  var pendente = false;

  function atualizar() {
    pendente = false;
    cenas.forEach(medirCena);
    moverParalaxes();
  }

  function agendar() {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(atualizar);
  }

  function iniciar() {
    prepararEntradas();
    prepararCenas();
    prepararFundos();
    if (semMovimento) {
      // parado: todas as etapas visíveis, TV já ligada
      cenas.forEach(function (c) {
        c.secao.style.setProperty("--avanco", "1");
        c.etapas.forEach(function (e) { e.classList.add("ativa"); });
      });
      return;
    }
    prepararParalaxes();
    prepararPonteiro();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    atualizar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
