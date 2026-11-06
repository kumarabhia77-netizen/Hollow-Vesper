"use strict";
(window.HV_V = window.HV_V || {}).monsters = 10;
// Four new monsters, drawn in code in the Hollow Vesper palette. They are original designs inspired by the mood of the reference art you sent
// (a stone colossus, a hooded skull, a paper-strip scholar, a lantern porter); they are not copies of any artwork.
//   Hollow Colossus : slow, armoured. Light hits do half damage; heavy hits (Heavy Cleave, Rupture Lash, blasts) stagger it and expose the ember core.
//   Veil Reaper     : fades out and reappears behind you after a visible rune telegraph, then slashes.
//   Page-Wraith     : keeps its distance and reads; throws a fan of three paper blades.
//   Cinder Porter   : lobs its lantern; the landing spot smoulders, then burns for a few seconds.
// All damage is done by the code below (hitboxes, projectiles, fire patches), never by the drawing.
const Monsters = {
  fires: [], shards: [], lanterns: [],
  clear() { this.fires = []; this.shards = []; this.lanterns = []; },
  make(type, x, y) { return type === "colossus" ? new Colossus(x, y) : type === "reaper" ? new Reaper(x, y) : type === "archivist" ? new Archivist(x, y) : new Porter(x, y); },
  update(dt, p, world) {   // projectiles and fire patches live here so they keep working after their owner dies
    const T = CFG.T, gy = CFG.level.ground * T;
    for (const s of this.shards) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 30 * dt; if (!s.hit && !p.dead && ov({ x: s.x - 4, y: s.y - 2, w: 8, h: 4 }, p)) { s.hit = true; s.t = 9; p.damage(1, Math.sign(s.vx), 120); }
      if (world.solid(Math.floor(s.x / T), Math.floor(s.y / T))) s.t = 9; if (Math.random() < 0.5 && Fx.parts.length < 170) Fx.parts.push({ x: s.x, y: s.y, vx: -s.vx * 0.1, vy: 0, g: 20, s: 1, life: 0.25, col: "#d9cfbd" }); }
    this.shards = this.shards.filter(s => s.t < 2.2);
    for (const l of this.lanterns) { l.t += dt; l.x += l.vx * dt; l.vy += 420 * dt; l.y += l.vy * dt; if (l.y >= gy - 2) { l.done = true; this.fires.push({ x: l.x, t: 0, hit: 0, life: 3.4 }); dust(l.x, gy, 8); Fx.shake = Math.max(Fx.shake, 0.1); Sfx.at("hit", l.x); } }
    this.lanterns = this.lanterns.filter(l => !l.done && l.t < 3);
    for (const f of this.fires) { f.t += dt; f.hit -= dt;
      if (f.t > 0.4 && f.hit <= 0 && !p.dead && ov({ x: f.x - 11, y: gy - 10, w: 22, h: 10 }, p)) { f.hit = 0.9; p.damage(1, p.x > f.x ? 1 : -1, 90); }   // smoulders for 0.4 s first, then burns
      if (f.t > 0.4 && Math.random() < 0.5 && Fx.parts.length < 170) Fx.parts.push({ x: f.x + (Math.random() - 0.5) * 18, y: gy - 3, vx: (Math.random() - 0.5) * 8, vy: -25 - Math.random() * 20, g: -10, s: 1.5, life: 0.5, col: Math.random() < 0.5 ? "#c8553d" : "#6b1d24" }); }
    this.fires = this.fires.filter(f => f.t < f.life);
  },
  draw(cx, cm) {
    const gy = CFG.level.ground * CFG.T, t = performance.now() / 1000;
    for (const f of this.fires) { const x = Math.round(f.x - cm), k = f.t < 0.4 ? f.t / 0.4 * 0.3 : Math.min(1, (f.life - f.t) / 0.5), burn = f.t >= 0.4; cx.save(); cx.globalAlpha = 0.9 * k;
      if (!burn) { cx.fillStyle = "#6b1d24"; cx.fillRect(x - 9, gy - 1.5, 18, 1.5); cx.strokeStyle = "#c8553d"; cx.lineWidth = 0.6; cx.setLineDash([2, 2]); cx.strokeRect(x - 11, gy - 3, 22, 3); cx.setLineDash([]); }
      else { const g = cx.createRadialGradient(x, gy - 4, 1, x, gy - 4, 20); g.addColorStop(0, "rgba(255,150,100,.35)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(x - 22, gy - 26, 44, 30); cx.globalCompositeOperation = "source-over";
        for (let i = -4; i <= 4; i++) { const h = 6 + 5 * Math.abs(Math.sin(t * 9 + i * 1.7)) + (4 - Math.abs(i)) * 0.8, fx = x + i * 2.5; cx.fillStyle = "#6b1d24"; cx.fillRect(fx - 1.4, gy - h, 2.8, h); cx.fillStyle = "#c8553d"; cx.fillRect(fx - 0.9, gy - h * 0.8, 1.8, h * 0.8); cx.fillStyle = "#ff9a6a"; cx.fillRect(fx - 0.4, gy - h * 0.45, 0.8, h * 0.4); } }
      cx.restore(); }
    for (const l of this.lanterns) { const x = Math.round(l.x - cm), y = Math.round(l.y); cx.save(); cx.translate(x, y); cx.rotate(l.t * 9); cx.fillStyle = "#0c0b11"; cx.fillRect(-2.5, -3, 5, 6); cx.fillStyle = "#c8553d"; cx.fillRect(-1.5, -2, 3, 4); cx.globalCompositeOperation = "lighter"; const g = cx.createRadialGradient(0, 0, 0.5, 0, 0, 9); g.addColorStop(0, "rgba(255,150,100,.7)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(-10, -10, 20, 20); cx.restore(); }
    for (const s of this.shards) { const x = Math.round(s.x - cm), y = Math.round(s.y), a = Math.atan2(s.vy, s.vx); cx.save(); cx.translate(x, y); cx.rotate(a); cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(-5, -2); cx.lineTo(6, 0); cx.lineTo(-5, 2); cx.closePath(); cx.fill(); cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.moveTo(-4, -1.2); cx.lineTo(5, 0); cx.lineTo(-4, 1.2); cx.closePath(); cx.fill(); cx.fillStyle = "#5b5560"; cx.fillRect(-2, -0.3, 3, 0.6); cx.restore(); }
  },
  drawEnemy(cx, e, cm) {
    const ox = Math.round(e.x + e.w / 2 - cm); if (ox < -90 || ox > CFG.W + 90) return;
    const fn = { colossus: Colossus.draw, reaper: Reaper.draw, archivist: Archivist.draw, porter: Porter.draw }[e.mon]; fn(cx, e, ox, Math.round(e.y + e.h));
  }
};

class Mon extends Enemy {
  constructor(type, x, y) { super("husk", x, y); const d = CFG.mon[type]; Object.assign(this, { d, mon: type, w: d.w, h: d.h, hp: d.hp, maxhp: d.hp, st: "idle", face: -1, age: Math.random() * 6, cool: 1 + Math.random(), mon2: true }); }
  mitigate(n) { return n; }
  react(dir, knock) { this.go("hurt"); this.vx = dir * knock * 0.6; this.vy = -60; }
  die() { this.go("dead"); this.vx = 0; Sfx.play("edie"); ember(this.x + this.w / 2, this.y + this.h * 0.4, 22); }
  damage(n, dir, knock) {
    if (!this.alive() || this.ghost) return; n = this.mitigate(n); this.hp -= n; this.flash = 0.12; Fx.shake = Math.max(Fx.shake, 0.1); Fx.hitstop = Math.max(Fx.hitstop, 0.06); Sfx.play("hit"); hitFx(this.x + this.w / 2, this.y + this.h * 0.4, dir);
    if (this.hp <= 0) { this.die(); return; } this.react(dir, knock || 120);
  }
  view(p) { const dx = (p.x + p.w / 2) - (this.x + this.w / 2); return { dx, dist: Math.abs(dx), see: Math.abs(dx) < this.d.sight && Math.abs(p.y - this.y) < 70 && !p.dead }; }
  hitbox() { const r = this.d.reach || 34; return { x: this.face > 0 ? this.x + this.w : this.x - r, y: this.y + this.h * 0.25, w: r, h: this.h * 0.75 }; }
  step(world, dt) { this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt); }
  static base(cx, e, ox, oy, S, fade) { cx.save(); cx.globalAlpha = fade; cx.translate(ox, oy); cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(0, 0, e.w * 0.62 * S, 3, 0, 0, 6.283); cx.fill(); cx.scale(e.face * S, S); }
  static flashOver(cx, e, rx, ry, cy) { if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.4; cx.fillStyle = "#ff9a6a"; cx.beginPath(); cx.ellipse(0, cy, rx, ry, 0, 0, 6.283); cx.fill(); } }
}

