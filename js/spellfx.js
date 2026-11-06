"use strict";
(window.HV_V = window.HV_V || {}).spellfx = 10;
// Extra spell visuals drawn on top of the existing ones: a casting sigil and converging motes, a glowing ember trail and a burst for the Ember Fireball,
// a wind wake for Wind Slash, forked lightning with a scorch mark, and a bell ring. Drawing and particles only: damage stays in main.js and spells.js.
const Spellfx = {
  prev: [], scorch: [],
  col: { fireball: ["#c8553d", "#ff9a6a"], wind: ["#d9cfbd", "#8d8374"], lightning: ["#d9cfbd", "#c8553d"], bell: ["#d9cfbd", "#c8553d"] },
  tick(dt, p) {
    const pt = o => { if (Fx.parts.length < 170) Fx.parts.push(o); };
    for (const b of Fx.bolts) {
      if (b.kind === "fire") { pt({ x: b.x - b.dir * 5, y: b.y + (Math.random() - 0.5) * 5, vx: -b.dir * (10 + Math.random() * 20), vy: (Math.random() - 0.5) * 20 - 8, g: -10, s: 1.5, life: 0.3 + Math.random() * 0.2, col: Math.random() < 0.4 ? "#ff9a6a" : "#c8553d" }); }
      else if (Math.random() < 0.7) pt({ x: b.x - b.dir * (6 + Math.random() * 14), y: b.y + (Math.random() - 0.5) * 12, vx: -b.dir * 12, vy: -4, g: 0, s: 1, life: 0.3, col: Math.random() < 0.5 ? "#d9cfbd" : "#8d8374" });
    }
    for (const b of this.prev) if (!Fx.bolts.includes(b)) this.burst(b);   // a bolt just ended: hit, wall or end of range
    this.prev = Fx.bolts.slice();
    const LD = Spells.def("lightning").delay;
    for (const s of Fx.strikes) if (s.t >= LD && !s.fxd) { s.fxd = true; this.scorch.push({ x: s.x, t: 0 }); const gy = CFG.level.ground * CFG.T;
      Fx.rings.push({ x: s.x, y: gy - 2, life: 0.35, d: 0.35, c: "#d9cfbd", r: 4, g: 34 }); Fx.rings.push({ x: s.x, y: gy - 2, life: 0.25, d: 0.25, c: "#c8553d", r: 2, g: 20 });
      for (let i = 0; i < 16; i++) pt({ x: s.x + (Math.random() - 0.5) * 8, y: gy - 3, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 120, g: 360, s: 1.5, life: 0.3 + Math.random() * 0.3, col: i % 3 ? "#d9cfbd" : "#c8553d" }); }
    for (const c of this.scorch) c.t += dt; this.scorch = this.scorch.filter(c => c.t < 4);
    if (p && p.cast >= 0 && p.castSpell && this.col[p.castSpell] && !p.dead) {   // motes drawn into the casting hand
      const hx = p.x + 6 + p.face * 9, hy = p.y + 13; for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283, r = 14 + Math.random() * 10, x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r; pt({ x, y, vx: (hx - x) * 5, vy: (hy - y) * 5, g: 0, s: 1.2, life: 0.22, col: this.col[p.castSpell][Math.random() < 0.5 ? 0 : 1] }); } }
  },
  burst(b) {
    const fire = b.kind === "fire", c = fire ? "#c8553d" : "#d9cfbd"; Fx.rings.push({ x: b.x, y: b.y, life: 0.3, d: 0.3, c, r: 3, g: fire ? 28 : 16 });
    for (let i = 0; i < (fire ? 14 : 6); i++) if (Fx.parts.length < 170) { const a = Math.random() * 6.283, sp = 30 + Math.random() * (fire ? 130 : 70); Fx.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, g: fire ? 200 : 40, s: fire ? 2 : 1.2, life: 0.25 + Math.random() * 0.3, col: fire ? (i % 3 ? "#c8553d" : "#ff9a6a") : "#d9cfbd" }); }
  },
  draw(cx, cm, p) {
    const gy = CFG.level.ground * CFG.T, X = v => Math.round(v - cm), t = performance.now() / 1000;
    for (const c of this.scorch) { const x = X(c.x), k = Math.max(0, 1 - c.t / 4); cx.save(); cx.globalAlpha = 0.7 * k; cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.ellipse(x, gy - 0.5, 13, 2.2, 0, 0, 6.283); cx.fill(); if (c.t < 1.6) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = (1 - c.t / 1.6) * 0.8; cx.strokeStyle = "#c8553d"; cx.lineWidth = 0.7; cx.beginPath(); for (const o of [-9, -3, 4, 10]) { cx.moveTo(x + o * 0.4, gy - 0.5); cx.lineTo(x + o, gy - 0.5 + (o % 2 ? 0.6 : -0.6)); } cx.stroke(); } cx.restore(); }   // scorch mark with cooling cracks
    cx.save(); cx.globalCompositeOperation = "lighter";
    for (const b of Fx.bolts) { const x = X(b.x), y = Math.round(b.y);
      if (b.kind === "fire") { const fl = 0.8 + 0.2 * Math.sin(t * 40), g = cx.createRadialGradient(x, y, 1, x, y, 16 * fl); g.addColorStop(0, "rgba(255,170,120,.6)"); g.addColorStop(0.45, "rgba(200,85,61,.28)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(x - 18, y - 18, 36, 36);
        const tg = cx.createLinearGradient(x, y, x - b.dir * 26, y); tg.addColorStop(0, "rgba(255,150,100,.55)"); tg.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = tg; cx.beginPath(); cx.moveTo(x, y - 3); cx.lineTo(x - b.dir * 26, y); cx.lineTo(x, y + 3); cx.closePath(); cx.fill(); }
      else { cx.strokeStyle = "#d9cfbd"; for (let i = 0; i < 3; i++) { cx.globalAlpha = (0.55 - i * 0.14) * Math.min(1, b.life * 4); cx.lineWidth = 1.2 - i * 0.3; cx.beginPath(); cx.arc(x - b.dir * (4 + i * 6), y, 8 + i * 2, b.dir > 0 ? -1.1 : Math.PI - 1.1, b.dir > 0 ? 1.1 : Math.PI + 1.1); cx.stroke(); } cx.globalAlpha = 1; } }
    const LD = Spells.def("lightning").delay;
    for (const s of Fx.strikes) { const x = X(s.x);
      if (s.t < LD) { const k = s.t / LD; cx.globalAlpha = 0.3 + 0.5 * k; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.setLineDash([2, 2]); cx.lineDashOffset = -t * 20; cx.beginPath(); cx.ellipse(x, gy - 1, 12, 3, 0, 0, 6.283); cx.stroke(); cx.setLineDash([]);
        const sg = cx.createRadialGradient(x, CFG.CAMY, 1, x, CFG.CAMY, 24 + 20 * k); sg.addColorStop(0, `rgba(217,207,189,${0.25 * k})`); sg.addColorStop(1, "rgba(217,207,189,0)"); cx.globalAlpha = 1; cx.fillStyle = sg; cx.fillRect(x - 50, CFG.CAMY - 10, 100, 60); }   // charge in the sky, ring on the ground
      else if (s.t < 0.6) { const seed = Math.floor(s.t * 40), fade = Math.min(1, (0.6 - s.t) * 6); cx.lineJoin = "round";
        for (let f = 0; f < 3; f++) { const k0 = 2 + f * 2, bx = x + ((((seed * 31 + k0 * 17) % 13) - 6) * 1.1), by = CFG.CAMY + 14 + k0 * 14, dir = f % 2 ? 1 : -1;   // forks that leave the main bolt
          cx.globalAlpha = 0.7 * fade; cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 1.1; cx.beginPath(); cx.moveTo(bx, by); let px = bx, py = by; for (let j = 1; j <= 3; j++) { px += dir * (6 + ((seed + j * 7 + f) % 5)); py += 8 + ((seed * 3 + j) % 6); cx.lineTo(px, py); } cx.stroke(); }
        const fg = cx.createRadialGradient(x, gy - 2, 1, x, gy - 2, 26); fg.addColorStop(0, `rgba(255,220,190,${0.6 * fade})`); fg.addColorStop(1, "rgba(200,85,61,0)"); cx.globalAlpha = 1; cx.fillStyle = fg; cx.fillRect(x - 28, gy - 30, 56, 34); } }
    if (p && p.cast >= 0 && p.castSpell && this.col[p.castSpell] && !p.dead) {   // casting sigil under the Warden, brighter as the cast completes
      const sp = Spells.def(p.castSpell), k = Math.min(1, p.cast / sp.cast), x = X(p.x + 6), y = Math.round(p.y + p.h), c = this.col[p.castSpell];
      cx.globalAlpha = 0.25 + 0.55 * k; cx.strokeStyle = c[0]; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(x, y - 1, 16, 4, 0, 0, 6.283); cx.stroke(); cx.strokeStyle = c[1]; cx.lineWidth = 0.7; cx.beginPath(); cx.ellipse(x, y - 1, 10, 2.6, 0, 0, 6.283); cx.stroke();
      cx.fillStyle = c[1]; for (let i = 0; i < 8; i++) { const a = t * 2.5 + i * 0.785; cx.fillRect(Math.round(x + Math.cos(a) * 16) - 0.5, Math.round(y - 1 + Math.sin(a) * 4) - 0.5, 1.4, 1.4); }
      const hx = X(p.x + 6 + p.face * 9), hy = Math.round(p.y + 13), hg = cx.createRadialGradient(hx, hy, 0.5, hx, hy, 6 + 8 * k); hg.addColorStop(0, `rgba(255,190,150,${0.7 * k})`); hg.addColorStop(1, "rgba(200,85,61,0)"); cx.globalAlpha = 1; cx.fillStyle = hg; cx.fillRect(hx - 16, hy - 16, 32, 32); }
    cx.restore();
  }
};
