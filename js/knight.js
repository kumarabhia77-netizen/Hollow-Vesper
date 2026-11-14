"use strict";
(window.HV_V = window.HV_V || {}).knight = 10;
// Cursed Knight: elite humanoid enemy. Every frame comes from your Monster Pack sheet (59 frames: idle 5, walk 8, run 8, attack 6, combo 8, hurt 3, stagger 4, die 7, bell ring 5, soul absorb 5),
// cut out and packed in assets/cursed_knight/ck_atlas.png. All damage is done by the code below (hitboxes, the bell wave), never by the drawing.
//   Slash  : wind-up 0.5 s, hit, recover 0.5 s.            Combo : two quick slashes after a wind-up of 0.45 s.
//   Bell Ring (special): raises its bells (0.9 s), then a ground wave (radius 62) rolls out; jump it or dash through it.
//   Soul Absorb (special, once, below 50 percent health): it channels for 1.8 s and heals 3 HP; it is easier to hit then, and a heavy hit interrupts it.
//   Super armour: light hits do not interrupt its attacks; heavy hits (Heavy Cleave, Rapture Lash, blasts) stagger it.
const CK = { img: null, FR: {"idle":[[0,0,70,127,34],[74,0,68,125,33],[146,0,73,126,36],[223,0,71,128,35],[298,0,68,128,33]],"walk":[[0,132,72,120,35],[76,132,62,126,30],[142,132,65,125,32],[211,132,71,125,35],[286,132,83,124,41],[373,132,76,125,37],[453,132,74,125,36],[531,132,81,126,40]],"run":[[0,262,66,109,32],[70,262,80,108,33],[154,262,72,116,35],[230,262,86,110,42],[320,262,71,111,35],[395,262,82,109,40],[481,262,76,110,37],[561,262,62,106,30]],"attack":[[0,382,86,145,42],[90,382,87,144,42],[181,382,62,145,30],[247,382,66,145,32],[317,382,78,145,38],[399,382,93,105,46]],"combo":[[0,531,80,118,39],[84,531,82,114,40],[170,531,81,115,40],[255,531,83,120,41],[342,531,96,113,47],[442,531,85,128,38],[531,531,69,123,34],[604,531,101,129,50]],"hurt":[[0,664,83,116,41],[87,664,87,112,43],[178,664,107,111,53]],"stagger":[[0,784,79,118,39],[83,784,66,117,32],[153,784,64,113,31],[221,784,68,115,33]],"die":[[0,906,98,103,48],[102,906,67,107,33],[173,906,63,91,31],[240,906,101,76,50],[345,906,75,57,37],[424,906,82,53,40],[510,906,79,33,39]],"bell":[[0,1017,97,148,48],[101,1017,94,156,46],[199,1017,99,156,47],[302,1017,108,170,54],[414,1017,107,169,52]],"soul":[[0,1191,80,149,39],[84,1191,78,148,38],[166,1191,78,156,38],[248,1191,91,171,44],[343,1191,120,171,60]]}, fps: { idle: 6, walk: 9, run: 13 }, S: 0.33 };
CK.img = new Image(); CK.img.src = "assets/cursed_knight/ck_atlas.png";
class CursedKnight extends Mon {
  constructor(x, y) { super("knight", x, y); Object.assign(this, { kind: "slash", spCd: 4 + Math.random() * 3, soulDone: false, soulT: 0, rw: null, hit2: false, heal: 0 }); }
  mitigate(n) { return this.st === "soul" ? n * 1.3 : n; }
  react(dir, knock) {
    if (this.st === "soul" && knock >= 190) { this.go("stagger"); this.vx = dir * 40; Fx.shake = Math.max(Fx.shake, 0.2); Sfx.play("chime"); return; }   // a heavy hit breaks the channel
    if (knock >= 190 && this.st !== "stagger") { this.go("stagger"); this.vx = dir * 50; Fx.shake = Math.max(Fx.shake, 0.2); return; }
    if (["windup", "attack", "attack2", "soul", "stagger"].includes(this.st)) return;                                   // super armour
    this.go("hurt"); this.vx = dir * 40;
  }
  update(dt, world, p) {
    const d = this.d, T = CFG.T, gy = CFG.level.ground * T; this.t += dt; this.age += dt; this.flash = Math.max(0, this.flash - dt); this.spCd -= dt; this.cool -= dt;
    const { dx, dist, see } = this.view(p), fc = dx > 0 ? 1 : -1;
    switch (this.st) {
      case "idle": this.vx = 0; if (see) this.go("alert"); break;
      case "alert": this.vx = 0; this.face = fc; if (this.t >= 0.45) this.go("chase"); break;
      case "chase": this.face = fc; if (!see && dist > d.sight * 1.7) { this.go("idle"); break; }
        this.vx = dist > 70 ? this.face * d.run : dist > 40 ? this.face * d.speed : 0;
        if (p.dead) break;
        if (!this.soulDone && this.hp <= this.maxhp * 0.5) { this.soulDone = true; this.go("soul"); this.heal = 0; break; }
        if (this.spCd <= 0 && dist > 55 && dist < 130 && p.ground) { this.kind = "bell"; this.spCd = 7 + Math.random() * 3; this.go("windup"); break; }
        if (this.cool <= 0 && dist < 46) { this.kind = Math.random() < 0.5 ? "combo" : "slash"; this.go("windup"); } break;
      case "windup": { this.vx = 0; this.face = fc; const need = this.kind === "bell" ? 0.9 : this.kind === "combo" ? 0.45 : 0.5;
        if (this.t >= need) { this.go("attack"); this.hit2 = false; if (this.kind === "bell") { Sfx.play("bell"); Fx.shake = Math.max(Fx.shake, 0.15); } else { Sfx.play("whoosh"); if (ov(this.hitbox(), p)) p.damage(1, this.face, 170); } } break; }
      case "attack": { this.vx = this.face * (this.kind === "bell" ? 0 : 30);
        if (this.kind === "bell") { const k = this.t / 0.5, R = d.ringR * Math.min(1, k * 1.15); this.rw = { r: R, k }; Bellfx.pulse(this, R);
          if (!this.did && !p.dead && p.ground) { const pd = Math.abs(dx); if (pd < R + 4 && pd > R - 14 && Math.abs(p.y - this.y) < 40) { this.did = true; p.damage(1, dx > 0 ? 1 : -1, 200); } }
          if (this.t >= 0.5) { this.rw = null; this.go("recover"); } }
        else if (this.kind === "combo") { if (this.t >= 0.14) { this.go("attack2"); Sfx.play("whoosh"); if (ov(this.hitbox(), p)) p.damage(1, this.face, 170); } }
        else if (this.t >= 0.16) this.go("recover"); break; }
      case "attack2": this.vx = this.face * 30; if (this.t >= 0.16) this.go("recover"); break;
      case "recover": this.vx = 0; this.rw = null; if (this.t >= (this.kind === "bell" ? 0.7 : 0.5)) { this.go("chase"); this.cool = 0.9 + Math.random() * 0.6; } break;
      case "soul": { this.vx = 0; this.face = fc; const k = this.t / 1.8; this.hp = Math.min(this.maxhp, this.hp + (3 * dt) / 1.8);   // heals about 3 HP while channelling
        if (Math.random() < 0.7 && Fx.parts.length < 165) { const a = Math.random() * 6.283, r = 26 + Math.random() * 14; Fx.parts.push({ x: this.x + 8 + Math.cos(a) * r, y: this.y + 16 + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 48, g: 0, s: 1.6, life: 0.4, col: Math.random() < 0.5 ? "#ff3d4f" : "#ff9a6a" }); }
        if (this.t >= 1.8) { this.go("chase"); this.cool = 0.5; } break; }
      case "hurt": this.vx *= 0.85; if (this.t >= 0.3) this.go("chase"); break;
      case "stagger": this.vx *= 0.9; if (this.t >= 0.75) { this.go("chase"); this.cool = 0.4; } break;
      case "dead": this.vx = 0; if (this.t > 2.4) this.gone = true; break;
    }
    if (Math.abs(this.vx) > 40 && this.ground && Math.random() < 0.15 && Fx.parts.length < 165) Fx.parts.push({ x: this.x + 8 - this.face * 6, y: this.y + this.h - 1, vx: -this.face * 12, vy: -8, g: -4, s: 1.5, life: 0.35, col: "#5b5560" });
    this.step(world, dt);
  }
  static pick(e) {
    const t = e.t, st = e.st, F = CK.FR; let an = "idle", i = 0;
    if (st === "idle" || st === "alert") { an = "idle"; i = Math.floor(e.age * CK.fps.idle) % 5; }
    else if (st === "chase") { const run = Math.abs(e.vx) > 40; an = run ? "run" : "walk"; i = Math.floor(e.age * CK.fps[an]) % F[an].length; }
    else if (st === "windup") { if (e.kind === "bell") { an = "bell"; i = Math.min(2, Math.floor(t / 0.3)); } else if (e.kind === "combo") { an = "combo"; i = Math.min(2, Math.floor(t / 0.15)); } else { an = "attack"; i = Math.min(1, Math.floor(t / 0.25)); } }
    else if (st === "attack") { if (e.kind === "bell") { an = "bell"; i = t < 0.15 ? 3 : 4; } else if (e.kind === "combo") { an = "combo"; i = t < 0.07 ? 3 : 4; } else { an = "attack"; i = 2 + Math.min(1, Math.floor(t / 0.08)); } }
    else if (st === "attack2") { an = "combo"; i = t < 0.08 ? 5 : 6; }
    else if (st === "recover") { if (e.kind === "bell") { an = "bell"; i = 4; } else if (e.kind === "combo") { an = "combo"; i = t < 0.25 ? 6 : 7; } else { an = "attack"; i = t < 0.25 ? 4 : 5; } }
    else if (st === "soul") { an = "soul"; i = Math.min(4, Math.floor(t / 1.8 * 5)); }
    else if (st === "hurt") { an = "hurt"; i = Math.min(2, Math.floor(t / 0.3 * 3)); }
    else if (st === "stagger") { an = "stagger"; i = Math.min(3, Math.floor(t / 0.75 * 4)); }
    else if (st === "dead") { an = "die"; i = Math.min(6, Math.floor(t * 7)); }
    return F[an][i];
  }
  static draw(cx, e, ox, oy) {
    if (!CK.img.complete || !CK.img.naturalWidth) return; const f = CursedKnight.pick(e), s = CK.S, dead = e.st === "dead", fade = dead ? Math.max(0, 1 - Math.max(0, e.t - 1.4) / 1.0) : 1;
    cx.save(); cx.globalAlpha = fade; cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(ox, oy, 13, 3, 0, 0, 6.283); cx.fill();
    if (e.st === "soul") { const k = Math.min(1, e.t / 0.6), g = cx.createRadialGradient(ox, oy - 22, 4, ox, oy - 22, 40); g.addColorStop(0, `rgba(255,61,79,${0.35 * k})`); g.addColorStop(1, "rgba(255,61,79,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(ox - 44, oy - 66, 88, 88); cx.globalCompositeOperation = "source-over"; }   // red soul aura
    cx.translate(ox, oy + 1); cx.scale(e.face * s, s); cx.drawImage(CK.img, f[0], f[1], f[2], f[3], -f[4], -f[3], f[2], f[3]);
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.45; cx.drawImage(CK.img, f[0], f[1], f[2], f[3], -f[4], -f[3], f[2], f[3]); }
    cx.restore();
    if (e.rw) { const x = ox, y = oy - 2, k = Math.min(1, e.rw.k), a = Math.pow(1 - k, 0.7); cx.save(); for (let j = 0; j < 3; j++) { const R = e.rw.r * (1 - j * 0.2); if (R < 2) continue; cx.globalAlpha = a * (1 - j * 0.3); cx.strokeStyle = "#0c0b11"; cx.lineWidth = 3.2 - j * 0.7; cx.beginPath(); cx.ellipse(x, y, R, R * 0.17, 0, 0, 6.283); cx.stroke(); cx.strokeStyle = j ? "#ff9a6a" : "#ffe1a0"; cx.lineWidth = 1.8 - j * 0.5; cx.stroke(); } cx.restore(); }   // bell wave, same look as the Bell-Ringer's
  }
}