class Colossus extends Mon {
  constructor(x, y) { super("colossus", x, y); this.shocks = []; }
  mitigate(n) { return this.st === "stagger" ? n * 1.6 : n >= 2 ? n : n * 0.6; }   // armour: light hits do 60 percent; the exposed core takes more
  react(dir, knock) { if (knock >= 190) { this.go("stagger"); this.vx = dir * 30; Fx.shake = Math.max(Fx.shake, 0.25); Sfx.play("chime"); Fx.rings.push({ x: this.x + this.w / 2, y: this.y + 20, life: 0.4, d: 0.4, c: "#c8553d", r: 5, g: 30 }); } else if (this.st !== "windup" && this.st !== "attack") { this.go("hurt"); this.vx = dir * 25; } }
  update(dt, world, p) {
    const d = this.d, T = CFG.T, gy = CFG.level.ground * T; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt);
    const { dx, dist, see } = this.view(p);
    for (const s of this.shocks) { s.x += s.vx * dt; s.life -= dt; if (!s.hit && !p.dead && p.ground && ov({ x: s.x - 6, y: gy - 9, w: 12, h: 9 }, p)) { s.hit = true; p.damage(1, Math.sign(s.vx), 130); } if (Math.random() < 0.7 && Fx.parts.length < 170) Fx.parts.push({ x: s.x, y: gy - 2, vx: 0, vy: -30 - Math.random() * 30, g: 160, s: 2, life: 0.35, col: "#5b5560" }); }
    this.shocks = this.shocks.filter(s => s.life > 0);
    switch (this.st) {
      case "idle": this.vx = 0; if (see) this.go("notice"); break;
      case "notice": this.face = dx > 0 ? 1 : -1; this.vx = 0; if (this.t >= 0.6) this.go("chase"); break;
      case "chase": this.face = dx > 0 ? 1 : -1; if (!see && dist > d.sight * 1.6) { this.go("idle"); break; } this.vx = dist > 26 ? this.face * d.speed : 0; this.cool -= dt; if (dist < 46 && this.cool <= 0 && !p.dead) this.go("windup"); break;
      case "windup": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= 0.9) { this.go("attack"); const fx = this.x + this.w / 2 + this.face * 26; Fx.shake = Math.max(Fx.shake, 0.35); Sfx.play("chain"); Sfx.play("hit"); dust(fx, gy, 12); Fx.rings.push({ x: fx, y: gy - 2, life: 0.4, d: 0.4, c: "#d9cfbd", r: 5, g: 36 });
          for (const s of [-1, 1]) this.shocks.push({ x: fx, vx: s * 120, life: 0.6, hit: false }); if (ov(this.hitbox(), p)) p.damage(1, this.face, 200); } break;   // the slam hits in front, and two low shock waves run along the floor (jump them)
      case "attack": this.vx = 0; if (this.t >= 0.35) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= 0.9) { this.go("chase"); this.cool = 1.2 + Math.random() * 0.8; } break;
      case "hurt": this.vx *= 0.85; if (this.t >= 0.25) this.go("chase"); break;
      case "stagger": this.vx *= 0.9; if (this.t >= 1.6) { this.go("chase"); this.cool = 0.6; } break;
      case "dead": this.vx = 0; if (this.t > 2.2) this.gone = true; break;
    }
    this.step(world, dt);
  }
  static draw(cx, e, ox, oy) {
    const S = 1.1, st = e.st, age = e.age, dead = st === "dead", fade = dead ? Math.max(0, 1 - Math.max(0, e.t - 0.7) / 1.5) : 1, ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3), bob = Math.sin(age * 1.6) * 0.5;
    let aF = 0.12 + Math.sin(age * 1.6) * 0.03, aB = aF, tilt = 0;
    if (st === "windup") { aF = aB = 0.12 + (-2.9 - 0.12) * ease(e.t / 0.9); } else if (st === "attack") { aF = aB = -2.9 + 2.7 * ease(e.t / 0.12); } else if (st === "recover") { aF = aB = -0.2 + 0.32 * ease(e.t / 0.9); } else if (st === "stagger") { aF = aB = 0.35; tilt = 0.06; } else if (st === "notice") { aF = aB = 0.12 - 0.5 * Math.sin(Math.min(1, e.t / 0.6) * Math.PI); }
    Mon.base(cx, e, ox, oy, S, fade); cx.translate(0, dead ? Math.min(10, e.t * 6) : 0); if (dead) cx.scale(1, Math.max(0.5, 1 - e.t * 0.3)); cx.rotate(tilt);
    const stone = (x, y, w, h, c1) => { cx.fillStyle = "#0c0b11"; cx.fillRect(x - 0.8, y - 0.8, w + 1.6, h + 1.6); cx.fillStyle = c1; cx.fillRect(x, y, w, h); cx.fillStyle = "rgba(217,207,189,.22)"; cx.fillRect(x, y, w, 1); cx.fillRect(x, y, 1, h); cx.fillStyle = "rgba(12,11,17,.35)"; cx.fillRect(x, y + h - 1.4, w, 1.4); };
    const arm = (px, py, ang, dark) => { cx.save(); cx.translate(px, py); cx.rotate(ang); stone(-5, 0, 10, 13, dark ? "#2a2630" : "#3a3540"); stone(-6.5, 12, 13, 13, dark ? "#4a4650" : "#5b5560"); cx.fillStyle = "#0c0b11"; for (let i = -1; i <= 1; i++) { cx.beginPath(); cx.moveTo(i * 4 - 2, 25); cx.lineTo(i * 4 + 2, 25); cx.lineTo(i * 4 + (i ? i * 1.5 : 0), 33); cx.closePath(); cx.fill(); } cx.restore(); };
    arm(-14, -33 + bob, aB, true);
    stone(-11, -17, 9, 17, "#2a2630"); stone(2, -17, 9, 17, "#3a3540"); cx.fillStyle = "#0c0b11"; cx.fillRect(-12, -2, 11, 2); cx.fillRect(1, -2, 11, 2);   // legs and feet
    cx.fillStyle = "#6b1d24"; cx.beginPath(); cx.moveTo(-4, -20); cx.lineTo(4, -20); for (let i = 0; i < 5; i++) cx.lineTo(4 - i * 2, -8 - (i % 2) * 3); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(-13, -36 + bob); cx.lineTo(13, -36 + bob); cx.lineTo(10, -18); cx.lineTo(-10, -18); cx.closePath(); cx.fillStyle = "#3a3540"; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = "#4a3a2c"; cx.beginPath(); cx.moveTo(-9, -33 + bob); cx.lineTo(-1, -31 + bob); cx.lineTo(-2, -22); cx.lineTo(-8, -22); cx.closePath(); cx.fill(); cx.beginPath(); cx.moveTo(9, -33 + bob); cx.lineTo(1, -31 + bob); cx.lineTo(2, -22); cx.lineTo(8, -22); cx.closePath(); cx.fill();
    cx.strokeStyle = "#8d8374"; cx.lineWidth = 0.7; cx.beginPath(); cx.moveTo(-10, -30); cx.lineTo(-3, -24); cx.moveTo(10, -30); cx.lineTo(3, -24); cx.stroke();
    const core = st === "stagger" ? 1 : 0.55 + 0.2 * Math.sin(age * 3); cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(0, -31); cx.lineTo(5, -26); cx.lineTo(0, -20); cx.lineTo(-5, -26); cx.closePath(); cx.fill();   // ember core
    cx.fillStyle = core > 0.9 ? "#ff9a6a" : "#c8553d"; cx.beginPath(); cx.moveTo(0, -29.5); cx.lineTo(3.6, -26); cx.lineTo(0, -21.6); cx.lineTo(-3.6, -26); cx.closePath(); cx.fill();
    const cg = cx.createRadialGradient(0, -26, 1, 0, -26, 8 + 12 * core); cg.addColorStop(0, `rgba(255,150,100,${0.5 * core})`); cg.addColorStop(1, "rgba(200,85,61,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = cg; cx.fillRect(-22, -48, 44, 44); cx.globalCompositeOperation = "source-over";
    cx.fillStyle = "#4a4650"; cx.fillRect(-7, -39 + bob, 14, 5);   // neck
    stone(-6, -47 + bob, 12, 11, "#5b5560"); cx.fillStyle = "#0c0b11"; cx.fillRect(-1.5, -45 + bob, 3, 9); cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#c8553d"; cx.fillRect(-4, -44 + bob, 1.4, 1.4); cx.fillRect(2.6, -44 + bob, 1.4, 1.4); cx.globalCompositeOperation = "source-over";   // helm, slit and eyes
    cx.strokeStyle = "#6b5a50"; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(-4, -47 + bob); cx.quadraticCurveTo(-9, -52, -6, -58); cx.moveTo(4, -47 + bob); cx.quadraticCurveTo(9, -52, 6, -58); cx.stroke();   // horns
    for (const s of [-1, 1]) { cx.save(); cx.scale(s, 1); cx.beginPath(); cx.moveTo(10, -38 + bob); cx.lineTo(23, -35 + bob); cx.lineTo(25, -26); cx.lineTo(11, -27); cx.closePath(); cx.fillStyle = "#5b5560"; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke(); cx.fillStyle = "rgba(217,207,189,.25)"; cx.fillRect(11, -37 + bob, 11, 1.2); cx.fillStyle = "#2f3a2c"; cx.beginPath(); cx.ellipse(16, -36 + bob, 5, 2, 0, 0, 6.283); cx.fill(); cx.restore(); }   // pauldrons with moss
    arm(14, -33 + bob, aF, false); Mon.flashOver(cx, e, 18, 28, -24); cx.restore();
    for (const s of e.shocks) { const x = Math.round(s.x - (ox - (e.x + e.w / 2))), g = oy; cx.save(); cx.strokeStyle = "#d9cfbd"; cx.globalAlpha = Math.min(1, s.life * 3); cx.lineWidth = 1; cx.beginPath(); cx.ellipse(x, g - 3, 4, 6, 0, 0, 6.283); cx.stroke(); cx.restore(); }
  }
}

