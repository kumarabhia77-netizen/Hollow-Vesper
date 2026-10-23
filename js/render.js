"use strict";
// Everything that draws. Pictures come from the assets/ folder; swap a PNG to change the look.
const PS = 0.274, FEET = 137, PCELLS = 11;   // player: scale, feet row in the sheet, frames per sheet
const HS = 0.24;                              // husk scale
const HUSK = [[5,48,74,155],[72,51,133,153],[142,40,207,155],[226,35,290,155],[305,3,383,155],[392,56,513,154],[515,51,591,155],[594,64,678,153],[681,86,763,153]];
const TILES = [[9,12],[117,11],[225,11],[333,10],[443,10]];   // stone x3, cracked, moss top
const PROPS = { lantern: [27,16,42,126,1], torch: [108,23,30,103,0], statue: [161,51,69,88,0], rubble: [245,69,112,74,0], barrel: [372,51,61,82,0],
  cage: [534,0,53,140,1], bell: [608,7,89,136,0], banner: [757,0,68,143,1], skull: [838,69,104,74,0], shrine: [953,5,111,138,0] };
const LIT = { torch: 1, lantern: 1, shrine: 1 };
const Render = {
  ready: false,
  err(m) { const b = document.getElementById("err"); b.textContent = m; b.classList.remove("hidden"); },
  init(world) {
    this.cv = document.getElementById("game"); this.cx = this.cv.getContext("2d"); this.cx.imageSmoothingQuality = "high";
    this.img = {}; let n = 0; const names = ["player", "husk", "tiles", "props", "bg_far", "bg_mid", "bg_near"];
    names.forEach(k => { const i = new Image();
      i.onload = () => { if (++n === names.length) { this.tiles = this.buildTiles(world); this.ready = true; } };
      i.onerror = () => this.err("Missing picture: assets/" + k + ".png (check the name and folder)");
      i.src = "assets/" + k + ".png"; this.img[k] = i; });
    const g = this.cx.createLinearGradient(0, 0, 0, CFG.H); g.addColorStop(0, "#0c0b11"); g.addColorStop(1, "#3b2328"); this.sky = g;
    this.motes = Array.from({ length: 28 }, () => ({ x: Math.random() * CFG.W, y: Math.random() * CFG.H, s: 4 + Math.random() * 10 }));
  },
  buildTiles(w) {   // draw all stone once at 2x size, reuse every frame
    const c = document.createElement("canvas"); c.width = w.w * 2; c.height = w.h * 2; const x = c.getContext("2d"), T = w.T * 2, I = this.img.tiles;
    x.imageSmoothingQuality = "high"; const hs = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
    for (let ty = 0; ty < w.rows; ty++) for (let tx = 0; tx < w.cols; tx++) {
      if (w.g[ty][tx] !== 1) continue; const h = hs(tx, ty), top = !w.solid(tx, ty - 1);
      const b = TILES[top ? 4 : (h % 9 === 0 ? 3 : h % 3)]; x.drawImage(I, b[0] + 3, b[1] + 2, 90, 90, tx * T, ty * T, T, T);
    }
    for (const [px, py, pw] of CFG.level.platforms) x.drawImage(I, 9, 302, 196, 47, px * T, py * T, pw * T, T);
    return c;
  },
  loop(img, sc, f, y, cam, a) {   // repeating background, every second copy mirrored so no seam shows
    const cx = this.cx, w = img.width * sc, h = img.height * sc, off = cam * f; cx.globalAlpha = a || 1;
    for (let k = Math.floor(off / w); k * w - off < CFG.W; k++) { const x = Math.floor(k * w - off);
      if (((k % 2) + 2) % 2) { cx.save(); cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(img, 0, 0, w, h); cx.restore(); } else cx.drawImage(img, x, y, w, h); }
    cx.globalAlpha = 1;
  },
  draw(w, p, es, cam, t) {
    const cx = this.cx, W = CFG.W, H = CFG.H, cm = Math.floor(cam), sh = Fx.shake > 0 ? Fx.shake * 14 : 0;
    cx.setTransform(2, 0, 0, 2, 0, 0); cx.save(); cx.translate(Math.round((Math.random() - .5) * sh), Math.round((Math.random() - .5) * sh));
    cx.fillStyle = this.sky; cx.fillRect(-10, -10, W + 20, H + 20);
    this.loop(this.img.bg_far, 0.5, 0.12, 0, cam); this.loop(this.img.bg_mid, 1.6, 0.3, H - 128 * 1.6, cam); this.loop(this.img.bg_near, 1.6, 0.55, H - 166 * 1.6, cam, 0.55);
    const lights = []; this.props(cm, t, lights);
    cx.drawImage(this.tiles, cm * 2, 0, W * 2, H * 2, 0, 0, W, H);
    for (const e of es) this.enemy(e, cm);
    this.player(p, cm);
    for (const q of Fx.parts) { cx.globalAlpha = Math.min(1, q.life * 3); cx.fillStyle = q.col; cx.fillRect(Math.round(q.x - cm), Math.round(q.y), 2, 2); } cx.globalAlpha = 1;
    const f = cx.createLinearGradient(0, 150, 0, H); f.addColorStop(0, "rgba(70,60,85,0)"); f.addColorStop(1, "rgba(70,60,85,.3)"); cx.fillStyle = f; cx.fillRect(0, 150, W, H - 150);
    cx.fillStyle = "rgba(205,160,120,.35)";
    for (const m of this.motes) cx.fillRect(Math.floor(((m.x + t * m.s - cam * 0.5) % W + W) % W), Math.floor((m.y + Math.sin(t + m.s) * 6 + H) % H), 1, 1);
    cx.globalCompositeOperation = "lighter";
    lights.push([p.x + 6 - cm, p.y + 10, 95, 0.2]);
    for (const [lx, ly, r, a] of lights) { const g = cx.createRadialGradient(lx, ly, 3, lx, ly, r); g.addColorStop(0, `rgba(200,110,55,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = g; cx.fillRect(lx - r, ly - r, r * 2, r * 2); }
    cx.globalCompositeOperation = "source-over";
    const v = cx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.65); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)"); cx.fillStyle = v; cx.fillRect(0, 0, W, H);
    this.hud(p); if (CFG.debug) this.debug(p, es, cm);
    cx.restore();
  },
  props(cm, t, lights) {
    const cx = this.cx, I = this.img.props, s = 0.28, gy = CFG.level.ground * CFG.T;
    for (const [name, col] of CFG.level.props) { const b = PROPS[name], x = col * CFG.T - cm, w = b[2] * s, h = b[3] * s; if (x < -w || x > CFG.W) continue;
      const y = b[4] ? 0 : gy - h + 1; cx.drawImage(I, b[0], b[1], b[2], b[3], Math.round(x), Math.round(y), w, h);
      if (LIT[name]) lights.push([x + w / 2, y + h * 0.35, 55 + Math.sin(t * 9 + col) * 4, 0.16]); }
  },
  player(p, cm) {
    const cx = this.cx, A = this.img.player, cw = A.width / PCELLS, a = CFG.player.atk; if (p.inv > 0 && !p.dead && Math.floor(p.t * 18) % 2) return;
    let f = 0;
    if (p.dead) f = 10; else if (p.hurt > 0) f = 9; else if (p.atk >= 0) f = 6 + Math.min(2, Math.floor(p.atk / a.dur * 3));
    else if (!p.ground) f = p.vy < 0 ? 4 : 5; else if (Math.abs(p.vx) > 10) f = 1 + Math.floor(p.t * 10) % 3;
    cx.save(); cx.translate(Math.round(p.x + p.w / 2 - cm), Math.round(p.y + p.h)); cx.scale(p.face, 1);
    cx.drawImage(A, f * cw, 0, cw, A.height, -cw * PS / 2, -FEET * PS, cw * PS, A.height * PS); cx.restore();
  },
  enemy(e, cm) {
    const cx = this.cx, A = this.img.husk; let f;
    switch (e.st) { case "patrol": case "chase": f = Math.floor(e.t * 6) % 3; break; case "windup": f = e.t < .15 ? 3 : 4; break;
      case "attack": f = 5; break; case "recover": f = 6; break; case "hurt": f = 7; break; default: f = 8; }
    const b = HUSK[f], bw = b[2] - b[0], bh = b[3] - b[1];
    cx.save(); cx.globalAlpha = e.st === "dead" ? Math.max(0, 1 - e.t / 1.2) : 1;
    cx.translate(Math.round(e.x + e.w / 2 - cm), Math.round(e.y + e.h)); cx.scale(e.face, 1);
    cx.drawImage(A, b[0], b[1], bw, bh, -bw * HS / 2, -bh * HS + 1, bw * HS, bh * HS);
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.6; cx.drawImage(A, b[0], b[1], bw, bh, -bw * HS / 2, -bh * HS + 1, bw * HS, bh * HS); }
    cx.restore();
    if (e.st === "windup") { cx.fillStyle = "#e07a4a"; const x = Math.round(e.x + e.w / 2 - cm); cx.fillRect(x - 1, e.y - 14, 2, 7); cx.fillRect(x - 1, e.y - 5, 2, 2); }   // warning mark
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
