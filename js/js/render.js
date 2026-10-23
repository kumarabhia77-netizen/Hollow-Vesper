"use strict";
// Everything that draws. Placeholder shapes for now; Milestone 4 swaps in real artwork here.
const Render = {
  init(world) {
    this.cv = document.getElementById("game"); this.cx = this.cv.getContext("2d");
    this.tiles = this.buildTiles(world);
    this.layers = [{ f: 0.12, c: this.layer("#17141d", 6, 90, 150, 7, 215) }, { f: 0.3, c: this.layer("#100e15", 8, 50, 110, 11, 250) }];
    const g = this.cx.createLinearGradient(0, 0, 0, CFG.H); g.addColorStop(0, "#0c0b11"); g.addColorStop(0.7, "#2a1a22"); g.addColorStop(1, "#3b2328");
    this.sky = g;
    this.motes = Array.from({ length: 28 }, (_, i) => ({ x: Math.random() * CFG.W, y: Math.random() * CFG.H, s: 4 + Math.random() * 10 }));
  },
  layer(fill, n, hMin, hMax, seed, base) {   // far gothic spires, repeats every 960 px
    const c = document.createElement("canvas"); c.width = 960; c.height = CFG.H; const x = c.getContext("2d");
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, sp = 960 / n;
    x.fillStyle = fill; x.fillRect(0, base, 960, CFG.H - base);
    for (let i = 0; i < n; i++) { const cx = i * sp + sp / 2, w = sp * 0.5, top = base - (hMin + r() * (hMax - hMin));
      x.beginPath(); x.moveTo(cx - w / 2, CFG.H); x.lineTo(cx - w / 2, top + w * 0.8); x.quadraticCurveTo(cx - w / 2, top + w * 0.2, cx, top);
      x.quadraticCurveTo(cx + w / 2, top + w * 0.2, cx + w / 2, top + w * 0.8); x.lineTo(cx + w / 2, CFG.H); x.fill(); }
    return c;
  },
  buildTiles(w) {   // draw all stone once, reuse every frame
    const c = document.createElement("canvas"); c.width = w.w; c.height = w.h; const x = c.getContext("2d"), T = w.T;
    const hs = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
    for (let ty = 0; ty < w.rows; ty++) for (let tx = 0; tx < w.cols; tx++) {
      if (!w.g[ty][tx]) continue; const h = hs(tx, ty), px = tx * T, py = ty * T;
      x.fillStyle = `hsl(260,8%,${24 + (h % 12)}%)`; x.fillRect(px, py, T, T);
      x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(px, py + T - 1, T, 1); x.fillRect(px + ((ty % 2) ? 8 : 0), py, 1, T - 1);
      if (h % 7 === 0) { x.strokeStyle = "rgba(0,0,0,.5)"; x.beginPath(); x.moveTo(px + 3, py + 2); x.lineTo(px + 7, py + 8); x.lineTo(px + 5, py + 13); x.stroke(); }
      if (!w.solid(tx, ty - 1)) { x.fillStyle = "#5b5560"; x.fillRect(px, py, T, 2); if (h % 3 === 0) { x.fillStyle = "#2f3a2c"; x.fillRect(px, py, T, 3); } }
    }
    return c;
  },
  draw(w, p, es, cam, t) {
    const cx = this.cx, W = CFG.W, H = CFG.H, cm = Math.floor(cam);
    const sh = Fx.shake > 0 ? Fx.shake * 14 : 0;
    cx.save(); cx.translate(Math.round((Math.random() - .5) * sh), Math.round((Math.random() - .5) * sh));
    cx.fillStyle = this.sky; cx.fillRect(-10, -10, W + 20, H + 20);
    for (const l of this.layers) { const ox = -Math.floor((cam * l.f) % 960); cx.drawImage(l.c, ox, 0); cx.drawImage(l.c, ox + 960, 0); }
    cx.drawImage(this.tiles, cm, 0, W, H, 0, 0, W, H);
    for (const e of es) this.enemy(e, cm);
    this.player(p, cm);
    for (const q of Fx.parts) { cx.globalAlpha = Math.min(1, q.life * 3); cx.fillStyle = q.col; cx.fillRect(Math.round(q.x - cm), Math.round(q.y), 2, 2); } cx.globalAlpha = 1;
    // fog, drifting motes, warm light around the player, dark edges
    const f = cx.createLinearGradient(0, 150, 0, H); f.addColorStop(0, "rgba(70,60,85,0)"); f.addColorStop(1, "rgba(70,60,85,.3)"); cx.fillStyle = f; cx.fillRect(0, 150, W, H - 150);
    cx.fillStyle = "rgba(205,160,120,.35)";
    for (const m of this.motes) cx.fillRect(Math.floor(((m.x + t * m.s - cam * 0.5) % W + W) % W), Math.floor((m.y + Math.sin(t + m.s) * 6 + H) % H), 1, 1);
    cx.globalCompositeOperation = "lighter"; const px = p.x + 6 - cm, py = p.y + 10, g = cx.createRadialGradient(px, py, 4, px, py, 95);
    g.addColorStop(0, "rgba(190,105,55,.22)"); g.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = "source-over";
    const v = cx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.65); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.6)"); cx.fillStyle = v; cx.fillRect(0, 0, W, H);
    this.hud(p); if (CFG.debug) this.debug(p, es, cm);
    cx.restore();
  },
  player(p, cm) {
    const cx = this.cx; if (p.inv > 0 && !p.dead && Math.floor(p.t * 18) % 2) return;
    cx.save(); cx.translate(Math.round(p.x + p.w / 2 - cm), Math.round(p.y + p.h)); cx.scale(p.face, 1);
    if (p.dead) cx.rotate(Math.min(1.45, p.deadT * 5));
    const b = p.ground && Math.abs(p.vx) > 10 ? Math.sin(p.t * 16) * 2 : 0, a = CFG.player.atk;
    cx.fillStyle = "#14121a"; cx.fillRect(-4, -5, 3, 5 + b * .5); cx.fillRect(1, -5, 3, 5 - b * .5);
    cx.fillStyle = "#262230"; cx.beginPath(); cx.moveTo(-6, -4); cx.lineTo(-5, -17); cx.quadraticCurveTo(-4, -25, 1, -26); cx.quadraticCurveTo(6, -25, 6, -17); cx.lineTo(7, -4); cx.closePath(); cx.fill();
    cx.fillStyle = "#0b0a0f"; cx.fillRect(0, -23, 5, 5); cx.fillStyle = "#e07a4a"; cx.fillRect(2, -21, 2, 1);
    const ang = p.atk >= 0 ? -1.4 + (p.atk / a.dur) * 2.8 : 0.9;
    cx.save(); cx.translate(3, -13); cx.rotate(ang); cx.fillStyle = "#b9b2a6"; cx.fillRect(0, -1, a.reach - 4, 2); cx.fillStyle = "#5a4a3a"; cx.fillRect(-3, -1, 4, 2); cx.restore();
    if (p.atk >= a.from && p.atk <= a.to) { cx.strokeStyle = "rgba(235,225,205,.75)"; cx.lineWidth = 2; cx.beginPath(); cx.arc(3, -13, a.reach - 6, -1.2, 0.6); cx.stroke(); }
    cx.restore();
  },
  enemy(e, cm) {
    const cx = this.cx, a = e.d.atk; cx.save(); cx.globalAlpha = e.st === "dead" ? Math.max(0, 1 - e.t / 1.2) : 1;
    cx.translate(Math.round(e.x + e.w / 2 - cm), Math.round(e.y + e.h)); cx.scale(e.face, 1);
    if (e.st === "dead") cx.rotate(Math.min(1.4, e.t * 4));
    cx.fillStyle = e.flash > 0 ? "#fff" : e.st === "windup" ? "#8a4a3a" : e.d.color;
    cx.beginPath(); cx.moveTo(-7, 0); cx.lineTo(-8, -12); cx.quadraticCurveTo(-6, -22, 3, -23); cx.lineTo(8, -16); cx.lineTo(6, 0); cx.closePath(); cx.fill();
    const arm = e.st === "windup" ? -1.3 : e.st === "attack" ? 0.2 : 1.2;
    cx.save(); cx.translate(3, -15); cx.rotate(arm); cx.fillRect(0, -2, 14, 3); cx.restore();
    cx.fillStyle = "#e8c070"; cx.fillRect(3, -18, 2, 1);
    if (e.st === "windup") { cx.fillStyle = "#e07a4a"; cx.fillRect(-1, -36, 2, 7); cx.fillRect(-1, -27, 2, 2); }   // warning mark
    cx.restore();
  },
  hud(p) {
    const cx = this.cx;
    for (let i = 0; i < CFG.player.hp; i++) { const x = 14 + i * 14, y = 14; cx.beginPath(); cx.moveTo(x, y - 6); cx.lineTo(x + 5, y); cx.lineTo(x, y + 6); cx.lineTo(x - 5, y); cx.closePath();
      if (i < p.hp) { cx.fillStyle = "#c8553d"; cx.fill(); } cx.strokeStyle = "#8d8374"; cx.lineWidth = 1; cx.stroke(); }
  },
  debug(p, es, cm) {
    const cx = this.cx; cx.lineWidth = 1; const box = (r, c) => { cx.strokeStyle = c; cx.strokeRect(Math.round(r.x - cm) + .5, Math.round(r.y) + .5, r.w, r.h); };
    box(p, "#0f0"); if (p.atk >= CFG.player.atk.from && p.atk <= CFG.player.atk.to) box(p.hitbox(), "#ff0");
    for (const e of es) { box(e, "#f33"); if (e.st === "attack") box(e.hitbox(), "#f80"); }
    cx.fillStyle = "#fff"; cx.font = "8px monospace"; cx.fillText(`hp ${p.hp} x ${Math.round(p.x)} y ${Math.round(p.y)} ground ${p.ground} fps ${Math.round(this.fps || 0)}`, 6, 262);
  }
};
                         
