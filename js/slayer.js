"use strict";
(window.HV_V = window.HV_V || {}).slayer = 10;
// Eclipse Slayer (second weapon, key Q): a dark greatsword with crimson edge light.
//   Tap attack ..... Cleave, Cleave, Heavy Cleave (big crimson crescents)
//   Dash + attack .. Shadow-Step Thrust (dark afterimages, long lunge)
//   Hold after a slash .. Arcane Edge Charge, release to fire a piercing crimson blast
// This file only draws and feeds back. Damage, hitboxes and timing live in entities.js and config.js.
const Slayer = {
  trail: [], lastT: -1, blasts: [], streaks: [], smokeT: 0, chgT: 0,
  swing(p, m) {   // the moment a slash goes active
    const x = p.x + p.w / 2 + p.face * m.reach * 0.7;
    Sfx.play(p.combo === 2 && p.sp < 0 ? "bell" : "whoosh");
    if (p.sp === 4) { Fx.rings.push({ x: p.x + 6, y: p.y + 14, life: 0.3, d: 0.3, c: "#c8553d", r: 5, g: 24 }); Fx.shake = Math.max(Fx.shake, 0.1); }
    else if (p.sp === 3) { Fx.shake = Math.max(Fx.shake, 0.14); Slayer.fire(p); }
    else if (p.combo === 2) { Fx.shake = Math.max(Fx.shake, 0.24); Fx.rings.push({ x, y: p.y + 26, life: 0.4, d: 0.4, c: "#c8553d", r: 5, g: 40 }); dust(x, p.y + 26, 8); vfx("rune", x, p.y + 25, 0.4, 0.35); }
    else { Fx.shake = Math.max(Fx.shake, 0.06); dust(x, p.y + 26, 3); }
  },
  fire(p) {   // Arcane Edge: one piercing blast; its size grows with the charge. Damage is applied in update().
    const B = CFG.player.slayer.blast, pw = p.pw || 0, ps = this.pose(p), tip = ps.tip;
    this.blasts.push({ x: tip[0] + p.face * 6, y: p.y + 14, vx: p.face * B.speed * (0.9 + 0.2 * pw), dir: p.face, life: B.life, t: 0, hit: new Set(), s: 0.8 + 0.5 * pw, dmg: B.dmg * (0.8 + 0.5 * pw) });
    Sfx.play("wave"); Fx.shake = Math.max(Fx.shake, 0.2); Fx.rings.push({ x: tip[0], y: p.y + 14, life: 0.3, d: 0.3, c: "#d9cfbd", r: 4, g: 22 });
    for (let i = 0; i < 12; i++) if (Fx.parts.length < 170) Fx.parts.push({ x: tip[0], y: p.y + 14 + (Math.random() - 0.5) * 10, vx: p.face * (40 + Math.random() * 160), vy: (Math.random() - 0.5) * 90, g: 0, s: 2, life: 0.3 + Math.random() * 0.3, col: i % 3 ? "#c8553d" : "#d9cfbd" });
  },
  update(dt, enemies, world) {   // blasts fly and hurt each enemy once as they pass through
    for (const b of this.blasts) { b.t += dt; b.life -= dt; b.x += b.vx * dt; if (world.solid(Math.floor(b.x / CFG.T), Math.floor((b.y) / CFG.T))) b.life = 0;
      const box = { x: b.x - 22 * b.s, y: b.y - 13 * b.s, w: 44 * b.s, h: 26 * b.s };
      for (const e of enemies) if (e.alive() && !b.hit.has(e) && !(e.st === "sleep") && ov(box, e)) { b.hit.add(e); e.damage(b.dmg, b.dir, CFG.player.slayer.blast.knock); }
      if (Math.random() < 0.8 && Fx.parts.length < 170) Fx.parts.push({ x: b.x - b.dir * 14, y: b.y + (Math.random() - 0.5) * 18 * b.s, vx: -b.dir * 20, vy: (Math.random() - 0.5) * 30, g: 0, s: 1.5, life: 0.3, col: Math.random() < 0.4 ? "#c8553d" : "#6b1d24" }); }
    this.blasts = this.blasts.filter(b => b.life > 0);
  },
  pose(p) {   // sword hand position, angle and length (0 = straight ahead, positive = downward)
    const f = p.face, hx = p.x + p.w / 2 + f * 5, hy = p.y + 14; let ang = 2.25, len = 30;
    if (p.chg > 0) { ang = 2.95 + Math.sin(p.t * 40) * 0.03 * Math.min(1, p.chg); len = 34; }
    else if (p.atk >= 0) { const m = p.move(); ang = m.thrust ? 0 : Whip.angle(m, p.atk); len = m.thrust ? 40 : 34; }
    else if (p.dodge >= 0) { ang = 0.15; len = 34; }
    return { hx, hy, ang, len, tip: [hx + Math.cos(ang) * f * len, hy + Math.sin(ang) * len], mid: [hx + Math.cos(ang) * f * len * 0.45, hy + Math.sin(ang) * len * 0.45] };
  },
  tick(dt, p) {   // trail samples, charge sparks, run smoke and dash streaks
    for (const s of this.trail) s.a -= dt; this.trail = this.trail.filter(s => s.a > 0);
    for (const s of this.streaks) s.life -= dt; this.streaks = this.streaks.filter(s => s.life > 0);
    if (p.dead) return;
    const ps = this.pose(p);
    if (p.weapon === "slayer" && p.atk >= 0) { const m = p.move();
      if (p.atk >= m.from * 0.8 && p.atk <= m.to + 0.06) { const t0 = Math.max(m.from * 0.8, this.lastT >= 0 && this.lastT < p.atk ? this.lastT : p.atk - 0.016), L = m.thrust ? 40 : 34, f = p.face, hx = ps.hx, hy = ps.hy;
        for (let i = 1; i <= 5; i++) { const t = t0 + (p.atk - t0) * i / 5, a = m.thrust ? 0 : Whip.angle(m, t), c = Math.cos(a) * f, sn = Math.sin(a);   // sub-steps so fast swings stay a smooth curve
          this.trail.push({ tip: [hx + c * L, hy + sn * L], base: [hx + c * L * 0.5, hy + sn * L * 0.5], a: (m.thrust ? 0.16 : 0.28) * (0.8 + 0.04 * i), big: p.combo === 2 && p.sp < 0 ? 1.35 : 1 }); } }
      this.lastT = p.atk; } else this.lastT = -1;
    if (p.weapon === "slayer" && p.chg > 0.05) {   // dark crimson thorns drawn inward to the blade; they get denser and a ring pulses at full charge
      const k = Math.min(1, p.chg / CFG.player.slayer.chargeFull), n = 1 + Math.floor(k * 3);
      for (let i = 0; i < n; i++) if (Fx.parts.length < 170) { const a = Math.random() * 6.283, r = 16 + Math.random() * 14, x = ps.tip[0] + Math.cos(a) * r, y = ps.tip[1] + Math.sin(a) * r; Fx.parts.push({ x, y, vx: (ps.tip[0] - x) * 4, vy: (ps.tip[1] - y) * 4, g: 0, s: 1.5 + k, life: 0.25, col: i % 2 ? "#6b1d24" : "#c8553d" }); }
      this.chgT -= dt; if (k >= 1 && this.chgT <= 0) { this.chgT = 0.35; Fx.rings.push({ x: ps.tip[0], y: ps.tip[1], life: 0.3, d: 0.3, c: "#c8553d", r: 3, g: 14 }); } }
    if (p.dodge >= 0) for (let i = 0; i < 2; i++) this.streaks.push({ x: p.x + 6 - p.face * (4 + Math.random() * 10), y: p.y + 3 + Math.random() * 22, len: 14 + Math.random() * 22, life: 0.16, face: p.face, c: Math.random() < 0.35 ? "#c8553d" : "#d9cfbd" });
    if (p.sp === 4 && p.atk < 0.22) for (let i = 0; i < 2; i++) this.streaks.push({ x: p.x + 6 - p.face * (4 + Math.random() * 10), y: p.y + 6 + Math.random() * 16, len: 20 + Math.random() * 30, life: 0.2, face: p.face, c: Math.random() < 0.5 ? "#c8553d" : "#6b1d24" });
    this.smokeT -= dt; if (p.ground && Math.abs(p.vx) > 60 && p.dodge < 0 && this.smokeT <= 0 && Fx.parts.length < 170) { this.smokeT = 0.07; Fx.parts.push({ x: p.x + 6 - p.face * 6, y: p.y + 23, vx: -p.face * 14, vy: -10 - Math.random() * 8, g: -8, s: 2, life: 0.4, col: "#2a2630" }); if (Math.random() < 0.3) Fx.parts.push({ x: p.x + 6 - p.face * 8, y: p.y + 20, vx: -p.face * 20, vy: -14, g: -10, s: 1, life: 0.4, col: "#c8553d" }); }
  },
  hit(p, e, m) {
    const x = e.x + e.w / 2, y = e.y + e.h * 0.4, d = p.face, big = p.combo === 2 && p.sp < 0, n = big ? 16 : 8;
    for (let i = 0; i < n; i++) { if (Fx.parts.length > 170) break; const a = (Math.random() - 0.5) * 2.4; Fx.parts.push({ x, y, vx: Math.cos(a) * d * (60 + Math.random() * 150), vy: Math.sin(a) * 110 - 30, g: 280, s: 2, life: 0.25 + Math.random() * 0.3, col: i % 3 === 0 ? "#d9cfbd" : i % 3 === 1 ? "#c8553d" : "#6b1d24" }); }
    Fx.rings.push({ x, y, life: 0.25, d: 0.25, c: "#c8553d", r: 3, g: big ? 30 : 16 });
    if (big || p.sp === 3 || p.sp === 4) { Fx.hitstop = Math.max(Fx.hitstop, 0.09); Fx.shake = Math.max(Fx.shake, 0.22); vfx("slash", x, y, 0.3, 0.4, { face: d }); }
  },
  chevron(cx, x, y, dir, s, a) {   // crescent arrow used by the blast and the Bishop's Corpse-Pulse: dark core, crimson rim, bone edge
    cx.save(); cx.translate(x, y); cx.scale(dir * s, s);
    for (let i = 0; i < 3; i++) { const ox = -i * 15, k = 1 - i * 0.22; cx.globalAlpha = a * k;
      cx.beginPath(); cx.moveTo(ox + 14, 0); cx.quadraticCurveTo(ox + 4, -12, ox - 20, -15); cx.quadraticCurveTo(ox - 8, -6, ox - 6, 0); cx.quadraticCurveTo(ox - 8, 6, ox - 20, 15); cx.quadraticCurveTo(ox + 4, 12, ox + 14, 0); cx.closePath();
      const g = cx.createLinearGradient(ox - 20, 0, ox + 14, 0); g.addColorStop(0, "#0c0b11"); g.addColorStop(0.55, "#6b1d24"); g.addColorStop(1, "#c8553d"); cx.fillStyle = g; cx.fill();
      cx.strokeStyle = "#c8553d"; cx.lineWidth = 1.3; cx.stroke(); cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 0.6; cx.beginPath(); cx.moveTo(ox + 13, 0); cx.quadraticCurveTo(ox + 4, -11, ox - 12, -13); cx.stroke(); }
    cx.restore();
  },
  draw(cx, cm, p) {
    const X = q => Math.round(q[0] - cm), Y = q => Math.round(q[1]);
    cx.save(); cx.lineCap = "round";
    if (this.trail.length > 1) {   // crimson crescent: the area swept between the blade tip and the blade middle
      for (let i = 1; i < this.trail.length; i++) { const a = this.trail[i - 1], b = this.trail[i], k = Math.max(0, Math.min(1, b.a / 0.28)), wd = b.big || 1;
        cx.globalAlpha = k * 0.9; cx.beginPath(); cx.moveTo(X(a.tip), Y(a.tip)); cx.lineTo(X(b.tip), Y(b.tip)); cx.lineTo(X([b.tip[0] + (b.base[0] - b.tip[0]) * 0.75 * wd, 0]), Y([0, b.tip[1] + (b.base[1] - b.tip[1]) * 0.75 * wd])); cx.lineTo(X([a.tip[0] + (a.base[0] - a.tip[0]) * 0.75 * wd, 0]), Y([0, a.tip[1] + (a.base[1] - a.tip[1]) * 0.75 * wd])); cx.closePath();
        const gr = cx.createLinearGradient(X(b.tip), Y(b.tip), X(b.base), Y(b.base)); gr.addColorStop(0, "rgba(255,150,100,.9)"); gr.addColorStop(0.3, "rgba(200,85,61,.75)"); gr.addColorStop(0.7, "rgba(107,29,36,.5)"); gr.addColorStop(1, "rgba(12,11,17,0)"); cx.fillStyle = gr; cx.fill();
        cx.globalCompositeOperation = "lighter"; cx.globalAlpha = k * 0.8; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1 + 2.2 * k * wd; cx.beginPath(); cx.moveTo(X(a.tip), Y(a.tip)); cx.lineTo(X(b.tip), Y(b.tip)); cx.stroke();
        cx.globalAlpha = k; cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 0.6 + 0.9 * k; cx.stroke(); cx.globalCompositeOperation = "source-over"; } }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "lighter";
    for (const s of this.streaks) { const k = s.life / 0.2, x = s.x - cm; cx.globalAlpha = Math.min(1, k) * 0.7; cx.strokeStyle = s.c; cx.lineWidth = 0.8; cx.beginPath(); cx.moveTo(Math.round(x), Math.round(s.y)); cx.lineTo(Math.round(x - s.face * s.len * (1.2 - k * 0.4)), Math.round(s.y)); cx.stroke(); }
    cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
    for (const b of this.blasts) { const x = Math.round(b.x - cm), y = Math.round(b.y), g = cx.createRadialGradient(x - b.dir * 12, y, 2, x - b.dir * 12, y, 38 * b.s);
      g.addColorStop(0, "rgba(255,150,100,.5)"); g.addColorStop(0.5, "rgba(200,85,61,.22)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(x - 60, y - 40, 120, 80); cx.globalCompositeOperation = "source-over";
      this.chevron(cx, x, y, b.dir, b.s, Math.min(1, b.life * 4)); }
    if (p.weapon === "slayer" && !p.dead) {   // the greatsword itself
      const ps = this.pose(p), f = p.face, aa = Math.atan2(Math.sin(ps.ang), Math.cos(ps.ang) * f), k = p.chg > 0 ? Math.min(1, p.chg / CFG.player.slayer.chargeFull) : 0, L = ps.len;
      cx.save(); cx.translate(Math.round(ps.hx - cm), Math.round(ps.hy)); cx.rotate(aa);
      cx.fillStyle = "#0c0b11"; cx.fillRect(-7, -1.5, 8, 3); cx.fillStyle = "#8d8374"; for (let i = -6; i < 0; i += 2) cx.fillRect(i, -1, 1, 2);   // wrapped grip
      cx.fillStyle = "#0c0b11"; cx.fillRect(0.5, -4.6, 3, 9.2); cx.fillStyle = "#d9cfbd"; cx.fillRect(1, -4, 1.6, 8);   // cross-guard
      cx.beginPath(); cx.moveTo(3.5, -2.6); cx.lineTo(L - 6, -2.4); cx.lineTo(L, 0); cx.lineTo(L - 6, 2.4); cx.lineTo(3.5, 2.6); cx.closePath(); cx.fillStyle = "#0c0b11"; cx.fill();
      cx.beginPath(); cx.moveTo(4, -1.7); cx.lineTo(L - 6.5, -1.6); cx.lineTo(L - 1.5, 0); cx.lineTo(L - 6.5, 1.6); cx.lineTo(4, 1.7); cx.closePath(); cx.fillStyle = "#2a2630"; cx.fill();
      cx.fillStyle = "#5b5560"; cx.fillRect(5, -0.4, L - 12, 0.8); cx.fillStyle = "#d9cfbd"; cx.globalAlpha = 0.8; cx.fillRect(4.5, -2.2, L - 11, 0.5); cx.globalAlpha = 1;   // fuller and bright upper edge
      cx.globalCompositeOperation = "lighter"; cx.strokeStyle = "#c8553d"; cx.globalAlpha = 0.3 + 0.5 * k + (p.atk >= 0 ? 0.25 : 0); cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(4, 2.9); cx.lineTo(L - 2, 0.4); cx.stroke();   // crimson edge light
      if (k > 0) { const gg = cx.createRadialGradient(L, 0, 1, L, 0, 8 + 14 * k); gg.addColorStop(0, `rgba(255,150,100,${0.6 * k})`); gg.addColorStop(1, "rgba(200,85,61,0)"); cx.globalAlpha = 1; cx.fillStyle = gg; cx.fillRect(L - 24, -24, 48, 48); }
      cx.restore(); }
    cx.restore();
  },
  hud(cx, p) {   // charge gauge: hold the attack button after a slash; the notch marks the minimum charge
    const W = CFG.player.slayer, x = 6, y = 61, w = 52, h = 3, k = Math.min(1, p.chg / W.chargeFull);
    cx.fillStyle = "rgba(12,11,17,.85)"; cx.fillRect(x - 1, y - 1, w + 2, h + 2); cx.fillStyle = "#2a2630"; cx.fillRect(x, y, w, h);
    cx.fillStyle = k >= 1 ? "#d9cfbd" : p.chg >= W.chargeMin ? "#c8553d" : "#6b1d24"; cx.fillRect(x, y, w * k, h); cx.fillStyle = "#0c0b11"; cx.fillRect(x + w * W.chargeMin / W.chargeFull, y, 0.7, h);
    cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.5; cx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5);
    if (k >= 1 && Math.floor(p.t * 8) % 2) { cx.globalCompositeOperation = "lighter"; cx.fillStyle = "rgba(200,85,61,.4)"; cx.fillRect(x - 2, y - 2, w + 4, h + 4); cx.globalCompositeOperation = "source-over"; }
    cx.fillStyle = "#d9cfbd"; cx.font = "4px Georgia,serif"; cx.fillText("ECLIPSE", x + w + 3, y + 3);
  }
};
