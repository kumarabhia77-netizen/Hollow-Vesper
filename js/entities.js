"use strict";
// Player and enemy behaviour. Numbers come from CFG so they are easy to tune.
const Fx = { shake: 0, hitstop: 0, parts: [], ghosts: [], rings: [], shakeOn: true };
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spark(x, y, col, n) { for (let i = 0; i < n; i++) Fx.parts.push({ x, y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 90, life: .35 + Math.random() * .2, col }); }

class Player {
  constructor(x, y) { Object.assign(this, { w: CFG.player.w, h: CFG.player.h, x, y, vx: 0, vy: 0, face: 1, hp: CFG.player.hp,
    ground: false, atk: -1, inv: 0, hurt: 0, dead: false, deadT: 0, coy: 0, buf: 0, hits: null, t: 0, landT: 0, dodge: -1, dcd: 0, stepT: 0, gh: 0 }); }
  hitbox() { const a = CFG.player.atk; return { x: this.face > 0 ? this.x + this.w : this.x - a.reach, y: this.y + 2, w: a.reach, h: a.h }; }
  damage(d, dir, knock) {
    if (this.inv > 0 || this.dead) return;
    this.hp = Math.max(0, this.hp - d); this.inv = CFG.player.inv; this.hurt = 0.25; this.vx = dir * knock; this.vy = -140; this.atk = -1;
    Fx.shake = 0.25; spark(this.x + 6, this.y + 12, "#b33a3a", 8); this.dodge = -1; Sfx.play("hurt");
    if (this.hp === 0) { this.dead = true; Sfx.play("die"); }
  }
  update(dt, world, enemies) {
    const c = CFG.player; this.t += dt; this.inv = Math.max(0, this.inv - dt); this.buf -= dt;
    this.coy = this.ground ? c.coyote : this.coy - dt; this.dcd -= dt;
    if (this.dead) { this.deadT += dt; this.vx *= 0.9; }
    else if (this.hurt > 0) this.hurt -= dt;
    else if (Input.dodgeP && this.dodge < 0 && this.dcd <= 0 && this.hurt <= 0) { this.dodge = 0; this.dcd = c.dodge.cd; this.inv = Math.max(this.inv, c.dodge.inv); this.atk = -1; Sfx.play("dodge"); Fx.rings.push({ x: this.x + 6, y: this.y + 13, life: 0.3 }); }
    if (this.dodge >= 0 && !this.dead) {   // Echo Step: quick forward dash, brief invincibility, faint afterimages
      this.dodge += dt; this.vx = this.face * c.dodge.speed; this.gh -= dt;
      if (this.gh <= 0) { this.gh = 0.03; Fx.ghosts.push({ x: this.x, y: this.y, face: this.face, life: 0.3 }); if (this.ground) spark(this.x + 6, this.y + 25, "#5b5560", 1); }
      if (this.dodge >= c.dodge.dur) { this.dodge = -1; this.vx = 0; }
    } else if (!this.dead && this.hurt <= 0) {
      const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
      this.vx = dir * c.speed * (this.atk >= 0 ? c.atk.moveMul : 1);
      if (dir && this.atk < 0) this.face = dir;
      if (Input.jumpP) this.buf = c.buffer;
      if (this.buf > 0 && this.coy > 0) { this.vy = -c.jump; this.buf = 0; this.coy = 0; }
      if (!Input.jump && this.vy < -120) this.vy += CFG.GRAV * 1.5 * dt;   // release jump early = short hop
      if (Input.atkP && this.atk < 0) { this.atk = 0; this.hits = new Set(); Sfx.play("swing"); }
    }
    if (this.atk >= 0 && !this.dead) {
      const a = c.atk; this.atk += dt;
      if (this.atk >= a.from && this.atk <= a.to) {
        const box = this.hitbox();
        for (const e of enemies) if (e.alive() && !this.hits.has(e) && ov(box, e)) { this.hits.add(e); e.damage(a.dmg, this.face, a.knock); } // one hit per swing
      }
      if (this.atk >= a.dur) this.atk = -1;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); const was = this.ground, fv = this.vy; world.move(this, dt); this.landT = Math.max(0, this.landT - dt);
    if (!was && this.ground && fv > 150 && !this.dead) { this.landT = 0.12; Sfx.play("step"); spark(this.x + 6, this.y + 26, "#5b5560", 4); }
    if (this.ground && Math.abs(this.vx) > 10 && this.atk < 0 && !this.dead) { this.stepT -= dt; if (this.stepT <= 0) { Sfx.play("step"); this.stepT = 0.28; } }
  }
}

class Enemy {
  constructor(type, x, y) { const d = CFG.enemies[type]; this.d = d;
    Object.assign(this, { type, w: d.w, h: d.h, x, y, vx: 0, vy: 0, face: -1, hp: d.hp, st: "patrol", t: 0, ground: false, did: false, flash: 0, gone: false }); }
  alive() { return this.st !== "dead"; }
  go(s) { this.st = s; this.t = 0; this.did = false; if (s === "windup") Sfx.play("warn"); }
  hitbox() { return { x: this.face > 0 ? this.x + this.w : this.x - this.d.atk.reach, y: this.y + this.h * 0.45, w: this.d.atk.reach, h: this.h * 0.55 }; }
  blocked(world) { const T = world.T, tx = Math.floor((this.x + (this.face > 0 ? this.w + 2 : -2)) / T), ty = Math.floor((this.y + this.h + 2) / T);
    return this.wall || !world.solid(tx, ty); }
  damage(n, dir, knock) {
    if (!this.alive()) return;
    this.hp -= n; this.flash = 0.12; Fx.shake = 0.12; Fx.hitstop = 0.07; Sfx.play("hit"); spark(this.x + this.w / 2, this.y + 10, "#e8d8b0", 6);
    if (this.hp <= 0) { this.go("dead"); Sfx.play("edie"); this.vx = dir * knock * 0.5; this.vy = -100; return; }
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
        if (!this.did && !p.dead && ov(this.hitbox(), p)) { this.did = true; p.damage(a.dmg, this.face, a.knock); }
        if (this.t >= a.active) this.go("recover"); break;
      case "recover": this.vx = 0; if (this.t >= a.recover) this.go("chase"); break;
      case "hurt": this.vx *= 0.92; if (this.t >= 0.3) this.go("chase"); break;
      case "dead": this.vx *= 0.92; if (this.t > 1.6) this.gone = true; break;
    }
    this.vy = Math.min(this.vy + CFG.GRAV * dt, 700); world.move(this, dt);
  }
}