class Reaper extends Mon {
  constructor(x, y) { super("reaper", x, y); this.alpha = 1; this.tx = x; this.ghost = false; }
  update(dt, world, p) {
    const d = this.d, T = CFG.T; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt); const { dx, dist, see } = this.view(p);
    switch (this.st) {
      case "idle": this.vx = 0; this.alpha = 1; if (see) this.go("chase"); break;
      case "chase": this.face = dx > 0 ? 1 : -1; this.vx = dist > 34 ? this.face * d.speed : 0; this.cool -= dt;
        if (!see && dist > d.sight * 1.7) { this.go("idle"); break; }
        if (see && this.cool <= 0 && dist < 130 && !p.dead) { const tx = p.x + p.w / 2 - p.face * 36, tc = Math.floor(tx / T), ok = tc > 1 && tc < CFG.level.cols - 2 && world.solid(tc, CFG.level.ground);
          if (ok) { this.tx = tx; this.go("vanish"); Sfx.play("warn"); } else this.cool = 0.8; } break;
      case "vanish": this.vx = 0; this.ghost = this.t > 0.15; this.alpha = Math.max(0, 1 - this.t / 0.35);
        if (Math.random() < 0.6 && Fx.parts.length < 170) Fx.parts.push({ x: this.x + 7 + (Math.random() - 0.5) * 12, y: this.y + 8 + Math.random() * 18, vx: (Math.random() - 0.5) * 20, vy: -10, g: -6, s: 2, life: 0.5, col: Math.random() < 0.3 ? "#6b1d24" : "#2a2630" });
        if (this.t >= 0.9) { this.x = this.tx - this.w / 2; this.vy = 0; this.face = (p.x + p.w / 2) > this.tx ? 1 : -1; this.go("windup"); Sfx.at("wave", this.x); Fx.rings.push({ x: this.tx, y: this.y + 20, life: 0.3, d: 0.3, c: "#d9cfbd", r: 4, g: 20 }); } break;   // the rune on the floor shows where it will appear
      case "windup": this.vx = 0; this.ghost = false; this.alpha = Math.min(1, this.t / 0.2); this.face = dx > 0 ? 1 : -1; if (this.t >= 0.5) { this.go("attack"); Sfx.play("whoosh"); if (ov(this.hitbox(), p)) p.damage(1, this.face, 170); } break;
      case "attack": this.vx = 0; this.alpha = 1; if (this.t >= 0.18) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= 0.8) { this.go("chase"); this.cool = 3 + Math.random() * 1.5; } break;
      case "hurt": this.vx *= 0.85; this.alpha = 1; if (this.t >= 0.28) { this.go("chase"); this.cool = Math.min(this.cool, 1); } break;
      case "dead": this.vx = 0; this.ghost = false; if (this.t > 1.6) this.gone = true; break;
    }
    this.step(world, dt);
  }
  static draw(cx, e, ox, oy) {
    const S = 1.2, st = e.st, age = e.age, dead = st === "dead", fade = dead ? Math.max(0, 1 - e.t / 1.5) : e.alpha;
    if (st === "vanish" || (st === "windup" && e.t < 0.3)) { const rx = Math.round(e.tx - (e.x + e.w / 2) + ox), k = st === "vanish" ? Math.min(1, e.t / 0.9) : 1; cx.save(); cx.globalAlpha = 0.3 + 0.5 * k; cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.setLineDash([2, 2]); cx.beginPath(); cx.ellipse(rx, oy - 1, 9, 2.6, 0, 0, 6.283); cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.moveTo(rx - 3, oy - 1); cx.lineTo(rx + 3, oy - 1); cx.moveTo(rx, oy - 4); cx.lineTo(rx, oy + 2); cx.stroke(); cx.restore(); }
    if (fade <= 0.02) return; Mon.base(cx, e, ox, oy, S, fade); const fl = Math.sin(age * 2.2) * 1.4 - 3; cx.translate(0, fl); if (dead) cx.scale(1, Math.max(0.2, 1 - e.t * 0.5));
    const sw = Math.sin(age * 2) * 1.2;
    cx.beginPath(); cx.moveTo(6, -30); cx.quadraticCurveTo(-4, -32, -8 + sw, -12); cx.lineTo(-12 + sw, 0);   // long hooded cloak, ragged and drifting
    for (let i = 0; i < 7; i++) cx.lineTo(-12 + sw + i * 3.6, -(i % 2 ? 4 : 0) - Math.sin(age * 3 + i) * 1.2); cx.lineTo(10, -12); cx.quadraticCurveTo(10, -26, 6, -30); cx.closePath();
    const g = cx.createLinearGradient(-10, -30, 10, 0); g.addColorStop(0, "#5b5560"); g.addColorStop(0.6, "#3a353d"); g.addColorStop(1, "#1a171d"); cx.fillStyle = g; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke();
    cx.strokeStyle = "rgba(217,207,189,.7)"; cx.lineWidth = 0.7; for (const [sx, sy, r] of [[-3, -20, 3.5], [-6, -9, 3], [2, -9, 2.5], [-1, -27, 2]]) { cx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const rr = r * (1 - a / 11); cx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } cx.stroke(); }   // swirling embroidery
    cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.moveTo(10, -26); cx.quadraticCurveTo(4, -32, 5, -22); cx.quadraticCurveTo(7, -17, 12, -20); cx.closePath(); cx.fill();   // hood opening
    cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.moveTo(8, -26); cx.lineTo(13, -23); cx.lineTo(12, -19); cx.lineTo(9, -19); cx.lineTo(7, -22); cx.closePath(); cx.fill(); cx.fillStyle = "#0c0b11"; cx.fillRect(9, -24, 2.4, 2.2); cx.fillRect(10, -20, 2, 0.8);
    cx.globalCompositeOperation = "lighter"; cx.fillStyle = "#c8553d"; cx.fillRect(10, -23.4, 0.9, 0.9); cx.globalCompositeOperation = "source-over";   // a single ember in the socket
    let a = 0.5; if (st === "windup") a = -1.2 - 0.9 * Math.min(1, e.t / 0.5); else if (st === "attack") a = -2.1 + 3.2 * Math.min(1, e.t / 0.14); else if (st === "recover") a = 1.1 - 0.6 * Math.min(1, e.t / 0.8);
    cx.save(); cx.translate(4, -17); cx.rotate(a); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 2.4; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(9, 0); cx.stroke(); cx.strokeStyle = "#a39a8c"; cx.lineWidth = 1.4; cx.stroke();
    cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(9, 0); cx.quadraticCurveTo(19, -3, 18, 8); cx.stroke(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.5; cx.stroke(); cx.restore();   // bony hand and sickle
    if (st === "attack") { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.8 * (1 - e.t / 0.18); cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 2; cx.beginPath(); cx.arc(6, -14, 22, -1.2, 1.1); cx.stroke(); cx.strokeStyle = "#c8553d"; cx.lineWidth = 1; cx.stroke(); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
    Mon.flashOver(cx, e, 10, 16, -16); cx.restore();
  }
}

