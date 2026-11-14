"use strict";
(window.HV_V = window.HV_V || {}).whip = 10;
// Gilded Thorn (blade-tipped whip), restyled to match the concept sheet: black-iron thorn chain with gilded links and torn blood-red ribbons, a long ornate blade tip,
// a three-layer trail (chain core, glow, particles), thin crimson blade-slash crescents, star-burst impacts, a resonance ring, a heavy ground crack and shadow afterimages.
// Drawing and feedback only: damage, hitboxes and timing live in entities.js and config.js.
const Whip = {
  trail: [], bursts: [], rings: [], cracks: [], ghostT: 0,
  GILT: "#ffb45e", CRIM: "#ff3d4f",
  tier(res) { const W = CFG.player.whip; return res >= W.tier2 ? 2 : res >= W.tier1 ? 1 : 0; },
  ease: { out: t => 1 - Math.pow(1 - t, 3), inn: t => t * t },
  angle(m, t) {
    const E = this.ease;
    if (t <= m.from) return m.a0 - (m.a1 - m.a0) * 0.12 * (t / m.from);
    if (t <= m.to) return m.a0 + (m.a1 - m.a0) * E.out((t - m.from) / (m.to - m.from));
    return m.a1 + 0.35 * E.inn(Math.min(1, (t - m.to) / (m.dur - m.to)));
  },
  length(m, t) {
    const E = this.ease;
    if (t <= m.from) return m.reach * (0.45 + 0.2 * (t / m.from));
    if (t <= m.to) return m.reach * (0.65 + 0.35 * E.out(Math.min(1, (t - m.from) / (m.to - m.from) * 1.4)));
    return m.reach * (1 - 0.7 * E.inn(Math.min(1, (t - m.to) / (m.dur - m.to))));
  },
  // Points of the whip from hand to tip, in world pixels.
  pose(p) {
    const f = p.face, hx = p.x + p.w / 2 + f * 6, hy = p.y + 14, pts = [];
    if (p.atk < 0) {   // resting: a short coil hanging from the belt, swaying a little
      const sw = Math.sin(p.t * 2.2) * 1.2;
      for (let k = 0; k <= 9; k++) { const q = k / 9; pts.push([hx - f * (2 + 8 * Math.sin(q * 2.6)) + sw * q, hy + 3 + q * 7 + 2 * q * q]); }
      return pts;
    }
    const m = p.move(), t = p.atk, N = 16, active = t >= m.from && t <= m.to, L = this.length(m, t);
    for (let k = 0; k <= N; k++) {
      const q = k / N, a = this.angle(m, t - q * 0.055), amp = active ? 4.5 * (1 - (t - m.from) / (m.to - m.from) * 0.5) : 2.2;
      const rip = Math.sin(q * 6.5 - t * 34) * amp * q * (1 - q * 0.3), ca = Math.cos(a) * f, sa = Math.sin(a);
      pts.push([hx + ca * L * q - sa * f * rip * 0.5, hy + sa * L * q + ca * f * rip * 0.35 + (t > m.to ? q * q * 5 * ((t - m.to) / (m.dur - m.to)) : 0)]);
    }
    return pts;
  },
  tick(dt, p) {   // sample the tip while a lash is active; age every effect; ember particles along the trail
    for (const s of this.trail) s.a -= dt; this.trail = this.trail.filter(s => s.a > 0);
    for (const b of this.bursts) b.t += dt; this.bursts = this.bursts.filter(b => b.t < 0.45);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < 0.5);
    for (const c of this.cracks) c.t += dt; this.cracks = this.cracks.filter(c => c.t < 0.9);
    if (p.atk >= 0 && !p.dead) { const m = p.move();
      if (p.atk >= m.from * 0.8 && p.atk <= m.to + 0.05) { const pts = this.pose(p), tip = pts[pts.length - 1], h = pts[0]; this.trail.push({ x: tip[0], y: tip[1], ix: h[0] + (tip[0] - h[0]) * 0.74, iy: h[1] + (tip[1] - h[1]) * 0.74, a: 0.22 });
        if (Math.random() < 0.7 && Fx.parts.length < 165) Fx.parts.push({ x: tip[0], y: tip[1], vx: (Math.random() - 0.5) * 30, vy: -8 - Math.random() * 20, g: 30, s: 1, life: 0.35, col: Math.random() < 0.4 ? this.GILT : "#ff5a3d" }); if (Fx.parts.length < 165) Fx.parts.push({ x: tip[0], y: tip[1], vx: (Math.random() - 0.5) * 20, vy: -4 - Math.random() * 14, g: 10, s: 2, life: 0.3, col: Math.random() < 0.5 ? "#ffd29a" : "#ff3d4f" }); }   // particle layer
      if ((m.fin || m.heavy) && p.atk > m.from && p.atk < m.to) { this.ghostT -= dt; if (this.ghostT <= 0) { this.ghostT = 0.05; Fx.ghosts.push({ x: p.x, y: p.y, face: p.face, life: 0.35, f: 2 }); } } }   // shadow afterimage on the big moves
  },
  crack(p, m) {   // the moment a lash goes active
    const tier = this.tier(p.res), x = p.x + p.w / 2 + p.face * m.reach * 0.85, gy = p.y + 26;
    Sfx.play(m.fin ? "bell" : "whoosh");
    if (m.fin || m.heavy) { Fx.shake = Math.max(Fx.shake, m.fin ? 0.26 : 0.2); this.cracks.push({ x, y: gy, t: 0, big: m.fin ? 1.3 : 1 }); dust(x, gy, m.fin ? 10 : 7);
      for (let i = 0; i < 9; i++) if (Fx.parts.length < 165) Fx.parts.push({ x: x + (Math.random() - 0.5) * 30, y: gy - 2, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 70, g: 300, s: 2, life: 0.45, col: i % 3 ? "#5b5560" : "#c8553d" });   // stone debris
      if (m.fin) { Fx.rings.push({ x: p.x + 6, y: gy, life: 0.5, d: 0.5, c: "#c8553d", r: 5, g: 60 }); this.rings.push({ x: p.x + 6, y: p.y + 14, t: 0, big: 2.2 }); } }
    else if (p.combo === 2) { Fx.shake = Math.max(Fx.shake, 0.08); dust(x, gy, 4); }
    if (tier > 0) for (let i = 0; i < 3 + tier * 2; i++) if (Fx.parts.length < 160) Fx.parts.push({ x: x + (Math.random() - 0.5) * 12, y: p.y + 16 + Math.random() * 12, vx: p.face * (20 + Math.random() * 40), vy: -10 - Math.random() * 20, g: -10, s: 1, life: 0.4 + Math.random() * 0.3, col: "#c8553d" });
  },
  gain(p) {   // landing a hit builds Resonance; each tier gives a resonance ring
    const W = CFG.player.whip, before = this.tier(p.res); p.res = Math.min(100, p.res + W.gain); p.resT = 0;
    if (this.tier(p.res) > before) { this.rings.push({ x: p.x + 6, y: p.y + 14, t: 0, big: 1.3 }); Fx.rings.push({ x: p.x + 6, y: p.y + 14, life: 0.45, d: 0.45, c: "#c8553d", r: 4, g: 24 }); Sfx.play("chime"); p.resPulse = 0.5; }
  },
  hit(p, e, m) {   // star-burst impact: spikes, a vertical streak, ground dust, stone debris and a few dark-red drops
    const x = e.x + e.w / 2, y = e.y + e.h * 0.4, tier = this.tier(p.res), big = m.fin || m.heavy;
    this.bursts.push({ x, y, t: 0, big: big ? 1.5 : 1 + tier * 0.15, seed: Math.random() * 6 });
    for (let i = 0; i < (big ? 12 : 5); i++) { if (Fx.parts.length > 165) break; const a = (Math.random() - 0.5) * 2.6; Fx.parts.push({ x, y, vx: Math.cos(a) * p.face * (50 + Math.random() * 110), vy: Math.sin(a) * 100 - 30, g: 260, s: 2, life: 0.25 + Math.random() * 0.25, col: i % 4 === 0 ? "#5b5560" : i % 4 === 1 ? this.GILT : "#c8553d" }); }
    for (let i = 0; i < 3; i++) if (Fx.parts.length < 165) Fx.parts.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, g: 280, s: 1, life: 0.5, col: "#6b1d24" });
    if (big) { Fx.hitstop = Math.max(Fx.hitstop, 0.1); Fx.shake = Math.max(Fx.shake, 0.25); }
  },
  draw(cx, cm, p) {
    const gy = CFG.level.ground * CFG.T, X = q => Math.round(q[0] - cm), Y = q => Math.round(q[1]), tier = p.dead ? 0 : this.tier(p.res), t = p.t;
    cx.save(); cx.lineCap = "round"; cx.lineJoin = "round";
    // ground cracks (heavy and Rapture): jagged glowing lines, stone and dust come from particles
    for (const c of this.cracks) { const k = Math.max(0, 1 - c.t / 0.9), x = Math.round(c.x - cm), L = 26 * c.big * Math.min(1, c.t * 8); cx.globalAlpha = k;
      for (const dir of [-1, 1]) { cx.strokeStyle = "#0c0b11"; cx.lineWidth = 2.4; cx.beginPath(); cx.moveTo(x, gy - 1); let px = x, py = gy - 1; for (let i = 1; i <= 6; i++) { px += dir * L / 6; py = gy - 1 + (i % 2 ? 1.4 : -0.6); cx.lineTo(px, py); } cx.stroke();
        cx.globalCompositeOperation = "lighter"; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.stroke(); cx.globalCompositeOperation = "source-over"; } }
    // blade-slash crescents: thin, crimson with a bright edge, fading
    if (this.trail.length > 1) { for (let i = 1; i < this.trail.length; i++) { const a = this.trail[i - 1], b = this.trail[i], k = Math.max(0, Math.min(1, b.a / 0.22));
        cx.globalAlpha = k * 0.85; cx.beginPath(); cx.moveTo(Math.round(a.x - cm), Math.round(a.y)); cx.lineTo(Math.round(b.x - cm), Math.round(b.y)); cx.lineTo(Math.round(b.ix - cm), Math.round(b.iy)); cx.lineTo(Math.round(a.ix - cm), Math.round(a.iy)); cx.closePath();
        const g = cx.createLinearGradient(Math.round(b.x - cm), Math.round(b.y), Math.round(b.ix - cm), Math.round(b.iy)); g.addColorStop(0, "rgba(255,190,120,.95)"); g.addColorStop(0.35, "rgba(255,61,79,.75)"); g.addColorStop(1, "rgba(107,29,36,0)"); cx.fillStyle = g; cx.fill();
        cx.globalCompositeOperation = "lighter"; cx.strokeStyle = "#ffd29a"; cx.lineWidth = 1.2 + 2 * k; cx.beginPath(); cx.moveTo(Math.round(a.x - cm), Math.round(a.y)); cx.lineTo(Math.round(b.x - cm), Math.round(b.y)); cx.stroke(); cx.globalCompositeOperation = "source-over"; } }
    cx.globalAlpha = 1;
    if (!p.dead) {
      const pts = this.pose(p), f = p.face;
      if (tier) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.22 + 0.16 * tier + (p.atk >= 0 ? 0.2 : 0); cx.strokeStyle = this.CRIM; cx.lineWidth = 6; cx.beginPath(); pts.forEach((q, i) => i ? cx.lineTo(X(q), Y(q)) : cx.moveTo(X(q), Y(q))); cx.stroke(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }   // glow layer, stronger at higher resonance
      cx.strokeStyle = "#0c0b11"; cx.lineWidth = 2.8; cx.beginPath(); pts.forEach((q, i) => i ? cx.lineTo(X(q), Y(q)) : cx.moveTo(X(q), Y(q))); cx.stroke();      // dark outline
      cx.strokeStyle = "#2a2630"; cx.lineWidth = 1.7; cx.stroke();                                                                                                  // black-iron chain core
      for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i + 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (i % 2 === 0) { cx.fillStyle = this.GILT; cx.fillRect(X(pts[i]) - 0.6, Y(pts[i]) - 0.6, 1.3, 1.3); }                                                       // gilded link
        if (i % 3 === 1) { const nx = -Math.sin(ang), ny = Math.cos(ang), sg = (i % 2 ? 1 : -1); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(X(pts[i]), Y(pts[i])); cx.lineTo(X(pts[i]) + nx * 2.8 * sg, Y(pts[i]) + ny * 2.8 * sg); cx.stroke(); cx.strokeStyle = this.GILT; cx.lineWidth = 0.5; cx.stroke(); } }   // thorns
      const rb = pts.length > 6 ? [3, 6] : [];                                                                                                                          // torn blood-red ribbons near the handle
      for (const ri of rb) { const q = pts[ri], sw = Math.sin(t * 5 + ri) * 1.2; cx.fillStyle = "#c42a3a"; cx.beginPath(); cx.moveTo(X(q), Y(q)); cx.lineTo(X(q) - f * 5 + sw, Y(q) + 7); cx.lineTo(X(q) - f * 2 + sw, Y(q) + 5); cx.lineTo(X(q) - f * 3 + sw, Y(q) + 9); cx.lineTo(X(q) + f * 1, Y(q) + 2); cx.closePath(); cx.fill(); }
      const a = pts[pts.length - 3], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);                                                                 // long ornate blade tip
      cx.save(); cx.translate(X(b), Y(b)); cx.rotate(ang);
      cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(-2, -2.6); cx.lineTo(3, -3.4); cx.lineTo(12, 0); cx.lineTo(3, 3.4); cx.lineTo(-2, 2.6); cx.closePath(); cx.fill();
      cx.fillStyle = "#8a4a3c"; cx.beginPath(); cx.moveTo(-1, -1.8); cx.lineTo(3, -2.4); cx.lineTo(11, 0); cx.lineTo(3, 2.4); cx.lineTo(-1, 1.8); cx.closePath(); cx.fill();
      cx.fillStyle = this.GILT; cx.beginPath(); cx.moveTo(-1, -1.8); cx.lineTo(3, -2.4); cx.lineTo(11, 0); cx.lineTo(3, -0.3); cx.closePath(); cx.fill();                  // lit upper edge
      cx.fillStyle = "#d9cfbd"; cx.fillRect(2, -0.4, 5, 0.6);
      cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(-1, -2.6); cx.lineTo(-3.6, -5); cx.lineTo(1, -3); cx.closePath(); cx.fill(); cx.beginPath(); cx.moveTo(-1, 2.6); cx.lineTo(-3.6, 5); cx.lineTo(1, 3); cx.closePath(); cx.fill();   // barbs
      if (true) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#ff7a3d"; cx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 18); cx.fillRect(-1, -1, 10, 2); }
      cx.restore();
      const h = pts[0]; cx.fillStyle = "#0c0b11"; cx.fillRect(X(h) - 2, Y(h) - 2, 4, 4); cx.fillStyle = "#3a2024"; cx.fillRect(X(h) - 1.5, Y(h) - 1.5, 3, 3); cx.fillStyle = this.GILT; cx.fillRect(X(h) - 0.7, Y(h) - 1.5, 1.4, 3);   // ornate grip
      if (tier === 2 && p.atk < 0 && Math.random() < 0.25 && Fx.parts.length < 165) Fx.parts.push({ x: b[0], y: b[1], vx: (Math.random() - 0.5) * 8, vy: -8, g: -8, s: 1, life: 0.5, col: "#c8553d" });
      if (tier) { const px = X([p.x + 6]), py = Y([0, p.y + 26]); cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.18 + 0.1 * tier; cx.strokeStyle = "#c8553d"; cx.lineWidth = 0.8; cx.beginPath(); cx.ellipse(px, py - 1, 11 + tier * 2, 3, 0, 0, 6.283); cx.stroke(); cx.globalCompositeOperation = "source-over"; }   // faint resonance ring at the feet
    }
    cx.globalAlpha = 1;
    for (const b of this.bursts) { const k = b.t / 0.45, x = Math.round(b.x - cm), y = Math.round(b.y), L = (5 + 14 * Math.min(1, k * 2.2)) * b.big, al = 1 - k;   // star-burst
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = al; cx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const a = b.seed + i * 0.5236, ll = L * (i % 2 ? 0.55 : 1); cx.strokeStyle = i % 3 === 0 ? "#d9cfbd" : i % 3 === 1 ? "#ff9a6a" : "#c8553d"; cx.beginPath(); cx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); cx.lineTo(x + Math.cos(a) * ll, y + Math.sin(a) * ll); cx.stroke(); }
      cx.strokeStyle = "#ff9a6a"; cx.beginPath(); cx.moveTo(x, y - L * 1.3); cx.lineTo(x, y + 2); cx.stroke();                                                  // vertical streak
      const g = cx.createRadialGradient(x, y, 0.5, x, y, 9 * b.big); g.addColorStop(0, "rgba(255,200,160,.8)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(x - 10 * b.big, y - 10 * b.big, 20 * b.big, 20 * b.big); cx.globalCompositeOperation = "source-over"; }
    for (const r of this.rings) { const k = r.t / 0.5, x = Math.round(r.x - cm), y = Math.round(r.y), R = (4 + 11 * k) * r.big, al = 1 - k;   // resonance ring: core ring, diamond core, cross ticks
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = al; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1.3; cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.stroke(); cx.strokeStyle = "#ff9a6a"; cx.lineWidth = 0.6; cx.beginPath(); cx.arc(x, y, R * 0.7, 0, 6.283); cx.stroke();
      cx.fillStyle = "#ff9a6a"; cx.beginPath(); cx.moveTo(x, y - 2.2); cx.lineTo(x + 1.6, y); cx.lineTo(x, y + 2.2); cx.lineTo(x - 1.6, y); cx.closePath(); cx.fill();
      cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 0.7; for (let i = 0; i < 4; i++) { const a = i * 1.5708 + k; cx.beginPath(); cx.moveTo(x + Math.cos(a) * (R + 1), y + Math.sin(a) * (R + 1)); cx.lineTo(x + Math.cos(a) * (R + 3), y + Math.sin(a) * (R + 3)); cx.stroke(); } cx.globalCompositeOperation = "source-over"; }
    cx.restore();
  },
  hud(cx, p) {   // resonance emblem and gauge (0-30 minor glow, 31-60 medium glow, 61-100 full bloom: Rapture Lash ready)
    const W = CFG.player.whip, x = 18, y = 62, w = 42, h = 3, k = Math.min(1, p.res / 100), t = this.tier(p.res), tt = performance.now() / 1000;
    cx.fillStyle = "rgba(12,11,17,.85)"; cx.fillRect(x - 1, y - 1, w + 2, h + 2); cx.fillStyle = "#2a2630"; cx.fillRect(x, y, w, h);
    const g = cx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#6b1d24"); g.addColorStop(1, t === 2 ? "#ff9a6a" : "#c8553d"); cx.fillStyle = g; cx.fillRect(x, y, w * k, h);
    cx.fillStyle = "#0c0b11"; cx.fillRect(x + w * W.tier1 / 100, y, 0.7, h); cx.fillRect(x + w * W.tier2 / 100, y, 0.7, h); cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.5; cx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5);
    const ex = 10, ey = y + 1.5, R = 6.5; cx.fillStyle = "rgba(12,11,17,.9)"; cx.beginPath(); cx.arc(ex, ey, R, 0, 6.283); cx.fill();
    cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.8; cx.beginPath(); cx.arc(ex, ey, R, 0, 6.283); cx.stroke();
    cx.strokeStyle = t === 0 ? "#6b1d24" : "#c8553d"; cx.lineWidth = 1.2; cx.beginPath(); cx.arc(ex, ey, R - 1.2, -Math.PI / 2, -Math.PI / 2 + 6.283 * k); cx.stroke();      // ring fills with resonance
    cx.fillStyle = t === 2 ? "#ff9a6a" : t === 1 ? "#c8553d" : "#8a4a3c"; cx.beginPath(); cx.moveTo(ex, ey - 2.6); cx.lineTo(ex + 1.9, ey); cx.lineTo(ex, ey + 2.6); cx.lineTo(ex - 1.9, ey); cx.closePath(); cx.fill();
    cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 0.5; for (let i = 0; i < 4; i++) { const a = i * 1.5708; cx.beginPath(); cx.moveTo(ex + Math.cos(a) * (R + 0.5), ey + Math.sin(a) * (R + 0.5)); cx.lineTo(ex + Math.cos(a) * (R + 2), ey + Math.sin(a) * (R + 2)); cx.stroke(); }
    if (t === 2) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = `rgba(200,85,61,${0.25 + 0.2 * Math.sin(tt * 6)})`; cx.beginPath(); cx.arc(ex, ey, R + 3, 0, 6.283); cx.fill(); cx.fillRect(x - 2, y - 2, w + 4, h + 4); cx.globalCompositeOperation = "source-over"; }
    cx.fillStyle = "#d9cfbd"; cx.font = "4px Georgia,serif"; cx.fillText(t === 2 ? "RAPTURE" : t === 1 ? "BLOOM" : "THORN", x + w + 3, y + 3);
  }
};

