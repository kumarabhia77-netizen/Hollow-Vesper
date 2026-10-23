"use strict";
// Player and enemy behaviour. Numbers come from CFG so they are easy to tune.
const Fx = { shake: 0, hitstop: 0, parts: [] };
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function spark(x, y, col, n) { for (let i = 0; i < n; i++) Fx.parts.push({ x, y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 90, life: .35 + Math.random() * .2, col }); }

class Player {
  constructor(x, y) { Object.assign(this, { w: CFG.player.w, h: CFG.player.h, x, y, vx: 0, vy: 0, face: 1, hp: CFG.player.hp,
    ground: false, atk: -1, inv: 0, hurt: 0, dead: false, deadT: 0, coy: 0, buf: 0, hits: null, t: 0 }); }
  hitbox() { const a = CFG.player.atk; return { x: this.face > 0 ? this.x + this.w : this.x - a.reach, y: this.y + 2, w: a.reach, h: a.h }; }
  damage(d, dir, knock) {
    if (this.inv > 0 || this.dead) return;
    this.hp = Math.max(0, this.hp - d); this.inv = CFG.player.inv; this.hurt = 0.25; this.vx = dir * knock; this.vy = -140; this.atk = -1;
    Fx.shake = 0.25; spark(this.x + 6, this.y + 12, "#b33a3a", 8); if (this.hp === 0) this.dead = true;
  }
  update(dt, world, enemies) {
    const c = CFG.player; this.t += dt; this.inv = Math.max(0, this.inv - dt); this.buf -= dt;
    this.coy = this.ground ? c.coyote : this.coy - dt;
    if (this.dead) { this.deadT += dt; this.vx *= 0.9; }
    else if (this.hurt > 0) this.hurt -= dt;
    else {
      const dir = (Input.right ? 1 : 0) - (Input.left ? 1 : 0);
      this.vx = dir * c.speed * (this.atk >= 0 ? c.atk.moveMul : 1);
      if (dir && this.atk < 0) this.face = dir;
