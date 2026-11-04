"use strict";
(window.HV_V = window.HV_V || {}).whip = 10;
// Gilded Thorn (blade-tipped whip) and Bell-Ringer effects. Everything here is drawing and feedback only:
// damage, hitboxes and costs stay in entities.js and config.js, exactly as the design bibles require.
const Whip = {
  trail: [],
  tier(res) { const W = CFG.player.whip; return res >= W.tier2 ? 2 : res >= W.tier1 ? 1 : 0; },
  ease: { out: t => 1 - Math.pow(1 - t, 3), inn: t => t * t },
  // Angle (0 = straight ahead, positive = downward) and length of the whip at time t inside a move.
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
  tick(dt, p) {   // sample the tip while the lash is in its active window, and age old samples
    for (const s of this.trail) s.a -= dt; this.trail = this.trail.filter(s => s.a > 0);
    if (p.atk >= 0 && !p.dead) { const m = p.move(); if (p.atk >= m.from * 0.8 && p.atk <= m.to + 0.05) { const pts = this.pose(p), tip = pts[pts.length - 1]; this.trail.push({ x: tip[0], y: tip[1], a: 0.2, mid: pts[Math.floor(pts.length * 0.6)] }); } }
  },
  crack(p, m) {   // the moment the lash goes active
    const tier = this.tier(p.res), x = p.x + p.w / 2 + p.face * m.reach * 0.8, y = p.y + 22;
    Sfx.play(m.fin ? "bell" : "whoosh");
    if (m.fin) { Fx.shake = Math.max(Fx.shake, 0.22); Fx.rings.push({ x, y: p.y + 26, life: 0.5, d: 0.5, c: "#c8553d", r: 5, g: 46 }); Fx.rings.push({ x, y: p.y + 26, life: 0.32, d: 0.32, c: "#d9cfbd", r: 3, g: 30 }); vfx("rune", x, p.y + 25, 0.45, 0.4); dust(x, p.y + 26, 8); }
    else if (p.combo === 2) { Fx.shake = Math.max(Fx.shake, 0.08); dust(x, p.y + 26, 4); }
    if (tier > 0) for (let i = 0; i < 3 + tier * 2; i++) if (Fx.parts.length < 160) Fx.parts.push({ x: x + (Math.random() - 0.5) * 12, y: y - 6 + Math.random() * 12, vx: p.face * (20 + Math.random() * 40), vy: -10 - Math.random() * 20, g: -10, s: 1, life: 0.4 + Math.random() * 0.3, col: "#c8553d" });
  },
  gain(p) {   // landing a hit builds Resonance; crossing a tier gives a clear pulse
    const W = CFG.player.whip, before = this.tier(p.res); p.res = Math.min(100, p.res + W.gain); p.resT = 0;
    if (this.tier(p.res) > before) { Fx.rings.push({ x: p.x + 6, y: p.y + 14, life: 0.45, d: 0.45, c: "#c8553d", r: 4, g: 24 }); Sfx.play("chime"); p.resPulse = 0.5; }
  },
  hit(p, e, m) {   // whip-specific contact feedback on top of the shared hit flash: thorn shards and a gilt ring
    const x = e.x + e.w / 2, y = e.y + e.h * 0.4, d = p.face, tier = this.tier(p.res), n = m.fin ? 14 : 6 + tier * 2;
    for (let i = 0; i < n; i++) { if (Fx.parts.length > 160) break; const a = (Math.random() - 0.5) * 2.2;
      Fx.parts.push({ x, y, vx: Math.cos(a) * d * (50 + Math.random() * 120), vy: Math.sin(a) * 100 - 30, g: 260, s: 2, life: 0.25 + Math.random() * 0.25, col: i % 4 === 0 ? "#c8553d" : "#d9cfbd" }); }
    Fx.rings.push({ x, y, life: 0.22, d: 0.22, c: tier ? "#c8553d" : "#d9cfbd", r: 3, g: m.fin ? 26 : 14 });
    if (m.fin) { Fx.hitstop = Math.max(Fx.hitstop, 0.1); Fx.shake = Math.max(Fx.shake, 0.25); vfx("slash", x, y, 0.28, 0.4, { face: d }); }
  },
  draw(cx, cm, p) {   // the whip itself: dark iron links, bone studs, a blade-tipped thorn, tiered ember glow and a tapered trail
    if (p.dead) return;
    const Y = 0, tier = this.tier(p.res), pts = this.pose(p), f = p.face, X = q => Math.round(q[0] - cm), Yy = q => Math.round(q[1]);
    cx.save(); cx.lineCap = "round"; cx.lineJoin = "round";
    if (this.trail.length > 1) {   // crescent trail: additive bone with an ember core on higher tiers
      cx.globalCompositeOperation = "lighter";
      for (let i = 1; i < this.trail.length; i++) { const a = this.trail[i - 1], b = this.trail[i], k = Math.max(0, Math.min(1, b.a / 0.2));
        cx.globalAlpha = k * 0.75; cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 0.8 + 2.4 * k; cx.beginPath(); cx.moveTo(Math.round(a.x - cm), Math.round(a.y)); cx.lineTo(Math.round(b.x - cm), Math.round(b.y)); cx.stroke();
        if (tier) { cx.globalAlpha = k * (0.35 + 0.2 * tier); cx.strokeStyle = "#c8553d"; cx.lineWidth = 0.6 + 1.2 * k; cx.stroke(); } }
      cx.globalCompositeOperation = "source-over"; }
    cx.globalAlpha = 1;
    if (tier) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.12 + 0.1 * tier; cx.strokeStyle = "#c8553d"; cx.lineWidth = 4; cx.beginPath(); pts.forEach((q, i) => i ? cx.lineTo(X(q), Yy(q)) : cx.moveTo(X(q), Yy(q))); cx.stroke(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
    cx.strokeStyle = "#0c0b11"; cx.lineWidth = 2.6; cx.beginPath(); pts.forEach((q, i) => i ? cx.lineTo(X(q), Yy(q)) : cx.moveTo(X(q), Yy(q))); cx.stroke();   // dark outline for readability on any background
    cx.strokeStyle = "#5b5560"; cx.lineWidth = 1.5; cx.stroke();
    for (let i = 1; i < pts.length - 1; i += 2) { cx.fillStyle = i % 4 === 1 ? "#d9cfbd" : "#8d8374"; cx.fillRect(X(pts[i]) - 0.5, Yy(pts[i]) - 0.5, 1.2, 1.2); }   // gilt links
    const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);   // blade tip: a small bone thorn
    cx.save(); cx.translate(X(b), Yy(b)); cx.rotate(ang); cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(-1.5, -2); cx.lineTo(6.5, 0); cx.lineTo(-1.5, 2); cx.closePath(); cx.fill();
    cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.moveTo(-0.5, -1.2); cx.lineTo(5.2, 0); cx.lineTo(-0.5, 1.2); cx.closePath(); cx.fill();
    if (tier) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#c8553d"; cx.globalAlpha = 0.6 + 0.3 * Math.sin(p.t * 20); cx.fillRect(-1.5, -0.7, 1.6, 1.4); }
    cx.restore();
    const h = pts[0]; cx.fillStyle = "#0c0b11"; cx.fillRect(X(h) - 1.5, Yy(h) - 1, 3, 2); cx.fillStyle = "#8d8374"; cx.fillRect(X(h) - 1, Yy(h) - 0.5, 2, 1);   // grip
    if (tier === 2 && p.atk < 0 && Math.random() < 0.25 && Fx.parts.length < 160) Fx.parts.push({ x: b[0], y: b[1], vx: (Math.random() - 0.5) * 8, vy: -8, g: -8, s: 1, life: 0.5, col: "#c8553d" });
    cx.restore();
  },
  hud(cx, p) {   // Resonance gauge under the portrait: 0-30 faint glow, 30-60 stronger, 60-100 full (Rupture Lash ready)
    const W = CFG.player.whip, x = 6, y = 61, w = 52, h = 3, k = Math.min(1, p.res / 100), t = this.tier(p.res);
    cx.fillStyle = "rgba(12,11,17,.85)"; cx.fillRect(x - 1, y - 1, w + 2, h + 2); cx.fillStyle = "#2a2630"; cx.fillRect(x, y, w, h);
    cx.fillStyle = t === 2 ? "#c8553d" : t === 1 ? "#d9cfbd" : "#8d8374"; cx.fillRect(x, y, w * k, h);
    cx.fillStyle = "#0c0b11"; cx.fillRect(x + w * W.tier1 / 100, y, 0.7, h); cx.fillRect(x + w * W.tier2 / 100, y, 0.7, h);
    cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.5; cx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5);
    if (t === 2 && Math.floor(p.t * 6) % 2) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = "rgba(200,85,61,.35)"; cx.fillRect(x - 2, y - 2, w + 4, h + 4); cx.globalCompositeOperation = "source-over"; }
    cx.fillStyle = "#d9cfbd"; cx.font = "4px Georgia,serif"; cx.fillText("THORN", x + w + 3, y + 3);
  }
};

// Bell-Ringer effects: chain impact, bell glow, body motion layer and the resonance wave.
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
