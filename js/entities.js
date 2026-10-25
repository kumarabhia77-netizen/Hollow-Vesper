"use strict";
// Player and enemy behaviour. Numbers come from CFG so they are easy to tune.
const Fx = { shake: 0, hitstop: 0, parts: [], ghosts: [], rings: [], pl: null, waves: [], toast: null, shakeOn: true };
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spark(x, y, col, n) { for (let i = 0; i < n; i++) Fx.parts.push({ x, y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 90, life: .35 + Math.random() * .2, col }); }

function hitFx(x, y, dir) {   // contact flash: ring plus ember and bone streaks flying away from the blow
  Fx.rings.push({ x, y, life: 0.18, d: 0.18, c: "#d9cfbd", r: 3, g: 12 });
  for (let i = 0; i < 12; i++) { if (Fx.parts.length > 160) break; const a = (Math.random() - 0.5) * 1.6;
    Fx.parts.push({ x, y, vx: Math.cos(a) * dir * (60 + Math.random() * 110), vy: Math.sin(a) * 90 - 20, g: 200, s: 2, life: 0.2 + Math.random() * 0.2, col: i % 3 ? "#c8553d" : "#d9cfbd" }); }
}
function dust(x, y, n) { for (let i = 0; i < n; i++) { if (Fx.parts.length > 160) break;
  Fx.parts.push({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 50, vy: -8 - Math.random() * 18, g: 25, s: 3, life: 0.3 + Math.random() * 0.2, col: "#5b5560" }); } }
function ember(x, y, n) { for (let i = 0; i < n; i++) { if (Fx.parts.length > 160) break;
  Fx.parts.push({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, g: -10, s: 2, life: 0.5 + Math.random() * 0.4, col: "#c8553d" }); } }

