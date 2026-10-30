"use strict";
(window.HV_V = window.HV_V || {}).sfx = 10;
// Sound effects and creature voices made in code (no audio files). Browsers only allow sound after a tap or key press, so unlock() runs on the first one.
const Sfx = {
  on: true, vol: 0.9, c: null, out: null, nb: null, active: [], last: {}, _to: null, pm: 1, bd: 0, _cv: {},
  unlock() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      if (!this.c) { const c = this.c = new A(), n = c.sampleRate * 0.5, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.nb = b;
        this.out = c.createGain(); this.out.gain.value = this.vol; const comp = c.createDynamicsCompressor(); this.out.connect(comp); comp.connect(c.destination); }
      if (this.c.state === "suspended") this.c.resume();
    } catch (e) { this.c = null; }
  },
  setVol(v) { this.vol = v; if (this.out) this.out.gain.value = v; },
  to() { return this._to || this.out; },
  curve(k) { if (!this._cv[k]) { const n = 257, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / 128 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } this._cv[k] = a; } return this._cv[k]; },   // symmetric curve, exactly 0 at the centre (no DC hum)
  tone(f0, f1, dur, type, vol) {
    const c = this.c, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.to()); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol) {
    const c = this.c, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb;
    f.type = "bandpass"; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.to()); s.start(t, 0, dur);
  },
  // A creature voice: a buzzing source shaped by two or three vowel filters, with vibrato, breath noise and optional distortion.
  vocal(o) {
    const c = this.c, now = c.currentTime; this.active = this.active.filter(t => t > now); if (this.active.length >= 7) return;   // never more than 7 voices at once
    const t = now + (o.delay || 0) + this.bd, m = this.pm, dur = o.dur, to = this.to(); this.active.push(t + dur);
    const env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(o.vol, t + (o.att || 0.04)); env.gain.setValueAtTime(o.vol, t + dur * 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let dest = to; if (o.drive) { const ws = c.createWaveShaper(); ws.curve = this.curve(o.drive); ws.connect(to); dest = ws; } env.connect(dest);
    const src = c.createGain();
    for (const [f, q, g] of o.formants) { const b = c.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = f; b.Q.value = q; const gg = c.createGain(); gg.gain.value = g; src.connect(b); b.connect(gg); gg.connect(env); }
    if (o.f0) { const osc = c.createOscillator(); osc.type = o.type || "sawtooth"; osc.frequency.setValueAtTime(o.f0 * m, t); osc.frequency.linearRampToValueAtTime(o.f1 * m, t + dur * 0.5); osc.frequency.linearRampToValueAtTime((o.f2 || o.f1) * m, t + dur);
      if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1] * m; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
      osc.connect(src); osc.start(t); osc.stop(t + dur + 0.05); }
    if (o.noise) { const ns = c.createBufferSource(); ns.buffer = this.nb; ns.loop = true; const ng = c.createGain(); ng.gain.value = o.noise; ns.connect(ng); ng.connect(src); ns.start(t); ns.stop(t + dur + 0.05); }
  },
  cd: { scream: 0.3, screech: 0.25, wail: 0.6, cry: 0.25, groan: 0.5, growl: 0.5, rasp: 0.3, roar: 0.5, bossroar: 1.2, laugh: 0.8, whisper: 0.6, grunt: 0.2, pcry: 0.35, pdeath: 1, chant: 0.3, thunder: 0.3 },
  play(n, pm) {   // play a sound; never throws, so a sound problem can not stop the game
    try { if (!this.on || !this.c) return; const now = this.c.currentTime, cd = this.cd[n] === undefined ? 0.04 : this.cd[n]; if (now - (this.last[n] || -9) < cd) return; this.last[n] = now; const f = this.fx[n]; if (f) { this.pm = pm || 1; f.call(this); } } catch (e) { this._to = null; this.bd = 0; }
  },
  at(n, x, pm) {   // play a sound at a world position: quieter and panned the farther it is from the Warden
    try { if (!this.on || !this.c) return; const pl = Fx.pl; let vol = 1, pan = 0; if (pl) { const dx = x - (pl.x + 6); vol = Math.max(0, 1 - Math.abs(dx) / 260); vol *= vol; pan = Math.max(-1, Math.min(1, dx / 180)); }
      if (vol < 0.04) return; const c = this.c, g = c.createGain(); g.gain.value = vol; let head = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); head = p; }
      head.connect(this.out); this._to = g; this.play(n, pm); this._to = null; } catch (e) { this._to = null; }
  },
  fx: {
    swing() { this.noise(0.14, 1800, 0.34); this.noise(0.1, 3600, 0.16); this.tone(900, 300, 0.12, "sawtooth", 0.05); if (Math.random() < 0.5) this.fx.grunt.call(this); },
    hit() { this.noise(0.1, 900, 0.4); this.noise(0.05, 3000, 0.2); this.tone(140, 50, 0.14, "sine", 0.35); },
    hurt() { this.tone(220, 70, 0.3, "sawtooth", 0.16); this.noise(0.12, 600, 0.18); this.fx.pcry.call(this); },
    step() { this.noise(0.04, 400, 0.05); },
    warn() { this.tone(880, 700, 0.3, "triangle", 0.12); this.tone(1320, 1100, 0.25, "sine", 0.05); },
    dodge() { this.noise(0.18, 3200, 0.14); },
    bell() { this.tone(98, 96, 1.8, "sine", 0.25); this.tone(196, 190, 1.4, "sine", 0.12); this.tone(392, 380, 1.0, "sine", 0.06); },
    cast() { this.tone(220, 440, 0.35, "sine", 0.1); this.noise(0.3, 900, 0.08); this.fx.chant.call(this); },
    bolt() { this.noise(0.25, 1500, 0.12); this.tone(300, 120, 0.25, "sawtooth", 0.08); },
    whoosh() { this.noise(0.3, 1200, 0.15); this.noise(0.25, 2400, 0.1); },
    thunder() { this.noise(0.9, 120, 0.5); this.noise(0.2, 3000, 0.35); this.tone(60, 30, 0.9, "sine", 0.4); },
    clink() { this.tone(1800, 1200, 0.08, "square", 0.05); this.noise(0.05, 5000, 0.15); },
    chain() { this.noise(0.15, 2500, 0.18); this.tone(180, 90, 0.1, "sawtooth", 0.08); },
    chime() { this.tone(1320, 1300, 0.5, "sine", 0.04); },
    wave() { this.noise(0.4, 200, 0.2); this.tone(80, 40, 0.4, "sine", 0.25); },
    shrine() { this.tone(523, 520, 0.9, "sine", 0.1); this.tone(784, 780, 1.1, "sine", 0.08); },
    die() { this.tone(110, 40, 0.8, "sawtooth", 0.2); this.fx.pdeath.call(this); },
    edie() { this.tone(160, 50, 0.5, "triangle", 0.2); },
    // ---- voices ----
    scream() { this.vocal({ f0: 520, f1: 980, f2: 640, dur: 0.62, vib: [13, 25], formants: [[900, 6, 1], [1500, 7, 0.8], [2600, 8, 0.4]], noise: 0.35, vol: 0.2, drive: 6 }); },
    screech() { this.vocal({ f0: 1300, f1: 2100, f2: 1500, dur: 0.34, vib: [18, 40], formants: [[1800, 8, 1], [3000, 8, 0.5]], noise: 0.25, vol: 0.1, drive: 4 }); },
    wail() { this.vocal({ f0: 380, f1: 520, f2: 150, dur: 1.5, att: 0.15, vib: [5.5, 14], formants: [[650, 5, 1], [1080, 6, 0.7]], noise: 0.12, vol: 0.2 }); },
    cry() { this.vocal({ f0: 430, f1: 520, f2: 260, dur: 0.7, vib: [5.5, 12], formants: [[650, 5, 1], [1080, 6, 0.7]], noise: 0.12, vol: 0.2 }); },
    groan() { this.vocal({ f0: 95, f1: 80, f2: 58, dur: 0.85, att: 0.1, vib: [6, 4], formants: [[500, 4, 1], [900, 5, 0.6]], noise: 0.25, vol: 0.28, drive: 3 }); },
    growl() { this.vocal({ f0: 70, f1: 58, f2: 50, dur: 0.6, vib: [28, 10], formants: [[450, 3, 1], [800, 4, 0.6]], noise: 0.5, vol: 0.3, drive: 5 }); },
    rasp() { this.vocal({ f0: 300, f1: 480, f2: 360, dur: 0.38, vib: [20, 20], formants: [[800, 5, 1], [1400, 6, 0.7]], noise: 0.55, vol: 0.2, drive: 5 }); },
    roar() { this.vocal({ f0: 140, f1: 210, f2: 90, dur: 0.95, att: 0.06, vib: [20, 15], formants: [[700, 3, 1], [1200, 4, 0.7]], noise: 0.45, vol: 0.3, drive: 7 }); },
    laugh() { for (let k = 0; k < 6; k++) this.vocal({ delay: 0.1 + k * 0.15, f0: 270 - k * 14, f1: 240 - k * 14, f2: 215 - k * 14, dur: 0.11, att: 0.01, formants: [[800, 5, 1], [1250, 6, 0.8]], noise: 0.3, vol: 0.2 }); },
    bossroar() { this.vocal({ f0: 70, f1: 120, f2: 45, dur: 1.5, att: 0.1, vib: [18, 12], formants: [[600, 3, 1], [1000, 4, 0.8]], noise: 0.5, vol: 0.38, drive: 8 }); this.bd = 1.1; this.fx.laugh.call(this); this.bd = 0; },
    whisper() { this.vocal({ dur: 0.7, att: 0.2, formants: [[1800, 6, 1], [3200, 6, 0.6]], noise: 1, vol: 0.09 }); },
    grunt() { this.vocal({ f0: 170, f1: 130, f2: 110, dur: 0.18, att: 0.02, formants: [[700, 5, 1], [1100, 5, 0.6]], noise: 0.3, vol: 0.3, drive: 2 }); },
    pcry() { this.vocal({ f0: 300, f1: 260, f2: 180, dur: 0.45, vib: [6, 10], formants: [[600, 5, 1], [1000, 5, 0.7]], noise: 0.15, vol: 0.18 }); },
    pdeath() { this.vocal({ f0: 280, f1: 200, f2: 90, dur: 1.3, att: 0.1, vib: [5, 8], formants: [[600, 5, 1], [1000, 5, 0.7]], noise: 0.2, vol: 0.2 }); },
    chant() { this.vocal({ f0: 220, f1: 230, f2: 215, dur: 0.7, att: 0.2, vib: [5, 6], formants: [[800, 6, 1], [1200, 6, 0.8]], vol: 0.09 }); this.vocal({ f0: 330, f1: 345, f2: 322, dur: 0.7, att: 0.25, vib: [5, 8], formants: [[800, 6, 1], [1200, 6, 0.8]], vol: 0.06 }); }
  }
};
