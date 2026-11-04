"use strict";
(window.HV_V = window.HV_V || {}).bishop = 10;
// The Corpse-Stitched Bishop (optional final boss in the Desecrated Chancel).
// Phase 1: Summon (grasping hands rise from marked floor spots) and a staff slam. Phase 2 (below 55 percent health): Corpse-Pulse, crimson crescents along the floor.
// Every attack has a wind-up pose and a ground telegraph. Damage is done here in code; the drawing below is only the look.
class Bishop extends Enemy {
  constructor(x, y) { super("husk", x, y); const d = CFG.bishop; Object.assign(this, { d, w: d.w, h: d.h, hp: d.hp, maxhp: d.hp, st: "sleep", face: -1, phase: 1, boss: true, bishop: true, pulses: [], hands: [], runes: [], atkType: "summon", cool: 1.2, age: 0 }); }
  wake() { this.go("idle"); Sfx.at("bossroar", this.x + this.w / 2); }
  damage(n, dir) {
    if (!this.alive() || this.st === "sleep" || this.st === "roar") return;
    this.hp -= n; this.flash = 0.1; Fx.shake = 0.12; Fx.hitstop = 0.06; Sfx.play("hit"); hitFx(this.x + this.w / 2, this.y + this.h * 0.4, dir);
    if (this.hp <= 0) { this.go("dead"); Sfx.play("edie"); ember(this.x + this.w / 2, this.y + 14, 36); Fx.shake = 0.5; this.pulses = []; this.hands = []; return; }
    if (this.phase === 1 && this.hp <= this.maxhp * 0.55) { this.phase = 2; this.go("roar"); Fx.shake = 0.4; Sfx.play("bell"); Fx.rings.push({ x: this.x + this.w / 2, y: this.y + 20, life: 0.9, d: 0.9, c: "#c8553d", r: 6, g: 100 }); }   // clear phase change, safe pause
  }
  update(dt, world, p) {
    const d = this.d, T = CFG.T, gy = CFG.level.ground * T; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt);
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dist = Math.abs(dx), sp = this.phase === 2 ? 1.3 : 1, lo = (CFG.level.gate3[0] + 1) * T, hi = (CFG.level.cols - 2) * T;
    for (const q of this.pulses) { q.x += q.vx * dt; q.life -= dt; if (!q.hit && !p.dead && ov({ x: q.x - 12, y: gy - d.pulseH, w: 24, h: d.pulseH }, p)) { q.hit = true; p.damage(1, Math.sign(q.vx), 190); } }   // the pulse is low: jump it or dash through it
    this.pulses = this.pulses.filter(q => q.life > 0 && q.x > T && q.x < world.w - T);
    for (const h of this.hands) { h.t += dt; if (!h.hit && h.t > 0.12 && h.t < 0.5 && !p.dead && ov({ x: h.x - 7, y: gy - 24, w: 14, h: 24 }, p)) { h.hit = true; p.damage(1, p.x > h.x ? 1 : -1, 150); } }
    this.hands = this.hands.filter(h => h.t < 0.9);
    switch (this.st) {
      case "sleep": return;
      case "idle": this.face = dx > 0 ? 1 : -1; this.vx = dist > d.keep ? this.face * d.speed * sp : dist < d.keep * 0.5 ? -this.face * d.speed * 0.7 : 0; this.cool -= dt;
        if (this.cool <= 0) { const r = Math.random(); this.atkType = dist < 52 && r < 0.5 ? "staff" : this.phase === 2 && r < 0.7 ? "pulse" : "summon";
          if (this.atkType === "summon") { const n = this.phase === 2 ? 5 : 3, mid = p.x + p.w / 2; this.runes = Array.from({ length: n }, (_, i) => Math.max(lo + 8, Math.min(hi - 8, mid + (i - (n - 1) / 2) * 28))); }
          this.go("windup"); } break;
      case "windup": { this.vx = 0; this.face = dx > 0 ? 1 : -1; const need = { summon: 0.95, pulse: 1.0, staff: 0.55 }[this.atkType] / sp;
        if (this.t >= need) { this.go("attack");
          if (this.atkType === "summon") { this.hands = this.runes.map(x => ({ x, t: 0, hit: false })); for (const x of this.runes) dust(x, gy, 6); Sfx.play("wave"); Fx.shake = 0.25; }
          else if (this.atkType === "pulse") { this.pulses.push({ x: this.x + this.w / 2 + this.face * 16, vx: this.face * d.pulseSpeed, life: 3, hit: false }); Sfx.play("wave"); Fx.shake = 0.2; } }
        break; }
      case "attack": this.vx = 0;
        if (this.atkType === "staff" && !this.fx && this.t >= 0.04) { this.fx = true; const tx = this.face > 0 ? this.x + this.w + d.atk.reach * 0.6 : this.x - d.atk.reach * 0.6; dust(tx, gy, 8); Fx.shake = Math.max(Fx.shake, 0.2); Sfx.play("chain"); Fx.rings.push({ x: tx, y: gy - 2, life: 0.3, d: 0.3, c: "#c8553d", r: 4, g: 26 });
          if (!this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(1, this.face, 180); } }
        if (this.atkType === "pulse" && this.phase === 2 && !this.fx && this.t >= 0.4) { this.fx = true; this.pulses.push({ x: this.x + this.w / 2 + this.face * 16, vx: this.face * d.pulseSpeed * 0.8, life: 3, hit: false }); Sfx.play("wave"); }
        if (this.t >= { summon: 0.7, pulse: 0.6, staff: 0.3 }[this.atkType]) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= 0.9 / sp) { this.go("idle"); this.cool = 0.8 / sp + Math.random() * 0.6; } break;
      case "roar": this.vx = 0; if (this.t >= 1.0) { this.go("idle"); this.cool = 0.8; } break;
      case "dead": this.vx = 0; if (this.t > 2.8) this.gone = true; break;
    }
    this.x = Math.max(lo, Math.min(hi - this.w, this.x));
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
  hitbox() { return { x: this.face > 0 ? this.x + this.w : this.x - this.d.atk.reach, y: this.y + this.h * 0.2, w: this.d.atk.reach, h: this.h * 0.8 }; }
  static arm(cx, sx, sy, a1, a2, l1, l2, col, w) {   // a thin grey arm with an elbow and a clutching hand
    const ex = sx + Math.cos(a1) * l1, ey = sy + Math.sin(a1) * l1, hx = ex + Math.cos(a1 + a2) * l2, hy = ey + Math.sin(a1 + a2) * l2;
    cx.strokeStyle = "#0c0b11"; cx.lineWidth = w + 1.2; cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.lineTo(hx, hy); cx.stroke();
    cx.strokeStyle = col; cx.lineWidth = w; cx.stroke(); cx.fillStyle = "#d9cfbd"; cx.fillRect(ex - 0.6, ey - 0.6, 1.2, 1.2);   // elbow stitch
    cx.strokeStyle = col; cx.lineWidth = 0.7; const fa = a1 + a2; for (let i = -1; i <= 1; i++) { cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(hx + Math.cos(fa + i * 0.6) * 3, hy + Math.sin(fa + i * 0.6) * 3); cx.stroke(); }
  }
  static draw(cx, e, cm) {
    const S = 1.25, ox = Math.round(e.x + e.w / 2 - cm), oy = Math.round(e.y + e.h), gy = CFG.level.ground * CFG.T, age = e.age, st = e.st, ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3), ph2 = e.phase === 2;
    if (ox < -80 || ox > CFG.W + 80) { Bishop.fx(cx, e, cm, gy); return; }
    const summon = e.atkType === "summon", pulse = e.atkType === "pulse", staff = e.atkType === "staff";
    let up = 0, fwd = 0, srot = 0;
    if (st === "windup") { const k = ease(e.t / 0.6); if (summon) up = k; else if (pulse) fwd = k; else srot = -0.9 * k; }
    else if (st === "attack") { if (summon) up = 1; else if (pulse) fwd = 1; else srot = -0.9 + 1.9 * ease(e.t / 0.12); }
    else if (st === "roar") up = 0.8 + 0.2 * Math.sin(e.t * 20);
    const dead = st === "dead", fade = dead ? Math.max(0, 1 - Math.max(0, e.t - 0.8) / 1.8) : 1, bob = Math.sin(age * 2) * 1.1;
    cx.save(); cx.globalAlpha = fade; cx.translate(ox, oy); cx.scale(e.face * S, S * (dead ? Math.max(0.35, 1 - e.t * 0.35) : 1));
    cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(0, 0, 17, 3, 0, 0, 6.283); cx.fill();
    cx.translate(0, bob * 0.5);
    if (ph2 || st === "windup") { const g = cx.createRadialGradient(0, -26, 4, 0, -26, 38); g.addColorStop(0, `rgba(200,85,61,${(ph2 ? 0.22 : 0.12) + 0.06 * Math.sin(age * 4)})`); g.addColorStop(1, "rgba(200,85,61,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(-42, -66, 84, 80); cx.globalCompositeOperation = "source-over"; }
    const arms = [[-6, -33, -2.6, 0.5], [-8, -30, -2.2, 0.8], [-7, -27, -1.9, 0.9], [6, -33, -0.5, 0.4], [8, -30, -0.9, 0.6]];   // shoulder x, y, resting angle, bend
    arms.forEach(([sx, sy, a, b], i) => { const rest = a + Math.sin(age * 1.6 + i * 1.7) * 0.12, tUp = -1.5 - i * 0.14 + (sx < 0 ? -0.2 : 0.2), tFw = -0.15 - i * 0.12, ang = rest * (1 - up - fwd) + tUp * up + tFw * fwd; if (sx < 0) Bishop.arm(cx, sx, sy, ang, b * (1 - up * 0.8), 9, 8, "#8d8374", 1.6); });
    cx.beginPath(); cx.moveTo(-8, -36); cx.lineTo(8, -36); cx.lineTo(12, -24); cx.lineTo(18, 0);   // robe with a ragged hem
    for (let i = 0; i <= 9; i++) cx.lineTo(18 - i * 4, -(i % 2 ? 3 : 0) - (i % 3 === 0 ? 1 : 0)); cx.lineTo(-12, -24); cx.closePath();
    const rg = cx.createLinearGradient(0, -36, 0, 0); rg.addColorStop(0, "#3a1018"); rg.addColorStop(0.5, "#6b1d24"); rg.addColorStop(1, "#2a0c12"); cx.fillStyle = rg; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke();
    cx.strokeStyle = "rgba(12,11,17,.5)"; cx.lineWidth = 1; for (const fx of [-9, -3, 5, 11]) { cx.beginPath(); cx.moveTo(fx * 0.5, -22); cx.lineTo(fx * 1.2, -3); cx.stroke(); }
    cx.fillStyle = "#d9cfbd"; for (let y = -34; y < -2; y += 4) cx.fillRect(-0.5 + Math.sin(y) * 0.6, y, 1, 1.6);   // stitched seam
    cx.fillStyle = "#8d8374"; cx.beginPath(); cx.ellipse(2, -17, 7.5, 8.5, 0, 0, 6.283); cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.8; cx.stroke();   // the stitched mass
    cx.fillStyle = "#6b5a50"; cx.fillRect(-2, -20, 5, 2); cx.fillRect(1, -14, 4, 2); cx.strokeStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(-3, -22); cx.lineTo(6, -12); cx.moveTo(6, -22); cx.lineTo(-2, -12); cx.stroke();
    cx.beginPath(); cx.moveTo(-10, -33); cx.quadraticCurveTo(-11, -46, 0, -51); cx.quadraticCurveTo(11, -46, 10, -33); cx.quadraticCurveTo(0, -30, -10, -33); cx.closePath(); cx.fillStyle = "#2a1016"; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.stroke();   // hood
    cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.ellipse(1.5, -41, 5, 6, 0, 0, 6.283); cx.fill(); cx.fillStyle = "#d9cfbd"; cx.fillRect(-1, -37, 5, 2.4); cx.fillStyle = "#0c0b11"; for (let i = 0; i < 4; i++) cx.fillRect(-0.5 + i * 1.3, -37, 0.4, 2.4);   // skull jaw
    cx.globalCompositeOperation = "lighter"; cx.fillStyle = ph2 ? "#ff9a6a" : "#c8553d"; cx.fillRect(-0.3, -43, 1.8, 1.4); cx.fillRect(3, -43, 1.8, 1.4); const eg = cx.createRadialGradient(2.3, -42, 0.5, 2.3, -42, ph2 ? 9 : 6); eg.addColorStop(0, "rgba(255,140,90,.5)"); eg.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = eg; cx.fillRect(-8, -52, 20, 20); cx.globalCompositeOperation = "source-over";
    arms.forEach(([sx, sy, a, b], i) => { if (sx < 0) return; const rest = a + Math.sin(age * 1.6 + i * 1.7) * 0.12, tUp = -1.3 - i * 0.2, tFw = -0.1 - i * 0.1, ang = rest * (1 - up - fwd) + tUp * up + tFw * fwd; if (i === 3) return; Bishop.arm(cx, sx, sy, ang, b * (1 - up * 0.7), 9, 8, "#a39a8c", 1.7); });
    cx.save(); cx.translate(10, -22); cx.rotate(srot + Math.sin(age * 1.3) * 0.03); cx.translate(-10, 22);   // staff in the front hand
    cx.strokeStyle = "#0c0b11"; cx.lineWidth = 2.6; cx.beginPath(); cx.moveTo(12, 2); cx.lineTo(12, -56); cx.stroke(); cx.strokeStyle = "#4a3a2c"; cx.lineWidth = 1.5; cx.stroke(); cx.fillStyle = "#d9cfbd"; for (const y of [-12, -30, -48]) cx.fillRect(10.8, y, 2.4, 1.2);
    for (const [kx, ky] of [[12, -62], [8, -58], [16, -58], [12, -55]]) { cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.arc(kx, ky, 2.7, 0, 6.283); cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.6; cx.stroke(); cx.fillStyle = "#0c0b11"; cx.fillRect(kx - 1.4, ky - 0.6, 1, 1.2); cx.fillRect(kx + 0.5, ky - 0.6, 1, 1.2); }
    cx.strokeStyle = "rgba(141,131,116,.8)"; cx.lineWidth = 0.5; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.moveTo(8 + i * 4, -56); cx.lineTo(8 + i * 4 + Math.sin(age * 2 + i) * 1.5, -46 + i); cx.stroke(); }
    cx.restore(); Bishop.arm(cx, 8, -30, -0.2 * (1 - up) - 1.3 * up, 0.5, 8, 7, "#a39a8c", 1.7);
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.4; cx.fillStyle = "#ff9a6a"; cx.beginPath(); cx.ellipse(0, -24, 16, 28, 0, 0, 6.283); cx.fill(); }
    cx.restore(); Bishop.fx(cx, e, cm, gy);
  }
  static fx(cx, e, cm, gy) {   // floor telegraphs, rising hands and the Corpse-Pulse crescents
    const age = e.age; cx.save();
    if (e.st === "windup" && e.atkType === "summon") for (const x of e.runes) { const k = Math.min(1, e.t / 0.95), rx = Math.round(x - cm); cx.globalAlpha = 0.35 + 0.5 * k; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.setLineDash([2, 2]); cx.beginPath(); cx.ellipse(rx, gy - 1, 9 + 3 * Math.sin(age * 14), 2.6, 0, 0, 6.283); cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.moveTo(rx - 3, gy - 1); cx.lineTo(rx + 3, gy - 1); cx.moveTo(rx, gy - 4); cx.lineTo(rx, gy + 2); cx.stroke(); }
    if (e.st === "windup" && e.atkType === "pulse") { const k = Math.min(1, e.t / 1.0), x0 = Math.round(e.x + e.w / 2 - cm); cx.globalAlpha = 0.2 + 0.5 * k; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.setLineDash([4, 4]); cx.beginPath(); cx.moveTo(x0, gy - 2); cx.lineTo(x0 + e.face * 140, gy - 2); cx.stroke(); cx.setLineDash([]); Slayer.chevron(cx, x0 + e.face * 22, gy - 16, e.face, 0.55, 0.3 + 0.5 * k * (0.6 + 0.4 * Math.sin(age * 20))); }
    for (const h of e.hands) { const x = Math.round(h.x - cm), k = Math.min(1, h.t / 0.18), a = h.t > 0.6 ? 1 - (h.t - 0.6) / 0.3 : 1, ht = 24 * k; cx.globalAlpha = a;
      cx.fillStyle = "#0c0b11"; cx.fillRect(x - 3, gy - ht, 6, ht); cx.fillStyle = "#8d8374"; cx.fillRect(x - 2, gy - ht, 4, ht); cx.fillStyle = "#6b5a50"; for (let y = gy - 3; y > gy - ht; y -= 5) cx.fillRect(x - 2, y, 4, 1);
      cx.fillStyle = "#a39a8c"; cx.fillRect(x - 3, gy - ht - 3, 6, 4); cx.strokeStyle = "#a39a8c"; cx.lineWidth = 1; for (let i = -2; i <= 2; i++) { cx.beginPath(); cx.moveTo(x + i * 1.4, gy - ht - 3); cx.lineTo(x + i * 2 + Math.sin(h.t * 12 + i) , gy - ht - 8 - (i === 0 ? 1 : 0)); cx.stroke(); }
      if (h.t < 0.3) { cx.fillStyle = "#c8553d"; cx.globalAlpha = (0.3 - h.t) * 2; cx.fillRect(x - 6, gy - 1, 12, 1); } }
    cx.globalAlpha = 1; for (const q of e.pulses) { const x = Math.round(q.x - cm), y = gy - e.d.pulseH / 2; Slayer.chevron(cx, x, y, Math.sign(q.vx), 1.0, Math.min(1, q.life * 3)); if (Math.random() < 0.6 && Fx.parts.length < 170) Fx.parts.push({ x: q.x - Math.sign(q.vx) * 10, y: y + (Math.random() - 0.5) * 24, vx: -Math.sign(q.vx) * 25, vy: -10, g: 0, s: 1.5, life: 0.3, col: Math.random() < 0.5 ? "#c8553d" : "#6b1d24" }); }
    cx.restore();
  }
}