class Player {
  constructor(x, y) { Object.assign(this, { w: CFG.player.w, h: CFG.player.h, x, y, vx: 0, vy: 0, face: 1, hp: CFG.player.hp,
    ground: false, atk: -1, inv: 0, hurt: 0, dead: false, deadT: 0, coy: 0, buf: 0, hits: null, t: 0, combo: 0, queued: false, pushT: 0, pushV: 0, lunged: false, landT: 0, dodge: -1, dcd: 0, stepT: 0, gh: 0 }); }
  hitbox() { const a = CFG.player.atk, r = a.reach + (this.combo ? 4 : 0); return { x: this.face > 0 ? this.x + this.w : this.x - r, y: this.y + 2, w: r, h: a.h }; }
  damage(d, dir, knock) {
    if (this.inv > 0 || this.dead) return;
    this.hp = Math.max(0, this.hp - d); this.inv = CFG.player.inv; this.hurt = 0.25; this.vx = dir * knock; this.vy = -140; this.atk = -1;
    Fx.shake = 0.25; spark(this.x + 6, this.y + 12, "#c8553d", 8); this.dodge = -1; Sfx.play("hurt");
    if (this.hp === 0) { this.dead = true; Sfx.play("die"); }
  }
  update(dt, world, enemies) {
    const c = CFG.player; this.t += dt; this.inv = Math.max(0, this.inv - dt); this.buf -= dt;
    this.coy = this.ground ? c.coyote : this.coy - dt; this.dcd -= dt;
    if (this.dead) { this.deadT += dt; this.vx *= 0.9; }
    else if (this.hurt > 0) this.hurt -= dt;
    else if (Input.dodgeP && this.dodge < 0 && this.dcd <= 0 && this.hurt <= 0) { this.dodge = 0; this.dcd = c.dodge.cd; this.inv = Math.max(this.inv, c.dodge.inv); this.atk = -1; Sfx.play("dodge"); Fx.rings.push({ x: this.x + 6, y: this.y + 13, life: 0.3, d: 0.3, c: "#d9cfbd", r: 6, g: 22 }); dust(this.x + 6, this.y + 25, 6); }
    if (this.dodge >= 0 && !this.dead) {   // Echo Step: quick forward dash, brief invincibility, faint afterimages
      this.dodge += dt; this.vx = this.face * c.dodge.speed; this.gh -= dt;
      if (this.gh <= 0) { this.gh = 0.02; Fx.ghosts.push({ x: this.x, y: this.y, face: this.face, life: 0.42, f: Math.min(2, Math.floor(this.dodge / c.dodge.dur * 3)) }); if (this.ground) dust(this.x + 6, this.y + 25, 1); }
      if (this.dodge >= c.dodge.dur) { this.dodge = -1; this.vx = 0; }
    } else if (!this.dead && this.hurt <= 0) {
      const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
      this.vx = dir * c.speed * (this.atk >= 0 ? c.atk.moveMul : 1);
      if (this.pushT > 0) { this.vx += this.pushV; this.pushT -= dt; }   // sword lunge or shield recoil
      if (dir && this.atk < 0) this.face = dir;
      if (Input.jumpP) this.buf = c.buffer;
      if (this.buf > 0 && this.coy > 0) { this.vy = -c.jump; this.buf = 0; this.coy = 0; }
      if (!Input.jump && this.vy < -120) this.vy += CFG.GRAV * 1.5 * dt;   // release jump early = short hop
      if (Input.atkP && this.atk < 0) { this.atk = 0; this.hits = new Set(); this.lunged = false; this.combo = 0; this.queued = false; Sfx.play("swing"); }
    }
    if (this.atk >= 0 && !this.dead) {
      const a = c.atk; this.atk += dt;
      if (!this.lunged && this.atk >= a.from) { this.lunged = true; this.pushT = 0.12; this.pushV = this.face * 75; dust(this.x + 6 - this.face * 6, this.y + 26, 3); }
      if (this.atk > a.to && Input.atkP) this.queued = true;   // press again late in the swing for the second strike
      if (this.atk >= a.from && this.atk <= a.to) {
        const box = this.hitbox();
        for (const e of enemies) if (e.alive() && !this.hits.has(e) && ov(box, e)) { this.hits.add(e); e.damage(a.dmg, this.face, a.knock * (this.combo ? 1.4 : 1)); } // one hit per swing
      }
      if (this.atk >= a.dur) { if (this.queued) { this.queued = false; this.combo ^= 1; this.atk = 0; this.hits = new Set(); this.lunged = false; Sfx.play("swing"); } else { this.atk = -1; this.combo = 0; } }
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); const was = this.ground, fv = this.vy; world.move(this, dt); this.landT = Math.max(0, this.landT - dt);
    if (!was && this.ground && fv > 150 && !this.dead) { this.landT = 0.12; Sfx.play("step"); dust(this.x + 6, this.y + 26, 7); }
    if (this.ground && Math.abs(this.vx) > 10 && this.atk < 0 && !this.dead) { this.stepT -= dt; if (this.stepT <= 0) { Sfx.play("step"); this.stepT = 0.28; dust(this.x + 6 - this.face * 4, this.y + 26, 1); } }
  }
}

