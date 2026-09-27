/* RetroPlay — som sintetizado em tempo real (Web Audio API), sem arquivos de áudio.
 *
 * Canais no estilo dos chips de 8/16 bits: pulso (onda quadrada com largura variável),
 * triângulo (baixo) e ruído (bateria, chiado, explosões).
 * As faixas são composições originais no estilo de cada gênero; a do Ratinho a Jato
 * usa "La Cucaracha", melodia folclórica em domínio público.
 *
 * O navegador só libera áudio depois de um gesto (clique, toque ou tecla):
 * o contexto nasce no primeiro gesto e tudo antes disso fica em silêncio.
 */
(function () {
  "use strict";

  var ctx = null, mestre, musica, efeitos, ruidoBuf, pulsos = {};
  var chiadoGanho = null, motorOsc = null, motorGanho = null;
  var mudo = false, volEfeitos = 0.7, volMusica = 0.7;
  var GANHO_EFEITOS = 0.46, GANHO_MUSICA = 0.22; // ganho no volume máximo (100%)
  function lerNumero(chave, padrao) {
    try { var v = parseFloat(localStorage.getItem(chave)); return isNaN(v) ? padrao : Math.min(1, Math.max(0, v)); }
    catch (e) { return padrao; }
  }
  function salvar(chave, valor) { try { localStorage.setItem(chave, String(valor)); } catch (e) { /* ignora */ } }
  try { mudo = localStorage.getItem("retroplay-som") === "off"; } catch (e) { /* sem storage: segue com som */ }
  volEfeitos = lerNumero("retroplay-vol-efeitos", volEfeitos);
  volMusica = lerNumero("retroplay-vol-musica", volMusica);

  function garantir() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    mestre = ctx.createGain(); mestre.gain.value = mudo ? 0 : 0.8;
    mestre.connect(comp); comp.connect(ctx.destination);
    musica = ctx.createGain(); musica.gain.value = GANHO_MUSICA * volMusica; musica.connect(mestre);
    efeitos = ctx.createGain(); efeitos.gain.value = GANHO_EFEITOS * volEfeitos; efeitos.connect(mestre);

    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = ruidoBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    [0.125, 0.25, 0.5].forEach(function (duty) { pulsos[duty] = ondaPulso(duty); });

    // chiado contínuo da TV (volume controlado pela fase da rolagem)
    var fonte = ctx.createBufferSource(); fonte.buffer = ruidoBuf; fonte.loop = true;
    var banda = ctx.createBiquadFilter(); banda.type = "bandpass"; banda.frequency.value = 3000; banda.Q.value = 0.5;
    chiadoGanho = ctx.createGain(); chiadoGanho.gain.value = 0;
    fonte.connect(banda); banda.connect(chiadoGanho); chiadoGanho.connect(efeitos);
    fonte.start();
    return true;
  }

  // primeiro gesto em qualquer lugar da página destrava o áudio
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, garantir, { capture: true, passive: true });
  });

  function ondaPulso(duty) { // série de Fourier de uma onda de pulso
    var n = 40, real = new Float32Array(n), imag = new Float32Array(n);
    for (var k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  var NOTAS = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  function freq(nome) {
    var m = /^([A-G][#b]?)(\d)$/.exec(nome);
    if (!m) return 0;
    var midi = 12 * (parseInt(m[2], 10) + 1) + NOTAS[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- geradores básicos ---------- */

  function tom(onda, f, ini, dur, vol, destino, fFim) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    if (typeof onda === "number") o.setPeriodicWave(pulsos[onda]); else o.type = onda;
    o.frequency.setValueAtTime(f, ini);
    if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, ini + dur);
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.exponentialRampToValueAtTime(vol, ini + 0.006);
    g.gain.setValueAtTime(vol, ini + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    o.connect(g); g.connect(destino || efeitos);
    o.start(ini); o.stop(ini + dur + 0.03);
  }

  function ruido(ini, dur, vol, tipo, fc, destino, fcFim) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruidoBuf;
    fl.type = tipo || "lowpass";
    fl.frequency.setValueAtTime(fc || 4000, ini);
    if (fcFim) fl.frequency.exponentialRampToValueAtTime(fcFim, ini + dur);
    g.gain.setValueAtTime(vol, ini);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    s.connect(fl); fl.connect(g); g.connect(destino || efeitos);
    s.start(ini, Math.random() * 0.5); s.stop(ini + dur + 0.02);
  }

  function arpejo(notas, passo, onda, vol, ini) {
    notas.forEach(function (n, i) { tom(onda, freq(n), ini + i * passo, passo * 1.6, vol); });
  }

  /* ---------- efeitos ---------- */

  var SFX = {
    select: function (t) { tom(0.25, freq("B5"), t, 0.07, 0.3); tom(0.25, freq("E6"), t + 0.07, 0.16, 0.3); },
    start: function (t) { arpejo(["C5", "E5", "G5", "C6", "E6"], 0.05, 0.25, 0.25, t); },
    pausa: function (t) { tom(0.5, freq("E5"), t, 0.06, 0.25); tom(0.5, freq("C5"), t + 0.09, 0.06, 0.25); tom(0.5, freq("E5"), t + 0.18, 0.06, 0.25); tom(0.5, freq("C5"), t + 0.27, 0.1, 0.25); },
    liga: function (t) {
      tom("triangle", 70, t, 0.35, 0.5, null, 38);            // estalo do tubo
      tom("sine", 15600, t + 0.05, 0.6, 0.012);                 // zumbido agudo do flyback
      ruido(t, 0.12, 0.25, "lowpass", 900);
    },
    moeda: function (t) { tom(0.5, freq("B5"), t, 0.06, 0.28); tom(0.5, freq("E6"), t + 0.06, 0.28, 0.28); },
    pulo: function (t) { tom(0.25, 240, t, 0.16, 0.22, null, 720); },
    pulo2: function (t) { tom(0.25, 380, t, 0.12, 0.2, null, 1000); },
    pisao: function (t) { tom("triangle", 500, t, 0.12, 0.45, null, 90); ruido(t, 0.05, 0.2, "highpass", 2000); },
    tijolo: function (t) { ruido(t, 0.18, 0.4, "lowpass", 2200, null, 400); tom("triangle", 180, t, 0.12, 0.35, null, 60); },
    dano: function (t) { tom(0.5, 700, t, 0.5, 0.25, null, 70); tom(0.125, 520, t + 0.05, 0.45, 0.12, null, 60); },
    bonus: function (t) { arpejo(["E6", "G6", "C7"], 0.045, 0.25, 0.22, t); },
    barril: function (t) { tom("triangle", 110, t, 0.14, 0.4, null, 55); },
    turbo: function (t) { ruido(t, 0.4, 0.25, "bandpass", 600, null, 5000); tom("sawtooth", 180, t, 0.35, 0.08, null, 900); },
    tiro: function (t) { tom(0.25, 1100, t, 0.09, 0.2, null, 260); },
    tiroForte: function (t) { tom("sawtooth", 1400, t, 0.28, 0.16, null, 160); ruido(t, 0.25, 0.2, "bandpass", 3000, null, 500); },
    explosao: function (t) { ruido(t, 0.4, 0.45, "lowpass", 1800, null, 120); tom("triangle", 120, t, 0.25, 0.3, null, 40); },
    batida: function (t) { ruido(t, 0.5, 0.5, "lowpass", 1400, null, 100); tom(0.5, 140, t, 0.35, 0.2, null, 40); }
  };

  var JINGLES = {
    venceu: [["C5", 0.1], ["E5", 0.1], ["G5", 0.1], ["C6", 0.2], ["G5", 0.1], ["C6", 0.5]],
    perdeu: [["G4", 0.18], ["F#4", 0.18], ["F4", 0.18], ["E4", 0.6]]
  };

  /* ---------- música: sequenciador em passos de semicolcheia ---------- */
  // Cada canal é uma string de tokens: nota ("C5"), pausa (".") ou sustenta ("-").

  function compasso() { return Array.prototype.join.call(arguments, " "); }

  var BAIXO = {
    C: "C3 . . . G3 . . . C3 . . . G3 . E3 .",
    F: "F2 . . . C3 . . . F2 . . . C3 . A2 .",
    G: "G2 . . . D3 . . . G2 . . . D3 . B2 ."
  };

  var MUSICAS = {
    // plataforma ensolarada: saltitante, maior, baixo "oom-pah"
    "irmaos-tijolo": {
      bpm: 144, duty: 0.25,
      lead: compasso(
        "E5 . E5 . G5 . . E5 . . C5 . D5 . E5 .", "F5 . . F5 . . A5 . G5 . . . . . . .",
        "E5 . E5 . G5 . . E5 . . C5 . D5 . E5 .", "D5 . . D5 . . G4 . C5 . . . . . . .",
        "A5 . A5 . G5 . F5 . E5 . . F5 . . G5 .", "C6 . . A5 . . G5 . E5 . . . . . . .",
        "F5 . F5 . E5 . D5 . C5 . . D5 . . E5 .", "D5 . . B4 . . G4 . C5 . . . . . . ."),
      baixo: compasso(BAIXO.C, BAIXO.F, BAIXO.C, BAIXO.G, BAIXO.F, BAIXO.C, BAIXO.F, BAIXO.G),
      bateria: "k . h . s . h . k . h k s . h ."
    },
    // arcade de vigas: ostinato menor, repetitivo e tenso
    "gorila-guindaste": {
      bpm: 120, duty: 0.125,
      lead: compasso(
        "G5 . . . . . Eb5 . F5 . G5 . . . . .", "C6 . . Bb5 . . G5 . F5 . Eb5 . . . . .",
        "Ab5 . . . G5 . . . F5 . Eb5 . F5 . . .", "G5 - - - - - - - . . . . . . . ."),
      baixo: compasso(
        "C3 . C3 . . . Eb3 . . . C3 . F3 . Eb3 .", "C3 . C3 . . . Eb3 . . . C3 . F3 . Eb3 .",
        "Ab2 . Ab2 . . . C3 . . . Ab2 . Bb2 . B2 .", "Ab2 . Ab2 . . . C3 . . . G2 . G2 . B2 ."),
      bateria: "k . h . k . h . s . h . k . h ."
    },
    // "La Cucaracha" (domínio público), rápida, com baixo de mariachi
    "ratinho-jato": {
      bpm: 168, duty: 0.5,
      lead: compasso(
        "C5 . C5 . C5 . F5 - - - A5 - - - - -", "C5 . C5 . C5 . F5 - - - A5 - - - - -",
        "F5 - F5 - E5 - E5 - D5 - D5 - C5 - - -", "C5 . . . . . . . . . . . . . . .",
        "C5 . C5 . C5 . E5 - - - G5 - - - - -", "C5 . C5 . C5 . E5 - - - G5 - - - - -",
        "C6 - D6 - C6 - Bb5 - A5 - G5 - F5 - - -", ". . . . . . . . . . . . . . . ."),
      baixo: compasso(
        "F2 . . . C3 . . . F2 . . . C3 . . .", "F2 . . . C3 . . . F2 . . . C3 . . .",
        "F2 . . . C3 . . . F2 . . . C3 . . .", "C3 . . . G2 . . . C3 . . . G2 . . .",
        "C3 . . . G2 . . . C3 . . . G2 . . .", "C3 . . . G2 . . . C3 . . . G2 . . .",
        "C3 . . . G2 . . . C3 . . . G2 . . .", "F2 . . . C3 . . . F2 . . . C3 . . ."),
      bateria: "k . h . s . h . k . h . s . h ."
    },
    // ação robótica: menor, baixo em oitavas, melodia heroica
    "robo-faisca": {
      bpm: 150, duty: 0.25,
      lead: compasso(
        "B4 . E5 . F#5 . G5 - - - F#5 . E5 . D5 .", "E5 - - - . . C5 . E5 . G5 - - - A5 .",
        "F#5 - - - . . D5 . F#5 . A5 - - - B5 .", "A5 - - - G5 - - - F#5 - - - D#5 - - -",
        "B4 . E5 . F#5 . G5 - - - A5 . B5 . C6 .", "B5 - - - A5 . G5 . E5 - - - G5 . A5 .",
        "F#5 - - - E5 . F#5 . A5 - - - G5 . F#5 .", "E5 - - - - - - - . . . . . . . ."),
      baixo: compasso(
        "E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .", "C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .",
        "D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .", "B1 . B2 . B1 . B2 . B1 . B2 . B1 . B2 .",
        "E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .", "C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .",
        "D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 .", "E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 ."),
      bateria: "k . h . s . h . k k h . s . h h"
    },
    // corrida noturna: synth-pop dirigindo pela orla
    "turbo-asfalto": {
      bpm: 132, duty: 0.5,
      lead: compasso(
        "A5 - - - C6 - - - A5 - G5 - F5 - - -", "G5 - - - . . D5 - G5 - A5 - B5 - - -",
        "E5 - - - G5 - - - B5 - - - A5 - G5 -", "A5 - - - - - - - . . E5 . A5 . C6 .",
        "F6 - - - E6 - - - C6 - - - A5 - - -", "D6 - - - B5 - - - G5 - - - D6 - - -",
        "E6 - - - D6 - B5 - G5 - - - B5 - - -", "A5 - - - - - - - - - - - . . . ."),
      baixo: compasso(
        "F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 .", "G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .",
        "E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .", "A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 .",
        "F2 . F3 . F2 . F3 . F2 . F3 . F2 . F3 .", "G2 . G3 . G2 . G3 . G2 . G3 . G2 . G3 .",
        "E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .", "A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 ."),
      bateria: "k . h . s . h . k . h . s . h h"
    }
  };

  // "C5 - - . D5" → eventos por passo: { nota, passos }
  function preparar(texto) {
    var tokens = texto.trim().split(/\s+/), eventos = [];
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t === "." || t === "-") { eventos.push(null); continue; }
      var dur = 1;
      while (tokens[i + dur] === "-") dur++;
      eventos.push({ nota: t, passos: dur });
    }
    return eventos;
  }

  var faixa = null, passoIdx = 0, proximo = 0, relogio = null;

  function tocarPasso(i, t, dur) {
    var ev = faixa.lead[i % faixa.lead.length];
    if (ev) tom(faixa.duty, freq(ev.nota), t, ev.passos * dur * 0.92, 0.5, musica);
    ev = faixa.baixo[i % faixa.baixo.length];
    if (ev) tom("triangle", freq(ev.nota), t, ev.passos * dur * 0.95, 0.9, musica);
    var b = faixa.bateria[i % faixa.bateria.length];
    if (b === "k") { tom("sine", 150, t, 0.12, 0.9, musica, 45); }
    else if (b === "s") { ruido(t, 0.12, 0.5, "highpass", 1500, musica); }
    else if (b === "h") { ruido(t, 0.03, 0.22, "highpass", 7000, musica); }
  }

  function agendar() {
    if (!faixa) return;
    var dur = 60 / faixa.bpm / 4;
    while (proximo < ctx.currentTime + 0.12) {
      tocarPasso(passoIdx, proximo, dur);
      proximo += dur;
      passoIdx++;
    }
  }

  function tocarMusica(id) {
    pararMusica();
    var m = MUSICAS[id];
    if (!m || !garantir()) return;
    faixa = { bpm: m.bpm, duty: m.duty, lead: preparar(m.lead), baixo: preparar(m.baixo), bateria: m.bateria.split(/\s+/) };
    passoIdx = 0;
    proximo = ctx.currentTime + 0.35; // entra depois da vinheta de start
    relogio = setInterval(agendar, 25);
  }

  function pararMusica() {
    faixa = null;
    if (relogio) { clearInterval(relogio); relogio = null; }
  }

  /* ---------- API pública ---------- */

  window.RetroSom = {
    pronto: function () { return !!ctx && ctx.state === "running"; },
    sfx: function (nome) {
      if (!SFX[nome] || !garantir()) return;
      SFX[nome](ctx.currentTime + 0.005);
    },
    jingle: function (nome) {
      if (!JINGLES[nome] || !garantir()) return;
      var t = ctx.currentTime + 0.05;
      JINGLES[nome].forEach(function (n) { tom(0.25, freq(n[0]), t, n[1] * 0.95, 0.3); t += n[1]; });
    },
    musica: tocarMusica,
    parar: pararMusica,
    // 0 a 1: volume do chiado da TV (só depois que o áudio foi destravado)
    chiado: function (nivel) {
      if (!chiadoGanho) return;
      chiadoGanho.gain.setTargetAtTime(Math.max(0, nivel) * 0.5, ctx.currentTime, 0.03);
    },
    // ronco do motor na corrida: v de 0 a 1, ou null para calar
    motor: function (v) {
      if (!ctx) return;
      if (v === null) {
        if (motorGanho) motorGanho.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        return;
      }
      if (!motorOsc) {
        motorOsc = ctx.createOscillator(); motorOsc.type = "sawtooth";
        var filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 650;
        motorGanho = ctx.createGain(); motorGanho.gain.value = 0;
        motorOsc.connect(filtro); filtro.connect(motorGanho); motorGanho.connect(efeitos);
        motorOsc.start();
      }
      motorOsc.frequency.setTargetAtTime(52 + v * 170, ctx.currentTime, 0.05);
      motorGanho.gain.setTargetAtTime(0.1 + v * 0.1, ctx.currentTime, 0.05);
    },
    // volumes de 0 a 1, lembrados no navegador
    volumeEfeitos: function (v) {
      if (v === undefined) return volEfeitos;
      volEfeitos = Math.min(1, Math.max(0, v)); salvar("retroplay-vol-efeitos", volEfeitos);
      if (ctx) efeitos.gain.setTargetAtTime(GANHO_EFEITOS * volEfeitos, ctx.currentTime, 0.02);
    },
    volumeMusica: function (v) {
      if (v === undefined) return volMusica;
      volMusica = Math.min(1, Math.max(0, v)); salvar("retroplay-vol-musica", volMusica);
      if (ctx) musica.gain.setTargetAtTime(GANHO_MUSICA * volMusica, ctx.currentTime, 0.02);
    },
    mudo: function () { return mudo; },
    alternarMudo: function () {
      mudo = !mudo;
      salvar("retroplay-som", mudo ? "off" : "on");
      if (garantir()) mestre.gain.setTargetAtTime(mudo ? 0 : 0.8, ctx.currentTime, 0.02);
      return mudo;
    }
  };
})();