class Archivist extends Mon {
  constructor(x, y) { super("archivist", x, y); }
  update(dt, world, p) {
    const d = this.d; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt); const { dx, dist, see } = this.view(p);
    switch (this.st) {
      case "idle": this.vx = 0; if (see) this.go("notice"); break;
      case "notice": this.face = dx > 0 ? 1 : -1; this.vx = 0; if (this.t >= 0.5) this.go("chase"); break;
      case "chase": this.face = dx > 0 ? 1 : -1; if (!see && dist > d.sight * 1.7) { this.go("idle"); break; } this.vx = dist > d.keep + 14 ? this.face * d.speed : dist < 50 ? -this.face * d.speed * 1.8 : 0; this.cool -= dt;   // keeps its distance
        if (see && this.cool <= 0 && dist < 150 && !p.dead) this.go("windup"); break;
      case "windup": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= 0.85) { this.go("attack"); Sfx.at("whoosh", this.x); const sx = this.x + this.w / 2 + this.face * 10, sy = this.y + 12, ba = Math.atan2((p.y + 13) - sy, (p.x + 6) - sx);
          for (const o of [-0.24, 0, 0.24]) Monsters.shards.push({ x: sx, y: sy, vx: Math.cos(ba + o) * 125, vy: Math.sin(ba + o) * 125 - 8, t: 0, hit: false }); } break;   // fan of three paper blades
      case "attack": this.vx = 0; if (this.t >= 0.2) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= 1.1) { this.go("chase"); this.cool = 2.2 + Math.random(); } break;
      case "hurt": this.vx *= 0.85; if (this.t >= 0.3) this.go("chase"); break;
      case "dead": this.vx = 0; if (this.t > 1.8) this.gone = true; break;
    }
    this.step(world, dt);
  }
  static draw(cx, e, ox, oy) {
    const S = 1.1, st = e.st, age = e.age, dead = st === "dead", fade = dead ? Math.max(0, 1 - e.t / 1.6) : 1, hv = Math.sin(age * 2.4) * 1.3 - 3, reading = st === "windup" ? Math.min(1, e.t / 0.85) : st === "attack" ? 1 : 0;
    Mon.base(cx, e, ox, oy, S, fade); cx.translate(0, hv); if (dead) cx.scale(1, Math.max(0.2, 1 - e.t * 0.5));
    const cols = ["#d9cfbd", "#b8a98a", "#8d8374", "#c9bba0", "#a39a8c"];
    for (let i = 0; i < 11; i++) { const x0 = -9 + i * 1.8, len = 24 + ((i * 7) % 5) * 1.8 + Math.sin(age * 2 + i) * 1.4, sway = Math.sin(age * 1.7 + i * 0.8) * 1.4;   // robe made of hanging paper strips
      cx.fillStyle = "#0c0b11"; cx.fillRect(x0 - 0.2, -28, 2.1, len + 0.6); cx.fillStyle = cols[i % 5]; cx.beginPath(); cx.moveTo(x0, -28); cx.lineTo(x0 + 1.7, -28); cx.lineTo(x0 + 1.7 + sway, -28 + len); cx.lineTo(x0 + sway, -28 + len - 1.5); cx.closePath(); cx.fill(); cx.fillStyle = "rgba(12,11,17,.5)"; for (let y = -26; y < -28 + len - 3; y += 3) cx.fillRect(x0 + 0.4 + sway * (y + 28) / len, y, 0.9, 0.5); }
    cx.fillStyle = "#c9bba0"; cx.beginPath(); cx.arc(2, -32, 7, 0, 6.283); cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke(); cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.arc(5, -32, 3.6, 0, 6.283); cx.fill();   // rolled-paper hood with a dark opening
    cx.strokeStyle = "rgba(217,207,189,.5)"; cx.lineWidth = 0.5; cx.beginPath(); for (let a = 0; a < 7; a += 0.4) cx.lineTo(5 + Math.cos(a) * (3.2 - a * 0.4), -32 + Math.sin(a) * (3.2 - a * 0.4)); cx.stroke();
    cx.fillStyle = "#b8a98a"; for (const [sx, sy, sl, sa] of [[-6, -34, 10, -2.3], [-4, -36, 12, -1.9], [-8, -30, 9, -2.6]]) { cx.save(); cx.translate(sx, sy); cx.rotate(sa + Math.sin(age * 3 + sx) * 0.08); cx.beginPath(); cx.moveTo(0, -1); cx.lineTo(sl, 0); cx.lineTo(0, 1); cx.closePath(); cx.fill(); cx.restore(); }   // torn paper spikes on the back
    cx.save(); cx.translate(8, -15); cx.rotate(-0.15); cx.fillStyle = "#0c0b11"; cx.fillRect(-8, -3, 16.5, 7); cx.fillStyle = "#4a3a2c"; cx.fillRect(-7.4, -2.4, 15.3, 6); cx.fillStyle = "#d9cfbd"; cx.fillRect(-7, -4, 6.6, 6); cx.fillRect(0.4, -4, 6.6, 6); cx.fillStyle = "rgba(12,11,17,.5)"; for (let y = -3; y < 1.5; y += 1.4) { cx.fillRect(-6, y, 5, 0.4); cx.fillRect(1.4, y, 5, 0.4); }
    if (reading > 0) { cx.globalCompositeOperation = "lighter"; const g = cx.createRadialGradient(0, -3, 1, 0, -3, 12 + 6 * reading); g.addColorStop(0, `rgba(255,150,100,${0.5 * reading})`); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(-20, -20, 40, 32); cx.globalCompositeOperation = "source-over"; } cx.restore();   // the book glows as it is read
    for (let i = 0; i < 4; i++) { const a = age * (1 + reading * 2) + i * 1.6, px = 8 + Math.cos(a) * 9, py = -22 + Math.sin(a * 1.3) * 5 - reading * 4; cx.fillStyle = "#d9cfbd"; cx.fillRect(px, py, 2.6, 1.8); }   // loose pages orbit
    cx.fillStyle = "#a39a8c"; cx.fillRect(-1, -13, 3, 1.4); cx.fillRect(14, -13, 3, 1.4);
    Mon.flashOver(cx, e, 11, 17, -18); cx.restore();
  }
}