class Enemy {
  constructor(type, x, y) { const d = CFG.enemies[type]; this.d = d;
    Object.assign(this, { type, w: d.w, h: d.h, x, y, vx: 0, vy: 0, face: -1, hp: d.hp, st: "patrol", t: 0, ground: false, did: false, flash: 0, gone: false }); }
  alive() { return this.st !== "dead"; }
  go(s) { this.st = s; this.t = 0; this.did = false; this.fx = false; if (s === "windup") Sfx.play("warn"); }
  hitbox() { return { x: this.face > 0 ? this.x + this.w : this.x - this.d.atk.reach, y: this.y + this.h * 0.45, w: this.d.atk.reach, h: this.h * 0.55 }; }
  blocked(world) { const T = world.T, tx = Math.floor((this.x + (this.face > 0 ? this.w + 2 : -2)) / T), ty = Math.floor((this.y + this.h + 2) / T);
    return this.wall || !world.solid(tx, ty); }
  damage(n, dir, knock) {
    if (!this.alive()) return;
    this.hp -= n; this.flash = 0.12; Fx.shake = 0.12; Fx.hitstop = 0.07; Sfx.play("hit"); hitFx(this.x + this.w / 2, this.y + this.h * 0.4, dir);
    if (this.hp <= 0) { this.go("dead"); Sfx.play("edie"); ember(this.x + this.w / 2, this.y + 8, 14); this.vx = dir * knock * 0.5; this.vy = -100; return; }
    this.go("hurt"); this.vx = dir * knock; this.vy = -80;
  }
  update(dt, world, p) {
    const d = this.d, a = d.atk; this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dy = p.y - this.y;
    const see = !p.dead && Math.abs(dx) < d.sight && Math.abs(dy) < 36 && world.clear(this, p);
    switch (this.st) {
      case "patrol": this.vx = this.face * d.speed; if (this.blocked(world)) this.face *= -1; if (see) this.go("notice"); break;
      case "notice": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= d.notice) this.go("chase"); break;   // bell snaps up: a readable warning before the chase
      case "chase": this.face = dx > 0 ? 1 : -1; this.vx = this.blocked(world) ? 0 : this.face * d.chase;
        if (!see && Math.abs(dx) > d.sight * 1.4) this.go("patrol");
        else if (see && Math.abs(dx) < a.range && Math.abs(dy) < 24) this.go("windup"); break;
      case "windup": this.vx = 0; if (this.t >= a.windup) this.go("attack"); break;
      case "attack": this.vx = this.face * 50;
        if (!this.fx) { this.fx = true; const tx = this.face > 0 ? this.x + this.w + a.reach : this.x - a.reach; dust(tx, this.y + this.h, 5); spark(tx, this.y + this.h - 2, "#d9cfbd", 4); Fx.shake = Math.max(Fx.shake, 0.08); Sfx.play("chain"); }   // chain hits the floor
        if (!this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(a.dmg, this.face, a.knock); }
        if (this.t >= a.active) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= a.recover) this.go("chase"); break;
      case "hurt": this.vx *= 0.92; if (this.t >= 0.3) this.go("chase"); break;
      case "dead": this.vx *= 0.92; if (this.t > 1.6) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
}