const Bellfx = {
  chainImpact(x, y, dir) {   // separate chain-impact effect: flat shock ring, flying iron links, dust and sparks
    Fx.rings.push({ x, y: y - 2, life: 0.28, d: 0.28, c: "#d9cfbd", r: 3, g: 20 });
    Fx.rings.push({ x, y: y - 2, life: 0.18, d: 0.18, c: "#c8553d", r: 2, g: 11 });
    for (let i = 0; i < 8; i++) { if (Fx.parts.length > 160) break; Fx.parts.push({ x: x + (Math.random() - 0.5) * 6, y: y - 3, vx: (Math.random() - 0.3) * dir * 90 + (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 70, g: 320, s: 2, life: 0.35 + Math.random() * 0.25, col: i % 3 ? "#5b5560" : "#d9cfbd" }); }
  },
  pose(cx, e, an) {   // cloak sway, breathing, hit recoil and bell vibration, applied from the feet up
    let sk = 0, sy = 1, jx = 0;
    if (e.st === "patrol" || e.st === "chase" || e.st === "idle") { sk = Math.sin(e.t * 3.1 + e.x * 0.05) * 0.03; if (an === "idle") sy = 1 + Math.sin(e.t * 2.4) * 0.012; }
    else if (e.st === "hurt" || e.st === "stagger") { const d = e.st === "hurt" ? 0.3 : 0.55; sk = 0.13 * Math.max(0, 1 - e.t / d); }
    else if (e.st === "windup") sk = -0.05 * Math.min(1, e.t / 0.3);
    else if (e.st === "ringup") { sk = 0.04 * Math.sin(e.t * 8); jx = Math.sin(e.t * 70) * 0.35 * Math.min(1, e.t / 0.4); sy = 1 + 0.02 * Math.min(1, e.t / 0.5); }
    else if (e.st === "ring") { jx = Math.sin(e.t * 90) * 0.7 * (1 - e.t / 0.6); sy = 1 - 0.015; }
    if (jx || sk || sy !== 1) cx.transform(1, 0, -sk, sy, jx, 0);
  },
  glow(cx, e, f, s, h) {   // controlled ember light inside the bell; brighter when it is about to act
    if (f[5] === undefined) return;
    const st = e.st, k = st === "ring" ? 1 : st === "ringup" ? 0.45 + 0.55 * Math.min(1, e.t / 0.75) : st === "windup" ? 0.6 : st === "notice" ? 0.5 : st === "hurt" || st === "stagger" ? 0.7 : st === "dead" ? Math.max(0, 0.35 - e.t * 0.2) : 0.22 + 0.06 * Math.sin(e.t * 3);
    if (k <= 0.02) return; const x = -f[4] * s + f[5] * s, y = -h + 1 + f[6] * s, r = 5 + 11 * k, g = cx.createRadialGradient(x, y, 0.5, x, y, r);
    g.addColorStop(0, `rgba(255,150,90,${0.55 * k})`); g.addColorStop(0.35, `rgba(200,85,61,${0.35 * k})`); g.addColorStop(1, "rgba(200,85,61,0)");
    cx.save(); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2); cx.restore();
  },
  pulse(e, R) {   // nearby floating particles are pushed outward as the wave passes
    const cx0 = e.x + e.w / 2, gy = e.y + e.h;
    for (const q of Fx.parts) { const d = q.x - cx0; if (Math.abs(Math.abs(d) - R) < 12 && Math.abs(q.y - gy) < 50) { q.vx += Math.sign(d) * 14; q.vy -= 10; } }
    if (Math.random() < 0.6 && Fx.parts.length < 160) { const s = Math.random() < 0.5 ? -1 : 1; Fx.parts.push({ x: cx0 + s * R, y: gy - 1, vx: s * 24, vy: -18 - Math.random() * 12, g: 40, s: 2, life: 0.4, col: Math.random() < 0.3 ? "#c8553d" : "#5b5560" }); }
  },
  wave(cx, e, cm) {   // the resonance wave: a ground-hugging ring that expands and fades; a faint dashed edge shows its reach during the wind-up
    const x = Math.round(e.x + e.w / 2 - cm), y = Math.round(e.y + e.h - 2), M = CFG.enemies.husk.ring.radius;
    cx.save();
    if (e.st === "ringup") { const k = Math.min(1, e.t / CFG.enemies.husk.ring.windup); cx.globalAlpha = 0.25 + 0.35 * k * (0.6 + 0.4 * Math.sin(e.t * 22)); cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.setLineDash([3, 3]); cx.beginPath(); cx.ellipse(x, y, M, M * 0.17, 0, 0, 6.283); cx.stroke(); cx.setLineDash([]); }
    if (e.st === "ring" && e.rw) {
      const k = Math.min(1, e.rw.k), a = Math.pow(1 - k, 0.7);
      for (let i = 0; i < 3; i++) { const R = e.rw.r * (1 - i * 0.2); if (R < 2) continue; const al = a * (1 - i * 0.3);
        cx.globalAlpha = al * 0.9; cx.strokeStyle = "#0c0b11"; cx.lineWidth = 3.2 - i * 0.7; cx.beginPath(); cx.ellipse(x, y, R, R * 0.17, 0, 0, 6.283); cx.stroke();
        cx.globalAlpha = al; cx.strokeStyle = i ? "#c8553d" : "#d9cfbd"; cx.lineWidth = 1.8 - i * 0.5; cx.stroke(); }
      cx.globalCompositeOperation = "lighter"; cx.globalAlpha = a * 0.25; cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(x, y - 4, e.rw.r * 0.92, e.rw.r * 0.42, 0, Math.PI, 6.283); cx.stroke();   // thin dome above the ring: it can be jumped
    }
    cx.restore();
  }
};
