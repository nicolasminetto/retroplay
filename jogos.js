/* RetroPlay — cinco jogos originais em canvas 256 × 224.
 *
 * Cada jogo é uma fábrica que devolve { reiniciar, passo(ent), desenhar(g), pontos(), fim() }.
 * passo() roda a 60 quadros por segundo (passo fixo, controlado por retroplay.js).
 * ent = { esq, dir, cima, baixo, a, b, aPress, bPress, bSolto }  — a = Z (pular), b = X (ação).
 *
 * Inspirados em gêneros clássicos; personagens, nomes e arte são autorais.
 */
(function () {
  "use strict";

  var W = 256, H = 224;

  /* ---------- utilidades ---------- */

  function txt(g, s, x, y, cor, alinhar) {
    g.font = '8px "Press Start 2P", monospace';
    g.textBaseline = "top";
    g.textAlign = alinhar || "left";
    g.fillStyle = "#0A0612";
    g.fillText(s, x + 1, y + 1);
    g.fillStyle = cor || "#F2ECFF";
    g.fillText(s, x, y);
    g.textAlign = "left";
  }

  // sprite a partir de linhas de texto: cada caractere é uma cor da paleta ("." = vazio)
  function spr(g, linhas, pal, x, y, virar) {
    x = Math.round(x); y = Math.round(y);
    for (var r = 0; r < linhas.length; r++) {
      var linha = linhas[r], n = linha.length;
      for (var c = 0; c < n; c++) {
        var cor = pal[linha[c]];
        if (!cor) continue;
        g.fillStyle = cor;
        g.fillRect(x + (virar ? n - 1 - c : c), y + r, 1, 1);
      }
    }
  }

  function bate(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function num(n, casas) { return String(Math.max(0, Math.floor(n))).padStart(casas, "0"); }
  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }

  // efeitos sonoros (audio.js); sem ele, os jogos seguem mudos
  function som(nome) { if (window.RetroSom) window.RetroSom.sfx(nome); }

  function estrelas(g, semente, qtd, ate, cor) {
    var s = semente;
    g.fillStyle = cor;
    for (var i = 0; i < qtd; i++) {
      s = (s * 9301 + 49297) % 233280;
      var x = Math.floor((s / 233280) * W);
      s = (s * 9301 + 49297) % 233280;
      g.fillRect(x, Math.floor((s / 233280) * ate), 1, 1);
    }
  }

  /* ---------- sprites compartilhados ---------- */

  // operário de capacete (herói dos jogos 1 e 2)
  var OP_CORPO = [
    "....YYYY....",
    "..YYYYYYYY..",
    ".YYYYYYYYYY.",
    "...SSSSSS...",
    "...SKSSKS...",
    "...SSSSSS...",
    "....SMMS....",
    "..OBBBBBBO..",
    ".SOBBBBBBOS.",
    ".S.BBBBBB.S.",
    "...DDDDDD..."
  ];
  var OP_PERNAS = [
    ["...DD..DD...", "...DD..DD...", "..FFF..FFF.."],
    ["..DD....DD..", ".DD......DD.", ".FF......FF."],
    ["..DDD.DD....", "..DD....DD..", "..FF.....FF."]
  ];
  var OP_PAL = { Y: "#FFD23F", S: "#F2B890", K: "#1A1020", M: "#B0503A", O: "#FF7A1F", B: "#2F7FE0", D: "#3A3F8A", F: "#6A3A20" };

  function operario(g, x, y, quadro, virar) {
    spr(g, OP_CORPO.concat(OP_PERNAS[quadro]), OP_PAL, x, y, virar);
  }

  /* =====================================================================
     1. SUPER IRMÃOS TIJOLO — plataforma com rolagem lateral
     ===================================================================== */

  function Tijolo() {
    var T = 16, COLS = 124, ROWS = 14, BANDEIRA = 116;
    var mapa, inimigos, moedas, part, j, cam, pts, qtdMoedas, vidas, fim, quadro, checkpoint;

    var BESOURO = [
      "....KKKKKK....",
      "..KKPPPPPPKK..",
      ".KPPPPPPPPPPK.",
      ".KPWWPPPPWWPK.",
      "KPPWKPPPPKWPPK",
      "KPPPPPPPPPPPPK",
      ".KKKKKKKKKKKK.",
      "..FF......FF..",
      ".FFF......FFF."
    ];
    var BESOURO_PAL = { K: "#1A1020", P: "#8A3FD0", W: "#F2ECFF", F: "#FFB347" };

    function montar() {
      mapa = [];
      for (var r = 0; r < ROWS; r++) { var l = []; for (var c = 0; c < COLS; c++) l.push(0); mapa.push(l); }
      var buracos = [23, 24, 42, 43, 44, 71, 72, 90, 91];
      for (c = 0; c < COLS; c++) if (buracos.indexOf(c) < 0) { mapa[12][c] = 1; mapa[13][c] = 1; }
      function linha(rr, c0, c1, t) { for (var cc = c0; cc <= c1; cc++) mapa[rr][cc] = t; }
      linha(8, 12, 16, 2); mapa[8][14] = 3; mapa[4][14] = 3;
      linha(8, 30, 33, 2); mapa[8][31] = 3;
      linha(5, 35, 39, 2); mapa[5][37] = 3;
      var i, h;
      for (i = 0; i < 5; i++) for (h = 0; h <= i; h++) mapa[11 - h][54 + i] = 5;
      for (i = 0; i < 5; i++) for (h = 0; h <= 4 - i; h++) mapa[11 - h][61 + i] = 5;
      linha(8, 76, 80, 2); mapa[8][76] = 3; mapa[8][78] = 3;
      linha(7, 95, 99, 2); mapa[7][97] = 3;
      for (i = 0; i < 8; i++) for (h = 0; h <= i; h++) mapa[11 - h][104 + i] = 5;
    }

    function reiniciar() {
      montar();
      moedas = [[19, 9], [20, 9], [21, 9], [47, 8], [48, 8], [49, 8], [84, 9], [85, 9], [86, 9], [100, 5], [101, 5]]
        .map(function (m) { return { x: m[0] * T + 5, y: m[1] * T + 3, w: 6, h: 10, ok: true }; });
      inimigos = [20, 28, 38, 48, 52, 68, 82, 86, 98]
        .map(function (c) { return { x: c * T, y: 182, w: 14, h: 9, vx: -0.45, vy: 0, ia: true, vivo: true, morto: 0 }; });
      part = [];
      pts = 0; qtdMoedas = 0; vidas = 3; fim = null; quadro = 0; checkpoint = 32;
      renascer();
    }

    function renascer() {
      j = { x: checkpoint, y: 150, w: 12, h: 14, vx: 0, vy: 0, chao: false, dir: 1, inv: 60, buffer: 0, coyote: 0 };
      cam = Math.max(0, checkpoint - 100);
    }

    function tile(tx, ty) {
      if (tx < 0 || tx >= COLS) return 1;
      if (ty < 0 || ty >= ROWS) return 0;
      return mapa[ty][tx];
    }
    function solido(t) { return t >= 1 && t <= 5; }

    function moverX(o) {
      o.x += o.vx;
      var y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T), tx, ty;
      if (o.vx > 0) {
        tx = Math.floor((o.x + o.w - 1) / T);
        for (ty = y0; ty <= y1; ty++) if (solido(tile(tx, ty))) { o.x = tx * T - o.w; o.vx = o.ia ? -o.vx : 0; return; }
      } else if (o.vx < 0) {
        tx = Math.floor(o.x / T);
        for (ty = y0; ty <= y1; ty++) if (solido(tile(tx, ty))) { o.x = (tx + 1) * T; o.vx = o.ia ? -o.vx : 0; return; }
      }
    }

    function moverY(o, aoBater) {
      o.y += o.vy; o.chao = false;
      var x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 1) / T), tx, ty;
      if (o.vy > 0) {
        // testa a linha logo abaixo dos pés: encostar no chão já conta como pisar nele
        ty = Math.floor((o.y + o.h) / T);
        for (tx = x0; tx <= x1; tx++) if (solido(tile(tx, ty))) { o.y = ty * T - o.h; o.vy = 0; o.chao = true; return; }
      } else if (o.vy < 0) {
        ty = Math.floor(o.y / T);
        for (tx = x0; tx <= x1; tx++) if (solido(tile(tx, ty))) { o.y = (ty + 1) * T; o.vy = 0; if (aoBater) aoBater(tx, ty); return; }
      }
    }

    function bater(tx, ty) {
      var t = mapa[ty][tx];
      if (t === 3) {
        mapa[ty][tx] = 4; pts += 200; qtdMoedas++; som("moeda");
        part.push({ moeda: true, x: tx * T + 5, y: ty * T - 10, vx: 0, vy: -3.5, vida: 26 });
      } else if (t === 2) {
        mapa[ty][tx] = 0; pts += 50; som("tijolo");
        for (var i = 0; i < 4; i++) {
          part.push({ x: tx * T + 4 + (i % 2) * 8, y: ty * T + 4 + (i > 1 ? 8 : 0), vx: (i % 2 ? 1.2 : -1.2), vy: i > 1 ? -2 : -3.5, vida: 50 });
        }
      }
    }

    function morrer() {
      vidas--;
      if (vidas <= 0) { fim = "perdeu"; return; }
      som("dano");
      renascer();
    }

    function passo(e) {
      quadro++;
      var max = e.b ? 2.5 : 1.6, acel = j.chao ? 0.14 : 0.09;
      if (e.esq) { j.vx = Math.max(j.vx - acel, -max); j.dir = -1; }
      else if (e.dir) { j.vx = Math.min(j.vx + acel, max); j.dir = 1; }
      else { j.vx *= j.chao ? 0.8 : 0.95; if (Math.abs(j.vx) < 0.05) j.vx = 0; }
      if (Math.abs(j.vx) > max) j.vx *= 0.94;
      // folgas de precisão: Z apertado pouco antes de pousar ainda vale (buffer),
      // e dá para pular alguns quadros depois de sair da borda (coyote time)
      if (e.aPress) j.buffer = 6; else if (j.buffer > 0) j.buffer--;
      if (j.chao) j.coyote = 6; else if (j.coyote > 0) j.coyote--;
      if (j.buffer > 0 && j.coyote > 0 && j.vy >= 0) {
        j.vy = -5.8 - Math.abs(j.vx) * 0.25; j.buffer = 0; j.coyote = 0; som("pulo");
      }
      if (!e.a && j.vy < -2) j.vy += 0.5;
      j.vy = Math.min(j.vy + 0.3, 6);
      moverX(j);
      if (j.x < cam) { j.x = cam; if (j.vx < 0) j.vx = 0; }
      moverY(j, bater);
      if (j.inv > 0) j.inv--;
      if (j.y > H + 16) { morrer(); return; }
      if (j.x > 51 * T) checkpoint = Math.max(checkpoint, 51 * T);
      if (j.x > 100 * T) checkpoint = Math.max(checkpoint, 100 * T);
      if (j.x >= BANDEIRA * T) { fim = "venceu"; pts += 1000; return; }
      cam = Math.max(cam, Math.min(j.x - 100, COLS * T - W));

      for (var i = 0; i < inimigos.length; i++) {
        var n = inimigos[i];
        if (!n.vivo) { if (n.morto > 0) n.morto--; continue; }
        if (n.x > cam + W + 32 || n.x < cam - 64) continue;
        n.vy = Math.min(n.vy + 0.3, 6);
        moverX(n); moverY(n);
        if (n.y > H) { n.vivo = false; continue; }
        if (bate(j, n)) {
          if (j.vy > 0 && j.y + j.h - n.y < 8) { n.vivo = false; n.morto = 30; j.vy = -4; pts += 100; som("pisao"); }
          else if (j.inv === 0) { morrer(); return; }
        }
      }
      moedas.forEach(function (m) {
        if (m.ok && bate(j, m)) { m.ok = false; qtdMoedas++; pts += 100; som("moeda"); }
      });
      part = part.filter(function (p) { p.vy += 0.3; p.x += p.vx; p.y += p.vy; return --p.vida > 0; });
    }

    function desenharTile(g, t, x, y, linha) {
      if (t === 1) {
        g.fillStyle = "#C8743A"; g.fillRect(x, y, T, T);
        g.fillStyle = "#8A4420"; g.fillRect(x, y + 15, T, 1); g.fillRect(x + (linha % 2 ? 0 : 8), y, 1, T);
        if (linha === 12) { g.fillStyle = "#5ED16A"; g.fillRect(x, y, T, 4); g.fillStyle = "#2E9A4A"; g.fillRect(x, y + 4, T, 1); }
      } else if (t === 2) {
        g.fillStyle = "#C0502A"; g.fillRect(x, y, T, T);
        g.fillStyle = "#F0B07A"; g.fillRect(x, y + 7, T, 1); g.fillRect(x, y + 15, T, 1);
        g.fillRect(x + 4, y, 1, 7); g.fillRect(x + 12, y + 8, 1, 7);
      } else if (t === 3) {
        g.fillStyle = "#7A4210"; g.fillRect(x, y, T, T);
        g.fillStyle = quadro % 40 < 20 ? "#FFB020" : "#FFC850"; g.fillRect(x + 1, y + 1, 14, 14);
        g.fillStyle = "#7A4210";
        g.fillRect(x + 5, y + 3, 6, 2); g.fillRect(x + 10, y + 4, 2, 4); g.fillRect(x + 7, y + 7, 3, 2); g.fillRect(x + 7, y + 11, 2, 2);
      } else if (t === 4) {
        g.fillStyle = "#5A3A2A"; g.fillRect(x, y, T, T);
        g.fillStyle = "#8A5A3A"; g.fillRect(x + 1, y + 1, 14, 14);
      } else if (t === 5) {
        g.fillStyle = "#7A4A2A"; g.fillRect(x, y, T, T);
        g.fillStyle = "#F0B070"; g.fillRect(x, y, T - 1, T - 1);
        g.fillStyle = "#D08850"; g.fillRect(x + 1, y + 1, T - 2, T - 2);
      }
    }

    function desenhar(g) {
      g.fillStyle = "#6B8CFF"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#86A2FF"; g.fillRect(0, 110, W, 90);
      var i, x;
      for (i = 0; i < 7; i++) { // nuvens
        x = ((i * 150 - cam * 0.3) % 1050 + 1050) % 1050 - 60;
        var y = 30 + (i % 3) * 22;
        g.fillStyle = "#F2ECFF"; g.fillRect(x, y + 4, 40, 8); g.fillRect(x + 8, y, 22, 6);
        g.fillStyle = "#C9D4FF"; g.fillRect(x, y + 11, 40, 2);
      }
      for (x = 0; x < W; x++) { // colinas
        var wx = x + cam * 0.5;
        var h = Math.round(34 + 16 * Math.sin(wx / 38) + 8 * Math.sin(wx / 13));
        g.fillStyle = "#3FAF5A"; g.fillRect(x, 192 - h, 1, h);
        g.fillStyle = "#2E8A48"; g.fillRect(x, 192 - h, 1, 2);
      }
      var c0 = Math.floor(cam / T);
      for (var r = 0; r < ROWS; r++) {
        for (var c = c0; c <= c0 + 17 && c < COLS; c++) {
          if (mapa[r][c]) desenharTile(g, mapa[r][c], c * T - Math.round(cam), r * T, r);
        }
      }
      // bandeira
      var bx = BANDEIRA * T + 7 - Math.round(cam);
      if (bx > -20 && bx < W + 20) {
        g.fillStyle = "#E0E0F0"; g.fillRect(bx, 40, 2, 152);
        g.fillStyle = "#FFD23F"; g.fillRect(bx - 2, 36, 6, 6);
        g.fillStyle = "#FF3E9E"; for (i = 0; i < 12; i++) g.fillRect(bx - 1 - (12 - i), 44 + i / 2, 12 - i, 1);
        g.fillStyle = "#FF3E9E"; g.fillRect(bx - 13, 44, 13, 10);
      }
      moedas.forEach(function (m) {
        if (!m.ok) return;
        var mx = m.x - Math.round(cam);
        g.fillStyle = "#7A4210"; g.fillRect(mx, m.y, 6, 10);
        g.fillStyle = "#FFD23F"; g.fillRect(mx + 1, m.y + 1, 4, 8);
        g.fillStyle = "#FFF3B0"; g.fillRect(mx + 2, m.y + 2, 1, 4);
      });
      inimigos.forEach(function (n) {
        var nx = n.x - Math.round(cam);
        if (n.vivo) spr(g, BESOURO, BESOURO_PAL, nx, n.y, Math.floor(quadro / 10) % 2 === 0);
        else if (n.morto > 0) { g.fillStyle = "#8A3FD0"; g.fillRect(nx, n.y + 6, 14, 3); }
      });
      part.forEach(function (p) {
        g.fillStyle = p.moeda ? "#FFD23F" : "#C0502A";
        g.fillRect(p.x - Math.round(cam), p.y, p.moeda ? 6 : 4, p.moeda ? 9 : 4);
      });
      if (!(j.inv > 0 && quadro % 4 < 2)) {
        var perna = !j.chao ? 2 : (Math.abs(j.vx) > 0.1 && Math.floor(quadro / 6) % 2) ? 1 : 0;
        operario(g, j.x - Math.round(cam), j.y, perna, j.dir < 0);
      }
      txt(g, num(pts, 6), 8, 8);
      g.fillStyle = "#FFD23F"; g.fillRect(92, 7, 5, 9);
      txt(g, "x" + num(qtdMoedas, 2), 100, 8);
      txt(g, "VIDAS " + vidas, 248, 8, null, "right");
    }

    reiniciar();
    return { reiniciar: reiniciar, passo: passo, desenhar: desenhar, pontos: function () { return pts; }, fim: function () { return fim; } };
  }

  /* =====================================================================
     2. GORILA NO GUINDASTE — arcade de vigas, escadas e barris
     ===================================================================== */

  function Gorila() {
    var NIV = [208, 176, 144, 112, 80, 48];            // topo de cada viga
    var EXT = [[0, 256], [8, 232], [24, 248], [8, 232], [24, 248], [8, 232]];
    var DIRB = [-1, 1, -1, 1, -1, 1];                   // sentido dos barris em cada viga
    var ESC = [200, 60, 190, 70, 180];                  // escada do nível i para o i+1
    var META = { x: 150, y: 48 - 16, w: 12, h: 16 };
    var j, barris, pts, vidas, fim, quadro, timer, arremesso, avisos;

    var GORILA = [
      "........KKKKKKKK........",
      "......KGGGGGGGGGGK......",
      ".....KGGGGGGGGGGGGK.....",
      ".....KGGFFFFFFFFGGK.....",
      ".....KGFWKFFFFKWFGK.....",
      ".....KGFFFFFFFFFFGK.....",
      "......KGFFMMMMFFGK......",
      "...KKKKGGFFFFFFGGKKKK...",
      "..KGGGGGGGGGGGGGGGGGGK..",
      ".KGGGGGGGFFFFFGGGGGGGGK.",
      ".KGGGKGGFFFFFFFGGKGGGGK.",
      "KGGGK.KGGFFFFFGGK.KGGGGK",
      "KFFFK.KGGGGGGGGGK.KFFFFK",
      "KFFK..KGGGGGGGGGK..KFFK.",
      ".KK...KGGGGGGGGGK...KK..",
      "......KGGGK.KGGGK.......",
      ".....KGGGK...KGGGK......",
      ".....KFFFK...KFFFK......",
      "......KKK.....KKK......."
    ];
    var GORILA_BRACOS = [
      "KFFK....KKKKKKKK....KFFK",
      "KGGK..KGGGGGGGGGGK..KGGK",
      "KGGGKKGGGGGGGGGGGGKKGGGK",
      ".KGGGKGGFFFFFFFFGGKGGGK.",
      "..KGGKGFWKFFFFKWFGKGGK..",
      "...KKKGFFFFFFFFFFGKKK...",
      "......KGFFMMMMFFGK......",
      "......KGGFFFFFFGGK......",
      ".....KGGGGGGGGGGGGK.....",
      "....KGGGGGFFFFFGGGGK....",
      "....KGGGGFFFFFFFGGGK....",
      "....KGGGGGFFFFFGGGGK....",
      "....KGGGGGGGGGGGGGGK....",
      "....KGGGGGGGGGGGGGGK....",
      ".....KGGGGGGGGGGGGK.....",
      "......KGGGK.KGGGK.......",
      ".....KGGGK...KGGGK......",
      ".....KFFFK...KFFFK......",
      "......KKK.....KKK......."
    ];
    var GORILA_PAL = { K: "#1A1020", G: "#7A4A2A", F: "#D8A070", W: "#F2ECFF", M: "#5A2A1A" };

    function reiniciar() {
      pts = 0; vidas = 3; fim = null; quadro = 0;
      recomecar();
    }
    function recomecar() {
      j = { x: 30, nivel: 0, y: NIV[0], jy: 0, vy: 0, noAr: false, escada: -1, dir: 1, andando: false };
      barris = []; timer = 60; arremesso = 0; avisos = [];
    }

    function caixaJog() { return { x: j.x, y: j.y - 14, w: 10, h: 14 }; }

    function morrer() {
      vidas--;
      if (vidas <= 0) { fim = "perdeu"; return; }
      som("dano");
      recomecar();
    }

    function passo(e) {
      quadro++;
      j.andando = false;
      if (j.escada >= 0) {
        if (e.cima) j.y -= 0.9;
        if (e.baixo) j.y += 0.9;
        j.andando = e.cima || e.baixo;
        if (j.y <= NIV[j.escada + 1]) { j.nivel = j.escada + 1; j.y = NIV[j.nivel]; j.escada = -1; }
        else if (j.y >= NIV[j.escada]) { j.nivel = j.escada; j.y = NIV[j.nivel]; j.escada = -1; }
      } else {
        if (e.esq) { j.x -= 1.1; j.dir = -1; j.andando = true; }
        if (e.dir) { j.x += 1.1; j.dir = 1; j.andando = true; }
        var ext = EXT[j.nivel];
        j.x = limitar(j.x, ext[0] + 2, ext[1] - 12);
        if (e.aPress && !j.noAr) { j.vy = -3; j.noAr = true; som("pulo"); }
        if (j.noAr) {
          j.jy += j.vy; j.vy += 0.2;
          if (j.jy >= 0) { j.jy = 0; j.noAr = false; }
        }
        j.y = NIV[j.nivel] + j.jy;
        if (!j.noAr) {
          if (e.cima && j.nivel < 5 && Math.abs(j.x - ESC[j.nivel]) < 6) {
            j.escada = j.nivel; j.x = ESC[j.nivel]; j.y = NIV[j.nivel] - 1;
          } else if (e.baixo && j.nivel > 0 && Math.abs(j.x - ESC[j.nivel - 1]) < 6) {
            j.escada = j.nivel - 1; j.x = ESC[j.escada]; j.y = NIV[j.nivel] + 1;
          }
        }
      }

      // gorila arremessa
      if (--timer <= 0) {
        barris.push({ x: 40, y: NIV[5], nivel: 5, dir: 1, vy: 0, caindo: false, pulado: false, giro: 0 });
        timer = Math.max(70, 130 - Math.floor(quadro / 300) * 10);
        arremesso = 20; som("barril");
      }
      if (arremesso > 0) arremesso--;

      var v = 1.2 + Math.min(0.8, quadro / 3000);
      var cj = caixaJog();
      for (var i = barris.length - 1; i >= 0; i--) {
        var b = barris[i];
        b.giro += v;
        if (!b.caindo) {
          b.x += b.dir * v;
          var ex = EXT[b.nivel];
          if (b.nivel > 0 && Math.abs(b.x - ESC[b.nivel - 1]) < v && Math.random() < 0.3) b.caindo = true;
          else if ((b.dir > 0 && b.x > ex[1]) || (b.dir < 0 && b.x + 10 < ex[0])) {
            if (b.nivel === 0) { barris.splice(i, 1); continue; }
            b.caindo = true; b.vy = 0;
          }
        } else {
          b.y += b.vy; b.vy = Math.min(b.vy + 0.25, 4);
          if (b.y >= NIV[b.nivel - 1]) { b.nivel--; b.y = NIV[b.nivel]; b.dir = DIRB[b.nivel]; b.caindo = false; }
        }
        var cb = { x: b.x + 1, y: b.y - 9, w: 8, h: 8 };
        if (bate(cj, cb)) { morrer(); return; }
        if (j.noAr && !b.pulado && !b.caindo && b.nivel === j.nivel && Math.abs(b.x + 5 - (j.x + 5)) < 8) {
          b.pulado = true; pts += 100; som("bonus"); avisos.push({ x: j.x, y: j.y - 24, vida: 40 });
        }
      }
      avisos = avisos.filter(function (a) { a.y -= 0.4; return --a.vida > 0; });

      if (bate(cj, META)) { fim = "venceu"; pts += 1000; }
    }

    function viga(g, i) {
      var ex = EXT[i], y = NIV[i];
      g.fillStyle = "#E0356E"; g.fillRect(ex[0], y, ex[1] - ex[0], 6);
      g.fillStyle = "#FF8FB8";
      g.fillRect(ex[0], y, ex[1] - ex[0], 1);
      for (var x = ex[0]; x < ex[1]; x += 8) { g.fillRect(x + ((x / 8) % 2 ? 1 : 5), y + 2, 2, 2); }
      g.fillStyle = "#7A1438"; g.fillRect(ex[0], y + 5, ex[1] - ex[0], 1);
    }

    function barril(g, b) {
      var x = Math.round(b.x), y = Math.round(b.y) - 10;
      g.fillStyle = "#1A1020"; g.fillRect(x + 1, y, 8, 10); g.fillRect(x, y + 1, 10, 8);
      g.fillStyle = "#A0602A"; g.fillRect(x + 1, y + 1, 8, 8);
      g.fillStyle = "#FFB347";
      var f = Math.floor(b.giro / 4) % 3;
      g.fillRect(x + 1, y + 2 + f * 2, 8, 1);
      g.fillRect(x + 1 + f * 2, y + 1, 1, 8);
    }

    function desenhar(g) {
      g.fillStyle = "#0B0720"; g.fillRect(0, 0, W, H);
      estrelas(g, 7, 40, 200, "#3A2E6A");
      var i;
      // escadas
      g.fillStyle = "#3FE0F0";
      for (i = 0; i < ESC.length; i++) {
        var top = NIV[i + 1] + 6, base = NIV[i];
        g.fillRect(ESC[i], top, 1, base - top); g.fillRect(ESC[i] + 9, top, 1, base - top);
        for (var y = top + 3; y < base; y += 5) g.fillRect(ESC[i], y, 10, 1);
      }
      for (i = 0; i < NIV.length; i++) viga(g, i);
      // pilha de barris
      [[2, 38], [12, 38], [7, 28]].forEach(function (p) {
        g.fillStyle = "#A0602A"; g.fillRect(p[0], p[1], 9, 10);
        g.fillStyle = "#FFB347"; g.fillRect(p[0], p[1] + 2, 9, 1); g.fillRect(p[0], p[1] + 7, 9, 1);
      });
      spr(g, arremesso > 0 ? GORILA_BRACOS : GORILA, GORILA_PAL, 16, NIV[5] - 19);
      // troféu
      var mx = META.x, my = META.y;
      g.fillStyle = "#FFD23F";
      g.fillRect(mx, my, 12, 6); g.fillRect(mx + 2, my + 6, 8, 3); g.fillRect(mx + 5, my + 9, 2, 4); g.fillRect(mx + 2, my + 13, 8, 3);
      g.fillRect(mx - 2, my + 1, 2, 4); g.fillRect(mx + 12, my + 1, 2, 4);
      if (quadro % 30 < 15) { g.fillStyle = "#FFF3B0"; g.fillRect(mx + 2, my + 1, 2, 3); }
      barris.forEach(function (b) { barril(g, b); });
      var perna = j.escada >= 0 ? (Math.floor(j.y / 4) % 2) : j.noAr ? 2 : (j.andando && Math.floor(quadro / 6) % 2) ? 1 : 0;
      operario(g, j.x - 1, j.y - 14, perna, j.dir < 0);
      avisos.forEach(function (a) { txt(g, "100", a.x - 4, a.y, "#FFD23F"); });
      txt(g, num(pts, 6), 8, 8);
      txt(g, "VIDAS " + vidas, 248, 8, null, "right");
    }

    reiniciar();
    return { reiniciar: reiniciar, passo: passo, desenhar: desenhar, pontos: function () { return pts; }, fim: function () { return fim; } };
  }

  /* =====================================================================
     3. RATINHO A JATO — corrida infinita no deserto
     ===================================================================== */

  function Ratinho() {
    var CHAO = 188, META_M = 3000;
    var j, obst, queijos, vel, dist, bonus, fim, quadro, prox, dash, recarga;

    var RATO = [
      "..........PP....",
      ".........PRRP...",
      "....GGGGGGPRP...",
      "..GGGGGGGGGGGG..",
      ".GGGGGGGGGGGKGG.",
      "TGGGGGGGGGGGGGGN",
      "T.GGGGGGGSSGGGG.",
      "T..GGGGGGSSGGG.."
    ];
    var RATO_PES = [
      [".T..GGGGGGGGG...", "..TT.FF...FF...."],
      [".T..GGGGGGGGG...", "..TTF..F.F..F..."]
    ];
    var RATO_PAL = { G: "#B8B0C8", P: "#8A82A0", R: "#FF8FB8", K: "#1A1020", N: "#FF3E9E", S: "#E8423A", T: "#FF8FB8", F: "#FFB347" };
    var GATO = [
      "..K........K..",
      ".KPK......KPK.",
      ".KPPKKKKKKPPK.",
      ".KPPPPPPPPPPK.",
      ".KPYKPPPPYKPK.",
      ".KPPPPNNPPPPK.",
      "..KPPPPPPPPK..",
      ".KPPPPPPPPPPK.",
      ".KPPPPPPPPPPKK",
      ".KPPPPPPPPPPKP",
      ".KPPPPPPPPPPPK",
      ".KPPPPPPPPPPK.",
      ".KPPKPPPPKPPK.",
      "..KK.KKKK.KK.."
    ];
    var GATO_PAL = { K: "#0A0612", P: "#4A3A6A", Y: "#FFD23F", N: "#FF8FB8" };
    var MORCEGO = [
      ["K............K", "KK..........KK", "KPK..KKKK..KPK", ".KPPKPPPPKPPK.", "..KPPYPPYPPK..", "...KKKKKKKK..."],
      ["..............", "......KKKK....", "..KKKKPPPPKKKK", ".KPPPPPPPPPPPK", "KPK.KPYPPYK.KP", "K....KKKKK...K"]
    ];
    var MORCEGO_PAL = { K: "#0A0612", P: "#6A3F9A", Y: "#FFD23F" };

    function reiniciar() {
      j = { x: 40, y: CHAO - 10, w: 16, h: 10, vy: 0, pulos: 0, abaixado: false };
      obst = []; queijos = []; vel = 2.2; dist = 0; bonus = 0; fim = null; quadro = 0; prox = 140; dash = 0; recarga = 0;
    }

    function passo(e) {
      quadro++;
      vel = Math.min(5.2, vel + 0.0012);
      var v = dash > 0 ? vel * 1.8 : vel;
      dist += v;
      if (e.aPress && j.pulos < 2) { j.vy = j.pulos === 0 ? -5.4 : -4.6; som(j.pulos === 0 ? "pulo" : "pulo2"); j.pulos++; }
      j.vy += 0.3; j.y += j.vy;
      if (j.y >= CHAO - 10) { j.y = CHAO - 10; j.vy = 0; j.pulos = 0; }
      j.abaixado = e.baixo && j.pulos === 0;
      if (e.bPress && recarga === 0) { dash = 40; recarga = 150; som("turbo"); }
      if (dash > 0) dash--;
      if (recarga > 0) recarga--;

      prox -= v;
      if (prox <= 0) {
        var r = Math.random();
        if (r < 0.4) obst.push({ tipo: "gato", x: W + 10, y: CHAO - 14, w: 14, h: 14 });
        else if (r < 0.7) obst.push({ tipo: "ratoeira", x: W + 10, y: CHAO - 6, w: 14, h: 6 });
        else obst.push({ tipo: "morcego", x: W + 10, y: CHAO - 15, w: 14, h: 6, fase: Math.random() * 6 });
        if (Math.random() < 0.6) queijos.push({ x: W + 70, y: CHAO - 24 - Math.random() * 36, w: 8, h: 7, ok: true });
        prox = 120 + Math.random() * 110 + vel * 12;
      }

      var hb = j.abaixado ? { x: j.x + 1, y: j.y + 5, w: j.w - 2, h: 5 } : { x: j.x + 2, y: j.y + 1, w: j.w - 4, h: j.h - 1 };
      for (var i = obst.length - 1; i >= 0; i--) {
        var o = obst[i];
        if (o.fora) { o.x += 2; o.y -= 3; if (o.y < -20) obst.splice(i, 1); continue; }
        o.x -= v;
        if (o.tipo === "morcego") o.y = CHAO - 15 + Math.round(Math.sin(quadro / 8 + o.fase));
        if (o.x < -20) { obst.splice(i, 1); continue; }
        if (bate(hb, o)) {
          if (dash > 0) { o.fora = true; bonus += 50; som("pisao"); }
          else { fim = "perdeu"; return; }
        }
      }
      queijos = queijos.filter(function (q) {
        q.x -= v;
        if (q.ok && bate(hb, q)) { q.ok = false; bonus += 50; som("moeda"); }
        return q.x > -10 && q.ok;
      });
      if (dist / 10 >= META_M) fim = "venceu";
    }

    function desenhar(g) {
      var cores = ["#1A0F3A", "#2A1552", "#3F1D66", "#5A2472"];
      cores.forEach(function (c, i) { g.fillStyle = c; g.fillRect(0, i * 34, W, 34); });
      g.fillStyle = "#5A2472"; g.fillRect(0, 136, W, 60);
      estrelas(g, 3, 50, 110, "#C9B8FF");
      // lua
      g.fillStyle = "#FFD9A0";
      for (var y = -14; y <= 14; y++) { var w = Math.round(Math.sqrt(196 - y * y)); g.fillRect(200 - w, 40 + y, w * 2, 1); }
      g.fillStyle = "#E8B880"; g.fillRect(194, 36, 4, 3); g.fillRect(204, 46, 5, 3);
      var x, off;
      for (x = 0; x < W; x++) { // dunas
        var wx = x + dist * 0.15;
        var h = Math.round(22 + 10 * Math.sin(wx / 30) + 6 * Math.sin(wx / 11));
        g.fillStyle = "#3A1A55"; g.fillRect(x, 170 - h, 1, h + 20);
      }
      off = dist * 0.5;
      for (var k = 0; k < 4; k++) { // cactos
        x = Math.round(((k * 90 - off) % 360 + 360) % 360) - 40;
        g.fillStyle = "#1F6A4A";
        g.fillRect(x + 6, 150, 6, 38); g.fillRect(x, 160, 6, 3); g.fillRect(x, 154, 3, 8); g.fillRect(x + 12, 164, 6, 3); g.fillRect(x + 15, 158, 3, 8);
        g.fillStyle = "#2F8A5A"; g.fillRect(x + 7, 150, 2, 38);
      }
      g.fillStyle = "#E0A060"; g.fillRect(0, CHAO, W, H - CHAO);
      g.fillStyle = "#C07840";
      off = Math.round(dist) % 16;
      for (x = -off; x < W; x += 16) { g.fillRect(x, CHAO + 6, 8, 2); g.fillRect(x + 8, CHAO + 16, 6, 2); }
      g.fillStyle = "#FFD08A"; g.fillRect(0, CHAO, W, 2);

      queijos.forEach(function (q) {
        g.fillStyle = "#FFD23F"; g.fillRect(q.x, q.y, 8, 7);
        g.fillStyle = "#E0A020"; g.fillRect(q.x + 2, q.y + 2, 2, 2); g.fillRect(q.x + 5, q.y + 4, 2, 2);
      });
      obst.forEach(function (o) {
        if (o.tipo === "gato") spr(g, GATO, GATO_PAL, o.x, o.y);
        else if (o.tipo === "ratoeira") {
          g.fillStyle = "#C88A4A"; g.fillRect(o.x, o.y + 3, 14, 3);
          g.fillStyle = "#D8D8E8"; g.fillRect(o.x + 1, o.y, 12, 1); g.fillRect(o.x + 1, o.y, 1, 3); g.fillRect(o.x + 12, o.y, 1, 3);
          g.fillStyle = "#FFD23F"; g.fillRect(o.x + 6, o.y + 1, 3, 2);
        } else spr(g, MORCEGO[Math.floor(quadro / 8) % 2], MORCEGO_PAL, o.x, o.y - 1);
      });

      if (dash > 0) {
        g.fillStyle = "rgba(63,224,240,0.6)";
        for (var l = 0; l < 4; l++) g.fillRect(j.x - 20 - (l * 7 + quadro * 3) % 30, j.y + 2 + l * 2, 14, 1);
      }
      if (j.abaixado) {
        spr(g, RATO.slice(3), RATO_PAL, j.x, j.y + 3);
        spr(g, RATO_PES[0].slice(1), RATO_PAL, j.x, j.y + 8);
      } else {
        spr(g, RATO.concat(RATO_PES[Math.floor(quadro / 4) % 2]), RATO_PAL, j.x, j.y - 1);
      }

      txt(g, num(dist / 10, 4) + "m", 8, 8);
      txt(g, "+" + num(bonus, 4), 8, 20, "#FFD23F");
      txt(g, "TURBO", 248, 8, recarga === 0 ? "#3FE0F0" : "#6A6090", "right");
      g.fillStyle = "#2A1A4A"; g.fillRect(208, 20, 40, 4);
      g.fillStyle = "#3FE0F0"; g.fillRect(208, 20, Math.round(40 * (1 - recarga / 150)), 4);
    }

    reiniciar();
    return { reiniciar: reiniciar, passo: passo, desenhar: desenhar, pontos: function () { return Math.floor(dist / 10) + bonus; }, fim: function () { return fim; } };
  }

  /* =====================================================================
     4. ROBÔ FAÍSCA — ação com canhão que carrega
     ===================================================================== */

  function Robo() {
    var CHAO = 192, META_ABATES = 25;
    var PLAT = [{ x: 24, y: 148, w: 64 }, { x: 168, y: 148, w: 64 }, { x: 96, y: 108, w: 64 }];
    var j, tiros, inimigos, part, abates, pts, fim, quadro, prox;

    var ROBO = [
      "....KKKKKK....",
      "...KCCCCCCK...",
      "..KCCWWWWCCK..",
      "..KCWKWWKWCK..",
      "..KCWWWWWWCK..",
      "...KCCCCCCK...",
      "..KKCCCCCCKK..",
      ".KCCKWWWWKCCK.",
      ".KCCKWWWWKGGGK",
      ".KCCKWWWWKGGGK",
      "..KKCCCCCCKK.."
    ];
    var ROBO_PERNAS = [
      ["...KCCKKCCK...", "...KCCK.KCCK..", "..KCCCK.KCCCK.", "..KKKKK.KKKKK."],
      ["..KCCK..KCCK..", ".KCCK....KCCK.", "KCCCK....KCCCK", "KKKKK....KKKKK"]
    ];
    var ROBO_PAL = { K: "#0A0612", C: "#3FE0F0", W: "#E8F6FF", G: "#FF3E9E" };
    var ROBO_CARGA = { K: "#0A0612", C: "#FFF3B0", W: "#FFFFFF", G: "#FFD23F" };
    var DRONE = ["..KKKKKKKK..", ".KAAAAAAAAK.", "KAARRAARRAAK", "KAAAAAAAAAAK", ".KKAKKKKAKK.", "..K......K.."];
    var RODA = ["...KKKKKK...", "..KAAAAAAK..", ".KAARAARAAK.", ".KAAAAAAAAK.", "KKKKKKKKKKKK", "K.KK.KK.KK.K", ".KKKKKKKKKK."];
    var INIM_PAL = { K: "#0A0612", A: "#FFB347", R: "#E8423A" };

    function reiniciar() {
      j = { x: 120, y: CHAO - 15, w: 12, h: 15, vx: 0, vy: 0, chao: true, dir: 1, hp: 10, inv: 0, carga: 0 };
      tiros = []; inimigos = []; part = []; abates = 0; pts = 0; fim = null; quadro = 0; prox = 60;
    }

    function explodir(x, y) {
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        part.push({ x: x, y: y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, vida: 22 });
      }
    }

    function passo(e) {
      quadro++;
      j.vx = e.esq ? -1.5 : e.dir ? 1.5 : 0;
      if (e.esq) j.dir = -1; else if (e.dir) j.dir = 1;
      if (e.aPress && j.chao) { j.vy = -5.4; som("pulo"); }
      if (!e.a && j.vy < -2) j.vy += 0.4;
      j.vy = Math.min(j.vy + 0.28, 6);
      j.x = limitar(j.x + j.vx, 0, W - j.w);
      var baseAntes = j.y + j.h;
      j.y += j.vy; j.chao = false;
      if (j.vy >= 0) {
        if (j.y + j.h >= CHAO) { j.y = CHAO - j.h; j.vy = 0; j.chao = true; }
        else PLAT.forEach(function (p) {
          if (baseAntes <= p.y && j.y + j.h >= p.y && j.x + j.w > p.x && j.x < p.x + p.w) { j.y = p.y - j.h; j.vy = 0; j.chao = true; }
        });
      }
      if (j.inv > 0) j.inv--;

      var boca = j.dir > 0 ? j.x + j.w : j.x - 4;
      if (e.bPress && tiros.filter(function (t) { return !t.forte; }).length < 3) {
        tiros.push({ x: boca, y: j.y + 8, vx: 4 * j.dir, w: 4, h: 3, forte: false }); som("tiro");
      }
      if (e.b) j.carga++;
      if (e.bSolto) {
        if (j.carga >= 45) { tiros.push({ x: boca - (j.dir > 0 ? 0 : 6), y: j.y + 4, vx: 4.5 * j.dir, w: 10, h: 8, forte: true }); som("tiroForte"); }
        j.carga = 0;
      }

      if (--prox <= 0 && inimigos.length < 4 + Math.floor(abates / 6)) {
        var lado = Math.random() < 0.5;
        if (Math.random() < 0.55) inimigos.push({ tipo: "drone", x: lado ? -12 : W, y: 40 + Math.random() * 70, vx: lado ? 0.8 : -0.8, w: 12, h: 6, hp: 1, fase: Math.random() * 6 });
        else inimigos.push({ tipo: "roda", x: lado ? -12 : W, y: CHAO - 7, vx: lado ? 1 : -1, w: 12, h: 7, hp: 2 });
        prox = Math.max(28, 70 - abates * 2);
      }

      tiros = tiros.filter(function (t) { t.x += t.vx; return t.x > -12 && t.x < W + 12; });
      for (var i = inimigos.length - 1; i >= 0; i--) {
        var n = inimigos[i];
        n.x += n.vx;
        if (n.tipo === "drone") {
          n.y += Math.sin(quadro / 15 + n.fase) * 0.8 + (j.y - n.y) * 0.004;
          if (n.x < -20 || n.x > W + 20) { inimigos.splice(i, 1); continue; }
        } else if ((n.x < 0 && n.vx < 0) || (n.x > W - n.w && n.vx > 0)) n.vx = -n.vx;
        for (var k = tiros.length - 1; k >= 0; k--) {
          var t = tiros[k];
          if (bate(t, n)) {
            n.hp -= t.forte ? 3 : 1;
            if (!t.forte) tiros.splice(k, 1);
            if (n.hp <= 0) break;
          }
        }
        if (n.hp <= 0) {
          explodir(n.x + 6, n.y + 4); inimigos.splice(i, 1); abates++; pts += 100; som("explosao");
          continue;
        }
        if (j.inv === 0 && bate(j, n)) {
          j.hp -= 2; j.inv = 60; som("dano"); j.x = limitar(j.x - j.dir * 12, 0, W - j.w);
          if (j.hp <= 0) { fim = "perdeu"; return; }
        }
      }
      part = part.filter(function (p) { p.x += p.vx; p.y += p.vy; return --p.vida > 0; });
      if (abates >= META_ABATES) { fim = "venceu"; pts += j.hp * 100; }
    }

    function desenhar(g) {
      g.fillStyle = "#0A0A1E"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#15123A";
      for (var x = 0; x < W; x += 16) g.fillRect(x, 0, 1, CHAO);
      for (var y = 8; y < CHAO; y += 16) g.fillRect(0, y, W, 1);
      g.fillStyle = "#1C1640"; // silhueta da fábrica
      [[0, 120, 40], [36, 96, 30], [70, 130, 50], [150, 100, 36], [190, 124, 66]].forEach(function (b) { g.fillRect(b[0], b[1], b[2], CHAO - b[1]); });
      g.fillStyle = "#FFB347";
      [[10, 130], [46, 106], [52, 116], [160, 110], [200, 134], [230, 140]].forEach(function (w) { g.fillRect(w[0], w[1], 3, 3); });
      g.fillStyle = "#2A2350"; g.fillRect(0, CHAO, W, H - CHAO);
      g.fillStyle = "#FF3E9E"; g.fillRect(0, CHAO, W, 2);
      g.fillStyle = "#3A3070"; for (x = 0; x < W; x += 12) g.fillRect(x, CHAO + 6, 6, 2);
      PLAT.forEach(function (p) {
        g.fillStyle = "#3A3070"; g.fillRect(p.x, p.y, p.w, 6);
        g.fillStyle = "#FF3E9E"; g.fillRect(p.x, p.y, p.w, 1);
        g.fillStyle = "#1A1440"; for (var r = p.x + 3; r < p.x + p.w; r += 8) g.fillRect(r, p.y + 3, 2, 2);
      });
      inimigos.forEach(function (n) { spr(g, n.tipo === "drone" ? DRONE : RODA, INIM_PAL, n.x, n.y, n.vx > 0); });
      tiros.forEach(function (t) {
        if (t.forte) { g.fillStyle = "#3FE0F0"; g.fillRect(t.x, t.y, 10, 8); g.fillStyle = "#FFFFFF"; g.fillRect(t.x + 2, t.y + 2, 6, 4); }
        else { g.fillStyle = "#FFD23F"; g.fillRect(t.x, t.y, 4, 3); }
      });
      part.forEach(function (p) { g.fillStyle = p.vida > 10 ? "#FFD23F" : "#E8423A"; g.fillRect(p.x, p.y, 2, 2); });
      if (!(j.inv > 0 && quadro % 4 < 2)) {
        var pal = j.carga >= 45 && quadro % 6 < 3 ? ROBO_CARGA : ROBO_PAL;
        var perna = j.chao && j.vx !== 0 && Math.floor(quadro / 6) % 2 ? 1 : 0;
        spr(g, ROBO.concat(ROBO_PERNAS[perna]), pal, j.x - 1, j.y, j.dir < 0);
      }
      // barra de energia vertical
      g.fillStyle = "#0A0612"; g.fillRect(8, 20, 8, 44);
      for (var s = 0; s < 10; s++) {
        g.fillStyle = s < j.hp ? "#3FE0F0" : "#2A2350";
        g.fillRect(10, 60 - s * 4, 4, 3);
      }
      txt(g, num(pts, 6), 24, 8);
      txt(g, abates + "/" + META_ABATES, 248, 8, "#FFB347", "right");
    }

    reiniciar();
    return { reiniciar: reiniciar, passo: passo, desenhar: desenhar, pontos: function () { return pts; }, fim: function () { return fim; } };
  }

  /* =====================================================================
     5. TURBO ASFALTO '94 — corrida pseudo-3D contra o relógio
     ===================================================================== */

  function Corrida() {
    var HOR = 104, META_D = 26000, K = 40;
    var pos, vel, dist, tempo, carros, batida, bonus, fim, quadro, ceuX, cidade;

    function curva(d) { return Math.sin(d / 1400) * 0.9 + Math.sin(d / 3700 + 1) * 0.6; }

    function montarCidade() {
      cidade = document.createElement("canvas");
      cidade.width = 512; cidade.height = 60;
      var c = cidade.getContext("2d"), s = 11;
      function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
      for (var x = 0; x < 512;) {
        var w = 14 + Math.floor(r() * 22), h = 18 + Math.floor(r() * 40);
        c.fillStyle = r() < 0.5 ? "#1C0F38" : "#241446";
        c.fillRect(x, 60 - h, w, h);
        for (var wy = 60 - h + 4; wy < 58; wy += 5) {
          for (var wx = x + 2; wx < x + w - 2; wx += 4) {
            if (r() < 0.35) { c.fillStyle = r() < 0.7 ? "#FFB347" : "#3FE0F0"; c.fillRect(wx, wy, 2, 2); }
          }
        }
        x += w + 1;
      }
    }

    function reiniciar() {
      pos = 0; vel = 0; dist = 0; tempo = 70 * 60; batida = 0; bonus = 0; fim = null; quadro = 0; ceuX = 0;
      carros = [];
      var cores = ["#3FE0F0", "#FFB347", "#8A3FD0", "#5ED16A"];
      for (var i = 0; i < 5; i++) carros.push({ d: 900 + i * 700, faixa: i % 2 ? 0.5 : -0.5, v: 0.35 + Math.random() * 0.25, cor: cores[i % 4] });
      if (!cidade) montarCidade();
    }

    function projetar(r) { // r = distância à frente → linha da tela
      var t = K / (r + K);
      return { t: t, y: HOR + t * (H - HOR) };
    }
    function meia(t) { return 6 + t * 150; }
    function centro(t, c) { return 128 - pos * meia(t) + c * Math.pow(1 - t, 2) * 110; }

    function passo(e) {
      quadro++;
      var acel = e.a || e.cima, freia = e.b || e.baixo;
      if (batida > 0) { batida--; vel *= 0.95; }
      else if (acel) vel = Math.min(1, vel + 0.008);
      else if (freia) vel = Math.max(0, vel - 0.03);
      else vel = Math.max(0, vel - 0.004);
      if (Math.abs(pos) > 1.05 && vel > 0.45) vel -= 0.02;
      var c = curva(dist);
      if (e.esq) pos -= 0.035 * (0.3 + vel);
      if (e.dir) pos += 0.035 * (0.3 + vel);
      pos = limitar(pos - c * vel * 0.022, -1.8, 1.8);
      dist += vel * 9;
      ceuX += c * vel * 1.5;
      if (window.RetroSom) window.RetroSom.motor(vel);
      tempo--;
      carros.forEach(function (k) {
        k.d += k.v * 9;
        var r = k.d - dist;
        if (r > 0 && r < 26 && Math.abs(pos - k.faixa) < 0.42 && batida === 0) { batida = 50; vel = 0.15; k.d += 140; som("batida"); }
        if (r < -60) { bonus += 50; k.d = dist + 2200 + Math.random() * 1400; k.faixa = Math.random() < 0.5 ? -0.5 : 0.5; }
      });
      if (dist >= META_D) { fim = "venceu"; bonus += Math.floor(tempo / 60) * 100; }
      else if (tempo <= 0) fim = "perdeu";
    }

    function carro(g, cx, base, esc, cor) {
      var w = Math.max(4, Math.round(40 * esc)), h = Math.max(3, Math.round(22 * esc));
      var x = Math.round(cx - w / 2), y = Math.round(base - h);
      g.fillStyle = "#0A0612"; g.fillRect(x - Math.round(2 * esc), y + Math.round(h * 0.6), w + Math.round(4 * esc), Math.round(h * 0.4));
      g.fillStyle = cor; g.fillRect(x, y + Math.round(h * 0.3), w, Math.round(h * 0.6));
      g.fillStyle = "#0A0612"; g.fillRect(x + Math.round(w * 0.15), y, Math.round(w * 0.7), Math.round(h * 0.35));
      g.fillStyle = "#9FC3E8"; g.fillRect(x + Math.round(w * 0.2), y + Math.round(h * 0.06), Math.round(w * 0.6), Math.max(1, Math.round(h * 0.22)));
      g.fillStyle = "#FF3048"; g.fillRect(x + Math.round(w * 0.05), y + Math.round(h * 0.5), Math.max(1, Math.round(w * 0.18)), Math.max(1, Math.round(h * 0.15)));
      g.fillRect(x + Math.round(w * 0.77), y + Math.round(h * 0.5), Math.max(1, Math.round(w * 0.18)), Math.max(1, Math.round(h * 0.15)));
    }

    function desenhar(g) {
      var ceu = ["#140A30", "#2A1250", "#4A1A6A", "#7A2A7A", "#C2407A"];
      ceu.forEach(function (c, i) { g.fillStyle = c; g.fillRect(0, i * 18, W, 18); });
      g.fillStyle = "#E85A7A"; g.fillRect(0, 90, W, HOR - 90);
      // sol listrado
      for (var y = -26; y <= 0; y++) {
        if (y > -12 && (y % 4 === 0 || y % 4 === -1)) continue;
        var w = Math.round(Math.sqrt(676 - y * y));
        g.fillStyle = y < -14 ? "#FFD23F" : "#FF8F5A";
        g.fillRect(128 - w, HOR - 6 + y, w * 2, 1);
      }
      var ox = Math.round(((ceuX % 512) + 512) % 512);
      g.drawImage(cidade, -ox, HOR - 60); g.drawImage(cidade, 512 - ox, HOR - 60);

      var c = curva(dist);
      for (y = HOR; y < H; y++) {
        var t = (y - HOR + 0.5) / (H - HOR), r = K / t - K;
        var faixa = Math.floor((dist + r * 6) / 60) % 2;
        var m = meia(t), cx = centro(t, c), z = Math.max(1, m * 0.12);
        g.fillStyle = faixa ? "#141E36" : "#1A2644"; g.fillRect(0, y, W, 1);
        g.fillStyle = faixa ? "#FF3E9E" : "#F2ECFF"; g.fillRect(Math.round(cx - m - z), y, Math.round((m + z) * 2), 1);
        g.fillStyle = faixa ? "#2A2438" : "#2E2840"; g.fillRect(Math.round(cx - m), y, Math.round(m * 2), 1);
        if (faixa) { var lw = Math.max(1, Math.round(m * 0.03)); g.fillStyle = "#F2ECFF"; g.fillRect(Math.round(cx - lw / 2), y, lw, 1); }
      }
      var rm = (META_D - dist) / 6;
      if (rm > 0 && rm < 400) {
        var pm = projetar(rm), mm = meia(pm.t), cm = centro(pm.t, c), tam = Math.max(1, Math.round(pm.t * 8));
        for (var q = 0; q < 8; q++) {
          g.fillStyle = q % 2 ? "#0A0612" : "#F2ECFF";
          g.fillRect(Math.round(cm - mm + (q * mm) / 4), Math.round(pm.y) - tam, Math.ceil(mm / 4), tam);
        }
      }
      carros.slice().sort(function (a, b) { return b.d - a.d; }).forEach(function (k) {
        var r2 = (k.d - dist) / 6;
        if (r2 <= 0 || r2 > 900) return;
        var p = projetar(r2);
        carro(g, centro(p.t, c) + k.faixa * meia(p.t), p.y, meia(p.t) / 150, k.cor);
      });
      var tremor = batida > 0 ? (quadro % 4 < 2 ? -2 : 2) : 0;
      carro(g, 128 + tremor, 214, 1, "#FF3E9E");

      txt(g, "TEMPO " + num(tempo / 60, 2), 8, 8, tempo < 600 ? "#FF3048" : null);
      txt(g, num(vel * 280, 3) + "KM/H", 248, 8, null, "right");
      g.fillStyle = "#0A0612"; g.fillRect(64, 22, 128, 4);
      g.fillStyle = "#3FE0F0"; g.fillRect(64, 22, Math.round(128 * Math.min(1, dist / META_D)), 4);
    }

    reiniciar();
    return { reiniciar: reiniciar, passo: passo, desenhar: desenhar, pontos: function () { return Math.floor(dist / 10) + bonus; }, fim: function () { return fim; } };
  }

  /* ---------- catálogo ---------- */

  window.RetroJogos = {
    "irmaos-tijolo": { nome: "Super Irmãos Tijolo", genero: "Plataforma", console: "SNES", luz: "rgba(107,140,255,0.45)", criar: Tijolo,
      dica: "Z pula · X corre · pise nos besouros" },
    "gorila-guindaste": { nome: "Gorila no Guindaste", genero: "Arcade", console: "SNES", luz: "rgba(224,53,110,0.40)", criar: Gorila,
      dica: "Setas andam e sobem · Z pula barris" },
    "ratinho-jato": { nome: "Ratinho a Jato", genero: "Corrida a pé", console: "Mega Drive", luz: "rgba(255,143,90,0.40)", criar: Ratinho,
      dica: "Z pula (2x) · X turbo · ↓ abaixa" },
    "robo-faisca": { nome: "Robô Faísca", genero: "Ação", console: "SNES", luz: "rgba(63,224,240,0.40)", criar: Robo,
      dica: "Z pula · X atira · segure X para carregar" },
    "turbo-asfalto": { nome: "Turbo Asfalto '94", genero: "Corrida", console: "Mega Drive", luz: "rgba(194,64,122,0.45)", criar: Corrida,
      dica: "Z acelera · X freia · setas viram" }
  };
})();