// The Bell Keeper: a large chained bell-bearer with three phases. Phase 1 sweeps its chain, phase 2 adds a floor wave you must jump or dodge, phase 3 is faster.
class Boss extends Enemy {
  constructor(x, y) { super("husk", x, y); const b = CFG.boss; Object.assign(this, { d: b, w: b.w, h: b.h, hp: b.hp, maxhp: b.hp, st: "sleep", face: -1, atkType: "sweep", phase: 1, boss: true, sc: 1.76 }); }
  wake() { this.go("idle"); }
  damage(n, dir) {
    if (!this.alive() || this.st === "sleep" || this.st === "roar") return;
    this.hp -= n; this.flash = 0.1; Fx.shake = 0.12; Fx.hitstop = 0.06; Sfx.play("hit"); hitFx(this.x + this.w / 2, this.y + this.h * 0.4, dir);
    if (this.hp <= 0) { this.go("dead"); Sfx.play("edie"); ember(this.x + this.w / 2, this.y + 10, 30); Fx.shake = 0.5; return; }
    const ph = this.hp <= this.maxhp / 3 ? 3 : this.hp <= this.maxhp * 2 / 3 ? 2 : 1;
    if (ph !== this.phase) { this.phase = ph; this.go("roar"); Fx.shake = 0.4; Sfx.play("bell"); Fx.rings.push({ x: this.x + this.w / 2, y: this.y + 12, life: 0.9, d: 0.9, c: "#c8553d", r: 6, g: 90 }); }   // phase change: safe pause with a clear signal
  }
  update(dt, world, p) {
    const d = this.d; this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dist = Math.abs(dx), sp = this.phase === 3 ? 1.35 : 1, gy = CFG.level.ground * CFG.T;
    switch (this.st) {
      case "sleep": return;
      case "idle": this.face = dx > 0 ? 1 : -1; this.vx = dist > d.range * 0.7 ? this.face * d.speed * sp : 0;
        if (this.t > 0.9 / sp) { const near = dist < d.range * 1.2;
          if (near) this.atkType = "sweep"; else if (this.phase >= 2) this.atkType = "wave"; else { this.t = 0.6; break; }
          if (this.atkType === "wave") Fx.rings.push({ x: this.x + this.w / 2, y: gy - 2, life: d.windup / sp, d: d.windup / sp, c: "#c8553d", r: 4, g: 30 });
          this.go("windup"); } break;
      case "windup": this.vx = 0; if (this.t >= d.windup / sp) { this.go("attack"); if (this.atkType === "wave") this.fire(gy); } break;
      case "attack": this.vx = 0; if (this.atkType === "sweep" && !this.fx) { this.fx = true; const tx = this.face > 0 ? this.x + this.w + d.atk.reach : this.x - d.atk.reach; dust(tx, this.y + this.h, 8); Fx.shake = Math.max(Fx.shake, 0.18); Sfx.play("chain"); }
        if (this.atkType === "sweep" && !this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(1, this.face, 170); }
        if (this.t >= d.active) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= d.recover / sp) this.go("idle"); break;
      case "roar": this.vx = 0; if (this.t >= 0.9) this.go("idle"); break;
      case "dead": this.vx *= 0.9; if (this.t > 2.5) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
  fire(gy) { for (let i = 0; i < (this.phase === 3 ? 2 : 1); i++) Fx.waves.push({ x: this.x + this.w / 2 + this.face * 12, y: gy, vx: this.face * (90 + i * 50), life: 3.5, hit: false, dir: this.face }); Sfx.play("wave"); Fx.shake = 0.2; }
}

// Bellbound: keeps its distance and sends a slow sound wave along the floor. Jump it or dodge through it.
class Bound extends Enemy {
  constructor(x, y) { super("husk", x, y); const d = CFG.enemies.bound; Object.assign(this, { d, w: d.w, h: d.h, hp: d.hp, atlas: "husk_b", sc: 1.18 }); }
  update(dt, world, p) {
    const d = this.d, a = d.atk; this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const dx = (p.x + 6) - (this.x + this.w / 2), dist = Math.abs(dx), see = !p.dead && dist < d.sight && Math.abs(p.y - this.y) < 48 && world.clear(this, p), T = world.T;
    switch (this.st) {
      case "patrol": this.vx = this.face * d.speed; if (this.blocked(world)) this.face *= -1; if (see) this.go("notice"); break;
      case "notice": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= d.notice) this.go("chase"); break;
      case "chase": this.face = dx > 0 ? 1 : -1; this.vx = 0;
        if (dist < d.keep && world.solid(Math.floor((this.x + (this.face > 0 ? -2 : this.w + 2)) / T), Math.floor((this.y + this.h + 2) / T))) this.vx = -this.face * d.speed;   // back away, but never off a ledge
        if (!see && dist > d.sight * 1.4) this.go("patrol"); else if (see && this.t > d.rest) this.go("windup"); break;
      case "windup": this.vx = 0; if (this.t >= a.windup) { this.go("attack"); Fx.waves.push({ x: this.x + this.w / 2 + this.face * 10, y: CFG.level.ground * T, vx: this.face * d.wave, life: 3, hit: false, dir: this.face }); Sfx.play("wave"); } break;
      case "attack": this.vx = 0; if (this.t >= 0.12) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= a.recover) this.go("chase"); break;
      case "hurt": this.vx *= 0.92; if (this.t >= 0.3) this.go("chase"); break;
      case "dead": this.vx *= 0.92; if (this.t > 1.6) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
}

// Mourner: fades into mist when it notices you, reappears beside you and strikes fast. Read the tell and reposition.
class Mourner extends Enemy {
  constructor(x, y) { super("husk", x, y); const d = CFG.enemies.mourner; Object.assign(this, { d, w: d.w, h: d.h, hp: d.hp, atlas: "husk_m", alpha: 1 }); }
  damage(n, dir, k) { if (this.st === "fade" || this.st === "gone") return; super.damage(n, dir, k); }
  mist(n) { for (let i = 0; i < n; i++) if (Fx.parts.length < 160) Fx.parts.push({ x: this.x + Math.random() * this.w, y: this.y + 4 + Math.random() * 18, vx: (Math.random() - 0.5) * 14, vy: -6, g: -8, s: 2, life: 0.5, col: "#5b5560" }); }
  update(dt, world, p) {
    const d = this.d, a = d.atk; this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const dx = (p.x + 6) - (this.x + this.w / 2), dist = Math.abs(dx), see = !p.dead && dist < d.sight && Math.abs(p.y - this.y) < 48 && world.clear(this, p), T = world.T;
    switch (this.st) {
      case "patrol": this.alpha = 1; this.vx = this.face * d.speed; if (this.blocked(world)) this.face *= -1; if (see) this.go("notice"); break;
      case "notice": this.vx = 0; this.face = dx > 0 ? 1 : -1; if (this.t >= d.notice) this.go("fade"); break;
      case "fade": this.vx = 0; this.alpha = Math.max(0, 1 - this.t / 0.35); if (Math.random() < 0.6) this.mist(1); if (this.t >= 0.35) this.go("gone"); break;
      case "gone": this.vx = 0; this.alpha = 0;
        if (this.t >= 0.5) { let side = Math.random() < 0.5 ? -1 : 1, x = p.x + side * 44;
          const ok = xx => world.solid(Math.floor((xx + 7) / T), Math.floor((this.y + this.h + 2) / T)) && !world.solid(Math.floor((xx + 7) / T), Math.floor((this.y + 4) / T));
          if (!ok(x)) x = p.x - side * 44; if (ok(x)) { this.x = x; this.go("appear"); } else this.go("patrol"); } break;
      case "appear": this.vx = 0; this.face = (p.x > this.x) ? 1 : -1; this.alpha = Math.min(1, this.t / 0.3); if (Math.random() < 0.6) this.mist(1); if (this.t >= 0.3) this.go("windup"); break;
      case "windup": this.vx = 0; this.alpha = 1; if (this.t >= a.windup) this.go("attack"); break;
      case "attack": this.vx = this.face * 40; if (!this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(a.dmg, this.face, a.knock); } if (this.t >= a.active) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= a.recover) this.go(this.t > 0 && see ? "fade" : "patrol"); break;
      case "hurt": this.vx *= 0.92; if (this.t >= 0.3) this.go("fade"); break;
      case "dead": this.vx *= 0.92; if (this.t > 1.6) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
}

// Chime: a hovering bell-spirit. Dormant until the bell rings, then it swarms. One strike silences it.
class Chime extends Enemy {
  constructor(x, y) { super("husk", x, y); const d = CFG.enemies.chime; Object.assign(this, { d, w: d.w, h: d.h, hp: 1, hx: x, hy: y, st: "dormant", ph: Math.random() * 6, chime: true, cool: 0, ping: 0 }); }
  wake() { if (this.st === "dormant") { this.go("swarm"); Fx.rings.push({ x: this.x + 5, y: this.y + 5, life: 0.4, d: 0.4, c: "#d9cfbd", r: 3, g: 14 }); } }
  damage(n, dir) { if (!this.alive()) return; this.go("dead"); this.vy = -40; Sfx.play("edie"); hitFx(this.x + 5, this.y + 5, dir); ember(this.x + 5, this.y + 5, 8); Fx.hitstop = 0.04; }
  update(dt, world, p) {
    this.t += dt; this.ph += dt;
    if (this.st === "dormant") { this.x = this.hx + Math.sin(this.ph * 1.3) * 5; this.y = this.hy + Math.sin(this.ph * 2) * 3; return; }
    if (this.st === "dead") { this.vy += 300 * dt; this.y += this.vy * dt; if (this.t > 0.6) this.gone = true; return; }
    const dx = p.x + 6 - (this.x + 5), dy = p.y + 8 - (this.y + 5), dist = Math.hypot(dx, dy) || 1;
    if (this.cool > 0) { this.cool -= dt; this.x -= dx / dist * 40 * dt; this.y -= dy / dist * 40 * dt; }
    else { this.x += dx / dist * this.d.speed * dt; this.y += dy / dist * this.d.speed * dt + Math.sin(this.ph * 6) * 12 * dt; }
    if (!p.dead && this.cool <= 0 && ov(this, p)) { p.damage(1, dx > 0 ? 1 : -1, 120); this.cool = 0.9; }
    this.ping -= dt; if (this.ping <= 0) { this.ping = 1.6; Fx.rings.push({ x: this.x + 5, y: this.y + 5, life: 0.5, d: 0.5, c: "#d9cfbd", r: 3, g: 16 }); Sfx.play("chime"); }
  }
}

// Iron Sentinel: a heavy knight that holds a tower shield up front. Strikes into the shield bounce off; hit it while it winds up, swings or recovers, or get around behind it (it turns slowly).
class Sentinel extends Enemy {
  constructor(x, y) { super("husk", x, y); const d = CFG.enemies.sentinel; Object.assign(this, { d, w: d.w, h: d.h, hp: d.hp, atlas: "player_s", sentinel: true, sc: 1.12, turn: 0.5, sh: 0 }); }
  guarding() { return this.st === "chase" || this.st === "notice" || this.st === "patrol"; }
  hitbox() { const r = this.d.atk.reach; return { x: this.face > 0 ? this.x + this.w : this.x - r, y: this.y, w: r, h: this.h }; }
  damage(n, dir, k) {
    if (!this.alive()) return;
    if (this.face === -dir && this.guarding()) {   // blocked by the shield
      this.sh = 0.15; Sfx.play("clink"); Fx.shake = Math.max(Fx.shake, 0.1); Fx.hitstop = 0.05; const x = this.x + this.w / 2 + this.face * 9;
      spark(x, this.y + 10, "#d9cfbd", 8); Fx.rings.push({ x, y: this.y + 12, life: 0.15, d: 0.15, c: "#d9cfbd", r: 2, g: 8 });
      if (Fx.pl) { Fx.pl.atk = -1; Fx.pl.pushT = 0.14; Fx.pl.pushV = -dir * 140; } return; }
    super.damage(n, dir, k);
  }
  update(dt, world, p) {
    const d = this.d, a = d.atk; this.t += dt; this.flash = Math.max(0, this.flash - dt); this.sh = Math.max(0, this.sh - dt);
    const dx = (p.x + 6) - (this.x + this.w / 2), dist = Math.abs(dx), nf = dx > 0 ? 1 : -1, see = !p.dead && dist < d.sight && Math.abs(p.y - this.y) < 48 && world.clear(this, p);
    switch (this.st) {
      case "patrol": this.vx = this.face * d.speed * 0.6; if (this.blocked(world)) this.face *= -1; if (see) this.go("notice"); break;
      case "notice": this.vx = 0; this.face = nf; if (this.t >= d.notice) this.go("chase"); break;
      case "chase": if (nf !== this.face) { this.turn -= dt; if (this.turn <= 0) { this.face = nf; this.turn = 0.5; } } else this.turn = 0.5;   // slow to turn: a gap to get behind it
        this.vx = this.blocked(world) ? 0 : this.face * d.speed;
        if (!see && dist > d.sight * 1.4) this.go("patrol"); else if (see && dist < a.range && this.face === nf && this.t > 0.5) this.go("windup"); break;
      case "windup": this.vx = 0; if (this.t >= a.windup) this.go("attack"); break;
      case "attack": this.vx = this.face * 60; if (!this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(a.dmg, this.face, a.knock); } if (this.t >= a.active) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= a.recover) this.go("chase"); break;
      case "hurt": this.vx *= 0.9; if (this.t >= 0.25) this.go("chase"); break;
      case "dead": this.vx *= 0.92; if (this.t > 1.6) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
}
