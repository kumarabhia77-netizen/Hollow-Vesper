"use strict";
(window.HV_V = window.HV_V || {}).music = 10;
// Original gothic score made in code (no audio files), with a Spanish colour: the Andalusian cadence (Am, G, F, E), the E Phrygian scale,
// plucked guitar strums and runs, a lamenting sung line, hand claps in a 12-beat flamenco count, cathedral organ, choir and tolling bells.
// Three moods: menu, game, boss. It is original music in a broad dark-Spanish spirit, not a copy of any game's score.
const Music = {
  on: true, lite: !!(window.matchMedia && matchMedia("(pointer:coarse)").matches), vol: 0.55, mode: "menu", g: null, timer: null, bar_n: 0, tNext: 0, BEAT: 0.8,
  CH: [[110.0, 1.189], [98.0, 1.26], [87.31, 1.26], [82.41, 1.26]],                     // roots in Hz and the third's ratio: Am, G, F, E(major)
  PHR: [329.63, 349.23, 415.3, 440.0, 493.88, 523.25, 587.33, 659.26],                   // E F G# A B C D E
  build(ctx) {
    const g = { ctx }, mk = () => ctx.createGain();
    g.master = mk(); g.master.gain.value = this.on ? this.vol : 0; const comp = ctx.createDynamicsCompressor(); g.master.connect(comp); comp.connect(ctx.destination);
    g.bus = mk(); g.bus.connect(g.master);
    if (this.lite) {   // phones: a cheap echo instead of a full cathedral reverb
      const dl = ctx.createDelay(1), fb = mk(), lpf = ctx.createBiquadFilter(), wet = mk(); dl.delayTime.value = 0.27; fb.gain.value = 0.42; lpf.type = "lowpass"; lpf.frequency.value = 2200; wet.gain.value = 0.5;
      g.bus.connect(dl); dl.connect(lpf); lpf.connect(fb); fb.connect(dl); lpf.connect(wet); wet.connect(g.master); g.verb = dl;
    } else {
      const len = Math.floor(ctx.sampleRate * 2.0), ir = ctx.createBuffer(2, len, ctx.sampleRate);   // cathedral reverb
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
      g.verb = ctx.createConvolver(); g.verb.buffer = ir; const wet = mk(); wet.gain.value = 0.7; g.verb.connect(wet); wet.connect(g.master); g.bus.connect(g.verb);
    }
    for (const k of ["pad", "bell", "drum", "gtr", "voc", "perc"]) { g[k] = mk(); g[k].gain.value = 0; g[k].connect(g.bus); }
    g.organ = ctx.createPeriodicWave(new Float32Array([0, 1, 0.45, 0.22, 0.1, 0.05]), new Float32Array(6));
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; g.nb = nb;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; const wg = mk(); wg.gain.value = 0.05;   // wind
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = mk(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(wg.gain); ns.connect(lp); lp.connect(wg); wg.connect(g.bus); ns.start(); lfo.start();
    return g;
  },
  mood(g, mode, fast) {   // how loud each instrument group is in each mood: pad, bells, drum, guitar, voice, claps
    const t = g.ctx.currentTime, M = { menu: [0.65, 0.7, 0, 0.7, 0.9, 0], game: [0.5, 0.4, 0.55, 0.8, 0.35, 0.6], boss: [0.85, 0.8, 1, 1, 0.6, 1], dead: [0.3, 0.3, 0, 0, 0, 0] }[mode] || [0, 0, 0, 0, 0, 0], k = fast ? 0.01 : 0.6;
    ["pad", "bell", "drum", "gtr", "voc", "perc"].forEach((n, i) => g[n].gain.setTargetAtTime(M[i], t, k));
  },
  note(g, f, t, dur, att, vol) {
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(), lp = c.createBiquadFilter(); o.setPeriodicWave(g.organ); o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 1100;
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + att); e.gain.setValueAtTime(vol, t + dur - 1.6); e.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(e); e.connect(g.pad); o.start(t); o.stop(t + dur + 0.05);
  },
  choir(g, f, t, dur, vol) {
    const c = g.ctx, e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 2); e.gain.setValueAtTime(vol, t + dur - 2); e.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f1 = c.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = this.lite ? 900 : 730; f1.Q.value = 4; const mix = c.createGain(); mix.connect(f1); f1.connect(e); e.connect(g.pad);
    if (!this.lite) { const f2 = c.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1090; f2.Q.value = 5; mix.connect(f2); f2.connect(e); }
    const lfo = c.createOscillator(); lfo.frequency.value = 5; const lg = c.createGain(); lg.gain.value = 5; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.1);
    for (const d of (this.lite ? [0] : [-7, 7])) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d; lg.connect(o.detune); o.connect(mix); o.start(t); o.stop(t + dur + 0.1); }
  },
  bell(g, f, t, vol) {
    const c = g.ctx; [[1, 1, 5], [2.76, 0.5, 3.5], [5.4, 0.25, 2], [8.93, 0.12, 1.2]].forEach(([r, a, d]) => { const o = c.createOscillator(), e = c.createGain(); o.frequency.value = f * r;
      e.gain.setValueAtTime(vol * a, t); e.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(e); e.connect(g.bell); o.start(t); o.stop(t + d + 0.05); });
  },
  drum(g, t, vol) {
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(e); e.connect(g.drum); o.start(t); o.stop(t + 0.5);
  },
  pluck(g, f, t, vol) {   // one plucked guitar string: bright at the start, mellow as it rings
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(), lp = c.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = f;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(Math.min(4500, f * 8), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.45);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(lp); lp.connect(e); e.connect(g.gtr); o.start(t); o.stop(t + 1.05);
  },
  strum(g, notes, t, vol, down) { notes.forEach((f, i) => this.pluck(g, f, t + (down ? i : notes.length - 1 - i) * 0.032, vol * (0.8 + 0.2 * i / notes.length))); },   // rasgueado: a fast sweep across the strings
  run(g, t, vol) { let i = 5 + Math.floor(Math.random() * 3); for (let k = 0; k < (this.lite ? 4 : 6) && i >= 0; k++, i--) this.pluck(g, this.PHR[i], t + k * 0.11, vol); },   // picado: a quick descending run
  clap(g, t, vol) { const c = g.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), e = c.createGain(); s.buffer = g.nb; f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 1.2;
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); s.connect(f); f.connect(e); e.connect(g.perc); s.start(t, Math.random() * 0.3, 0.08); },
  sing(g, f, t, d, vol) {   // one sung note with a little grace note and vibrato
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(f * 1.06, t); o.frequency.setValueAtTime(f, t + 0.09); f1.type = f2.type = "bandpass"; f1.frequency.value = 800; f2.frequency.value = 1150; f1.Q.value = f2.Q.value = 6;
    lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(18, t + d * 0.6); lfo.connect(lg); lg.connect(o.detune);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 0.12); e.gain.setValueAtTime(vol, t + d - 0.25); e.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(f1); o.connect(f2); f1.connect(e); f2.connect(e); e.connect(g.voc); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  },
  saeta(g, t, n) {   // a lamenting sung line in the E Phrygian mode (original melody)
    const P = this.PHR, L = [[P[4], P[3], P[2], P[1], P[0]], [P[5], P[4], P[3], P[2], P[1], P[0]], [P[3], P[2], P[1], P[2], P[0]]][n % 3], D = [0.9, 0.7, 0.8, 1.0, 1.6, 1.6]; let x = t;
    L.forEach((f, i) => { this.sing(g, f, x, D[i] + 0.15, 0.05); x += D[i]; });
  },
  bar(g, t, n, mode) {   // one bar = 4 beats; the chord changes every 2 bars
    const B = this.BEAT, ch = this.CH[Math.floor(n / 2) % 4], root = ch[0], third = ch[1], chord = [root, root * third, root * 1.498];
    const voic = this.lite ? [root * 2, root * 2 * 1.498, root * 4 * third] : [root * 2, root * 2 * 1.498, root * 4, root * 4 * third, root * 4 * 1.498];
    if (n % 2 === 0) { const dur = B * 8 + 0.8;
      this.note(g, root, t, dur, 1.5, 0.28); this.note(g, root * 2, t, dur, 2, 0.14); this.note(g, root * 2 * third, t, dur, 2.5, 0.07); this.note(g, root * 2 * 1.498, t, dur, 2.5, 0.07);
      for (const f of (this.lite ? [chord[0], chord[2]] : chord)) this.choir(g, f * 4, t, dur, mode === "boss" ? 0.04 : 0.025);
      this.bell(g, root * 4, t + 0.05, 0.11); }
    if (mode !== "menu" && n % 2 === 1 && Math.random() < 0.7) this.bell(g, chord[Math.floor(Math.random() * 3)] * 8, t + B * (1 + Math.floor(Math.random() * 3)), 0.04);
    if (mode === "menu") {
      if (Math.random() < 0.5) this.bell(g, chord[Math.floor(Math.random() * 3)] * 8, t + B * 2, 0.035);
      const arp = [voic[0], voic[1], voic[2], voic[voic.length > 3 ? 3 : 1]]; for (let i = 0; i < 4; i++) if (!(i === 2 && Math.random() < 0.3)) this.pluck(g, arp[i], t + i * B, 0.05);   // slow picked arpeggio
    }
    if (mode === "game" || mode === "boss") {
      const hard = mode === "boss";
      if (n % 2 === 0 || hard) this.strum(g, voic, t, hard ? 0.09 : 0.07, true);
      if (hard) this.strum(g, voic, t + B * 2, 0.08, false); else this.pluck(g, voic[2], t + B * 2, 0.05), this.pluck(g, voic[voic.length - 1], t + B * 3, 0.05);
      if (Math.random() < (hard ? (this.lite ? 0.5 : 0.8) : (this.lite ? 0.3 : 0.5))) this.run(g, t + B * 2.5, 0.05);
      if (n % 2 === 0) { const p = B * 8 / 12; for (let i = 1; i <= 12; i++) { const acc = [3, 6, 8, 10, 12].includes(i); if (acc) this.clap(g, t + (i - 1) * p, 0.1); else if (hard && !this.lite) this.clap(g, t + (i - 1) * p, 0.03); } }   // 12-beat flamenco count: accents on 3 6 8 10 12
      this.drum(g, t, hard ? 0.6 : 0.45); if (Math.random() < 0.6 || hard) this.drum(g, t + B * 2, 0.3);
      if (hard) { this.drum(g, t + B, 0.35); this.drum(g, t + B * 3, 0.35); }
    }
    if (n % 4 === 0 && mode !== "dead" && Math.random() < (mode === "menu" ? 0.9 : mode === "game" ? 0.4 : 0.5)) this.saeta(g, t + B * 0.5, Math.floor(n / 4));
  },
  start() {   // call after the first tap or key press (browsers block sound before that)
    try { if (this.g || !Sfx.c) return; this.g = this.build(Sfx.c); this.tNext = Sfx.c.currentTime + 0.2; this.mood(this.g, this.mode);
      this.timer = setInterval(() => { try { const c = this.g.ctx; while (this.tNext < c.currentTime + 1.5) { this.bar(this.g, this.tNext, this.bar_n++, this.mode); this.tNext += this.BEAT * 4; } } catch (e) {} }, 250); } catch (e) { this.g = null; }
  },
  setMode(m) { try { if (m === this.mode) return; this.mode = m; if (this.g) this.mood(this.g, m); } catch (e) {} },
  setOn(v) { this.on = v; try { if (this.g) this.g.master.gain.setTargetAtTime(v ? this.vol : 0, this.g.ctx.currentTime, 0.2); } catch (e) {} },
  setVol(v) { this.vol = v; try { if (this.g && this.on) this.g.master.gain.setTargetAtTime(v, this.g.ctx.currentTime, 0.1); } catch (e) {} }
};