class Porter extends Mon {
  constructor(x, y) { super("porter", x, y); this.lamp = true; }
  die() { super.die(); Monsters.fires.push({ x: this.x + this.w / 2, t: 0, hit: 0, life: 3 }); }   // the lantern breaks where it falls
  update(dt, world, p) {
    const d = this.d, gy = CFG.level.ground * CFG.T; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt); const { dx, dist, see } = this.view(p);
    switch (this.st) {
      case "idle": this.vx = 0; this.lamp = true; if (see) this.go("notice"); break;
      case "notice": this.face = dx > 0 ? 1 : -1; this.vx = 0; if (this.t >= 0.6) this.go("chase"); break;
      case "chase": this.face = dx > 0 ? 1 : -1; if (!see && dist > d.sight * 1.7) { this.go("idle"); break; } this.vx = dist > d.keep + 10 ? this.face * d.speed : dist < 48 ? -this.face * d.speed * 0.8 : 0; this.cool -= dt;
        if (see && this.cool <= 0 && dist < 140 && dist > 30 && !p.dead) this.go("windup"); break;
      case "windup": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= 0.9) { this.go("attack"); this.lamp = false; Sfx.at("whoosh", this.x);
          const sx = this.x + this.w / 2 + this.face * 14, sy = this.y + 2, tx = p.x + p.w / 2, F = 0.8; Monsters.lanterns.push({ x: sx, y: sy, vx: (tx - sx) / F, vy: (gy - 2 - sy - 0.5 * 420 * F * F) / F, t: 0 }); } break;   // lobbed in an arc to where you stand now
      case "attack": this.vx = 0; if (this.t >= 0.25) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= 0.6) this.lamp = true; if (this.t >= 1.2) { this.go("chase"); this.cool = 2.6 + Math.random(); } break;
      case "hurt": this.vx *= 0.85; if (this.t >= 0.3) this.go("chase"); break;
      case "dead": this.vx = 0; if (this.t > 1.8) this.gone = true; break;
    }
    this.step(world, dt);
  }
  static draw(cx, e, ox, oy) {
    const S = 1.1, st = e.st, age = e.age, dead = st === "dead", fade = dead ? Math.max(0, 1 - Math.max(0, e.t - 0.6) / 1.2) : 1, walk = Math.abs(e.vx) > 4 ? Math.sin(age * 7) : 0;
    Mon.base(cx, e, ox, oy, S, fade); if (dead) cx.scale(1, Math.max(0.4, 1 - e.t * 0.4)); cx.translate(0, Math.abs(walk) * -0.8);
    cx.fillStyle = "#0c0b11"; for (let i = 0; i < 6; i++) { const a = -2.1 + i * 0.28; cx.save(); cx.translate(-6, -22); cx.rotate(a); cx.fillRect(0, -1.2, 24 + (i % 2) * 5, 3); cx.restore(); }   // backpack of planks and bundles
    for (let i = 0; i < 6; i++) { const a = -2.1 + i * 0.28; cx.save(); cx.translate(-6, -22); cx.rotate(a); cx.fillStyle = i % 2 ? "#4a3a2c" : "#6b5646"; cx.fillRect(0, -0.7, 23 + (i % 2) * 5, 1.8); cx.restore(); }
    cx.fillStyle = "#2f3a2c"; for (const px of [-14, -10]) { cx.beginPath(); cx.moveTo(px, -10); cx.quadraticCurveTo(px - 2, -4, px, -2); cx.quadraticCurveTo(px + 2, -4, px, -10); cx.fill(); }
    cx.fillStyle = "#0c0b11"; cx.fillRect(-4, -9, 3, 9 + walk * 1.2); cx.fillRect(1, -9, 3, 9 - walk * 1.2);
    cx.beginPath(); cx.moveTo(-7, -26); cx.lineTo(8, -26); cx.lineTo(10, -4); cx.lineTo(-9, -4); cx.closePath(); cx.fillStyle = "#2f3a2c"; cx.fill(); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = "#8d8374"; for (let y = -23; y < -8; y += 4) cx.fillRect(0.5, y, 1.2, 1.2);   // buttons
    cx.fillStyle = "#b8a98a"; cx.beginPath(); cx.moveTo(-6, -24); cx.quadraticCurveTo(-8, -36, 2, -37); cx.quadraticCurveTo(11, -36, 9, -24); cx.closePath(); cx.fill(); cx.strokeStyle = "#0c0b11"; cx.stroke();   // hood
    cx.fillStyle = "#6b5a50"; cx.beginPath(); cx.arc(4, -30, 4.6, 0, 6.283); cx.fill(); cx.stroke(); cx.fillStyle = "#0c0b11"; cx.beginPath(); cx.arc(3, -31, 1.5, 0, 6.283); cx.arc(6.5, -31, 1.5, 0, 6.283); cx.fill(); cx.fillStyle = "#8d8374"; cx.fillRect(8, -29.5, 3, 3);   // gas mask
    cx.strokeStyle = "#0c0b11"; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(6, -22); cx.lineTo(20, -46); cx.stroke(); cx.strokeStyle = "#6b5646"; cx.lineWidth = 0.9; cx.stroke();   // lantern pole
    const swing = st === "windup" ? -0.7 * Math.min(1, e.t / 0.9) : st === "attack" ? 0.8 : 0.08 * Math.sin(age * 2);
    if (e.lamp) { cx.save(); cx.translate(20, -46); cx.rotate(swing); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.6; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, 5); cx.stroke(); cx.fillStyle = "#0c0b11"; cx.fillRect(-3, 5, 6, 8); cx.fillStyle = "#c8553d"; cx.fillRect(-2, 6, 4, 6); cx.fillStyle = "#ff9a6a"; cx.fillRect(-1, 7.5, 2, 3);
      cx.globalCompositeOperation = "lighter"; const g = cx.createRadialGradient(0, 9, 1, 0, 9, 15 + (st === "windup" ? 6 : 0)); g.addColorStop(0, "rgba(255,150,100,.5)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(-18, -8, 36, 36); cx.globalCompositeOperation = "source-over"; cx.restore(); }
    cx.fillStyle = "#a39a8c"; cx.fillRect(2, -20, 8, 2); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.7; cx.strokeRect(5, -17, 8, 9); cx.strokeStyle = "#8d8374"; cx.lineWidth = 0.4; for (let x = 6.6; x < 13; x += 1.7) { cx.beginPath(); cx.moveTo(x, -17); cx.lineTo(x, -8); cx.stroke(); }   // birdcage
    cx.fillStyle = "#6b5a50"; cx.fillRect(8, -13 + Math.sin(age * 9) * 0.4, 2.4, 2);
    Mon.flashOver(cx, e, 12, 18, -18); cx.restore();
  }
}
