"use strict";
// Original dark-ambient score made in code (no audio files): cathedral organ, choir-like pad, tolling bells, slow war drum.
// Three moods: menu, game, boss. It aims for the feel of gothic ambient music without copying any game's music.
const Music = {
  on: true, mode: "menu", g: null, timer: null, bar_n: 0, tNext: 0, BEAT: 0.8,
  CH: [[73.42, 1.189], [77.78, 1.26], [65.41, 1.189], [73.42, 1.189]],   // D minor, Eb major, C minor, D minor: [root in Hz, third ratio]
  build(ctx) {
    const g = { ctx }, mk = () => ctx.createGain();
    g.master = mk(); g.master.gain.value = this.on ? 0.55 : 0; const comp = ctx.createDynamicsCompressor(); g.master.connect(comp); comp.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);   // cathedral reverb: noise fading out over ~2.6 s
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    g.verb = ctx.createConvolver(); g.verb.buffer = ir; const wet = mk(); wet.gain.value = 0.7; g.verb.connect(wet); wet.connect(g.master);
    g.bus = mk(); g.bus.connect(g.master); g.bus.connect(g.verb);
    g.pad = mk(); g.bell = mk(); g.drum = mk(); for (const n of [g.pad, g.bell, g.drum]) { n.gain.value = 0; n.connect(g.bus); }
    g.organ = ctx.createPeriodicWave(new Float32Array([0, 1, 0.45, 0.22, 0.1, 0.05]), new Float32Array(6));   // organ tone: stack of harmonics
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;   // wind bed
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; const wg = mk(); wg.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = mk(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(wg.gain); ns.connect(lp); lp.connect(wg); wg.connect(g.bus); ns.start(); lfo.start();
    return g;
  },
  mood(g, mode, fast) {
    const t = g.ctx.currentTime, M = { menu: [0.7, 0.8, 0], game: [0.55, 0.5, 0.6], boss: [0.9, 0.9, 1], dead: [0.3, 0.3, 0] }[mode] || [0, 0, 0], k = fast ? 0.01 : 0.6;
    g.pad.gain.setTargetAtTime(M[0], t, k); g.bell.gain.setTargetAtTime(M[1], t, k); g.drum.gain.setTargetAtTime(M[2], t, k);
  },
  note(g, f, t, dur, att, vol) {
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(), lp = c.createBiquadFilter(); o.setPeriodicWave(g.organ); o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 1100;
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + att); e.gain.setValueAtTime(vol, t + dur - 1.6); e.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(e); e.connect(g.pad); o.start(t); o.stop(t + dur + 0.05);
  },
  choir(g, f, t, dur, vol) {   // detuned saws through two vowel filters with slow vibrato
    const c = g.ctx, e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 2); e.gain.setValueAtTime(vol, t + dur - 2); e.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = "bandpass"; f1.frequency.value = 730; f2.frequency.value = 1090; f1.Q.value = f2.Q.value = 5;
    const mix = c.createGain(); mix.connect(f1); mix.connect(f2); f1.connect(e); f2.connect(e); e.connect(g.pad);
    const lfo = c.createOscillator(); lfo.frequency.value = 5; const lg = c.createGain(); lg.gain.value = 5; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.1);
    for (const d of [-7, 7]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d; lg.connect(o.detune); o.connect(mix); o.start(t); o.stop(t + dur + 0.1); }
  },
  bell(g, f, t, vol) {   // inharmonic partials, long decay
    const c = g.ctx; [[1, 1, 5], [2.76, 0.5, 3.5], [5.4, 0.25, 2], [8.93, 0.12, 1.2]].forEach(([r, a, d]) => { const o = c.createOscillator(), e = c.createGain(); o.frequency.value = f * r;
      e.gain.setValueAtTime(vol * a, t); e.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(e); e.connect(g.bell); o.start(t); o.stop(t + d + 0.05); });
  },
  drum(g, t, vol) {
    const c = g.ctx, o = c.createOscillator(), e = c.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(e); e.connect(g.drum); o.start(t); o.stop(t + 0.5);
  },
  bar(g, t, n, mode) {   // one bar = 4 beats; the chord changes every 2 bars
    const B = this.BEAT, ch = this.CH[Math.floor(n / 2) % 4], root = ch[0], third = ch[1], chord = [root, root * third, root * 1.498];
    if (n % 2 === 0) { const dur = B * 8 + 0.8;
      this.note(g, root, t, dur, 1.5, 0.28); this.note(g, root * 2, t, dur, 2, 0.14); this.note(g, root * 2 * third, t, dur, 2.5, 0.07); this.note(g, root * 2 * 1.498, t, dur, 2.5, 0.07);
      for (const f of chord) this.choir(g, f * 4, t, dur, mode === "boss" ? 0.035 : 0.02);
      this.bell(g, root * 4, t + 0.05, 0.11); }
    if (mode !== "menu" && n % 2 === 1 && Math.random() < 0.7) this.bell(g, chord[Math.floor(Math.random() * 3)] * 8, t + B * (1 + Math.floor(Math.random() * 3)), 0.04);
    if (mode === "menu" && Math.random() < 0.5) this.bell(g, chord[Math.floor(Math.random() * 3)] * 8, t + B * 2, 0.035);
    if (mode === "game") { this.drum(g, t, 0.45); if (Math.random() < 0.6) this.drum(g, t + B * 2, 0.3); }
    if (mode === "boss") { for (let i = 0; i < 4; i++) this.drum(g, t + B * i, i % 2 ? 0.35 : 0.6); this.drum(g, t + B * 3.5, 0.3); }
  },
  start() {   // call after the first tap or key press (browsers block sound before that)
    if (this.g || !Sfx.c) return; this.g = this.build(Sfx.c); this.tNext = Sfx.c.currentTime + 0.2; this.mood(this.g, this.mode);
    this.timer = setInterval(() => { const c = this.g.ctx; while (this.tNext < c.currentTime + 1.5) { this.bar(this.g, this.tNext, this.bar_n++, this.mode); this.tNext += this.BEAT * 4; } }, 250);
  },
  setMode(m) { if (m === this.mode) return; this.mode = m; if (this.g) this.mood(this.g, m); },
  setOn(v) { this.on = v; if (this.g) this.g.master.gain.setTargetAtTime(v ? 0.55 : 0, this.g.ctx.currentTime, 0.2); }
};
