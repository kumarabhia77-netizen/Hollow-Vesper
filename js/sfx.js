"use strict";
// Sound effects made in code (no audio files). Browsers only allow sound after a tap or key press, so unlock() runs on the first one.
const Sfx = {
  on: true, c: null,
  unlock() {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    if (!this.c) { this.c = new A(); const n = this.c.sampleRate * 0.3, b = this.c.createBuffer(1, n, this.c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.nb = b; }
    if (this.c.state === "suspended") this.c.resume();
  },
  tone(f0, f1, dur, type, vol) {
    const c = this.c, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol) {
    const c = this.c, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb;
    f.type = "bandpass"; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t, 0, dur);
  },
  play(n) { if (!this.on || !this.c) return; const f = this.fx[n]; if (f) f.call(this); },
  fx: {
    swing() { this.noise(0.13, 1800, 0.16); },
    hit() { this.noise(0.08, 900, 0.25); this.tone(140, 50, 0.12, "sine", 0.3); },
    hurt() { this.tone(220, 70, 0.3, "sawtooth", 0.16); this.noise(0.12, 600, 0.18); },
    step() { this.noise(0.04, 400, 0.05); },
    warn() { this.tone(880, 700, 0.3, "triangle", 0.12); this.tone(1320, 1100, 0.25, "sine", 0.05); },
    dodge() { this.noise(0.18, 3200, 0.14); },
    bell() { this.tone(98, 96, 1.8, "sine", 0.25); this.tone(196, 190, 1.4, "sine", 0.12); this.tone(392, 380, 1.0, "sine", 0.06); },
    cast() { this.tone(220, 440, 0.35, "sine", 0.1); this.noise(0.3, 900, 0.08); },
    bolt() { this.noise(0.25, 1500, 0.12); this.tone(300, 120, 0.25, "sawtooth", 0.08); },
    clink() { this.tone(1800, 1200, 0.08, "square", 0.05); this.noise(0.05, 5000, 0.15); },
    chain() { this.noise(0.15, 2500, 0.18); this.tone(180, 90, 0.1, "sawtooth", 0.08); },
    chime() { this.tone(1320, 1300, 0.5, "sine", 0.04); },
    wave() { this.noise(0.4, 200, 0.2); this.tone(80, 40, 0.4, "sine", 0.25); },
    shrine() { this.tone(523, 520, 0.9, "sine", 0.1); this.tone(784, 780, 1.1, "sine", 0.08); },
    die() { this.tone(110, 40, 0.8, "sawtooth", 0.2); },
    edie() { this.tone(160, 50, 0.5, "triangle", 0.2); }
  }
};
