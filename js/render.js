"use strict";
// Everything that draws. Pictures come from the assets/ folder; swap a PNG to change the look.
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
      i.onload = () => { if (++n === names.length) { this.tiles = this.buildTiles(world); this.shadow = this.tint(this.img.player, "#0c0b11"); this.rim = this.tint(this.img.player, "#d9cfbd"); this.ready = true; } };
      i.onerror = () => this.err("Missing picture: assets/" + k + ".png (check the name and folder)");
      i.src = "assets/" + k + ".png"; this.img[k] = i; });
    const g = this.cx.createLinearGradient(0, 0, 0, CFG.H); g.addColorStop(0, "#0c0b11"); g.addColorStop(1, "#3b2328"); this.sky = g;
    this.motes = Array.from({ length: 28 }, () => ({ x: Math.random() * CFG.W, y: Math.random() * CFG.H, s: 4 + Math.random() * 10 }));
  },
  tint(img, col) {   // same picture filled with one flat colour: used for the dodge shadow
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d");
    x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c;
  },
  buildTiles(w) {   // draw all stone once at 2x size, reuse every frame
    const c = document.createElement("canvas"); c.width = w.w * 2; c.height = w.h * 2; const x = c.getContext("2d"), T = w.T * 2, I = this.img.tiles;
    x.imageSmoothingQuality = "high"; const hs = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
    for (let ty = 0; ty < w.rows; ty++) for (let tx = 0; tx < w.cols; tx++) {
      if (w.g[ty][tx] !== 1) continue; const h = hs(tx, ty), top = !w.solid(tx, ty - 1);
      const k = top ? 4 : (h % 9 === 0 ? 3 : h % 3), cw = TILESHEET.cw, ch = TILESHEET.ch; x.drawImage(I, k * cw + 4, 4, cw - 8, ch - 8, tx * T, ty * T, T, T);
      x.fillStyle = `rgba(0,0,0,${(h % 7) * 0.025})`; x.fillRect(tx * T, ty * T, T, T);   // each stone a little different
      if (!top && w.solid(tx, ty - 1)) { const gr = x.createLinearGradient(0, ty * T, 0, ty * T + T * 0.7); gr.addColorStop(0, "rgba(0,0,0,.4)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(tx * T, ty * T, T, T * 0.7); }
    }
    for (const [px, py, pw] of CFG.level.platforms) { for (let i = 0; i < pw; i++) x.drawImage(I, 10 * TILESHEET.cw + 4, 4, TILESHEET.cw - 8, TILESHEET.ch - 8, (px + i) * T, py * T, T, T);
      const gr = x.createLinearGradient(0, (py + 1) * T, 0, (py + 1) * T + T * 0.9); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(px * T, (py + 1) * T, pw * T, T * 0.9); }
    return c;
  },
  loop(img, sc, f, y, cam, a) {   // repeating background, every second copy mirrored so no seam shows
    const cx = this.cx, w = img.width * sc, h = img.height * sc, off = cam * f; cx.globalAlpha = a || 1;
    for (let k = Math.floor(off / w); k * w - off < CFG.W; k++) { const x = Math.floor(k * w - off);
      if (((k % 2) + 2) % 2) { cx.save(); cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(img, 0, 0, w, h); cx.restore(); } else cx.drawImage(img, x, y, w, h); }
    cx.globalAlpha = 1;
  },
  draw(w, p, es, cam, t) {
    const cx = this.cx, W = CFG.W, H = CFG.H, cm = Math.floor(cam), sh = Fx.shake > 0 && Fx.shakeOn ? Fx.shake * 14 : 0;
    cx.setTransform(2, 0, 0, 2, 0, 0); cx.save(); cx.translate(Math.round((Math.random() - .5) * sh), Math.round((Math.random() - .5) * sh));
    cx.fillStyle = this.sky; cx.fillRect(-10, -10, W + 20, H + 20);
    this.loop(this.img.bg_far, 0.5, 0.12, 0, cam); this.loop(this.img.bg_mid, 1.6, 0.3, H - 128 * 1.6, cam); this.loop(this.img.bg_near, 1.6, 0.55, H - 166 * 1.6, cam, 0.55);
    const lights = []; this.props(cm, t, lights);
    cx.drawImage(this.tiles, cm * 2, 0, W * 2, H * 2, 0, 0, W, H);
    for (const e of es) if (e.alive()) this.shade(e.x + e.w / 2 - cm, e.y + e.h, 9);
    if (p.ground && !p.dead) this.shade(p.x + p.w / 2 - cm, p.y + p.h, 8);
    for (const e of es) this.enemy(e, cm);
    this.ghosts(cm); this.player(p, cm);
    for (const q of Fx.parts) { cx.globalAlpha = Math.min(1, q.life * 3); cx.fillStyle = q.col; cx.fillRect(Math.round(q.x - cm), Math.round(q.y), q.s || 2, q.s || 2); } cx.globalAlpha = 1;
    const f = cx.createLinearGradient(0, 150, 0, H); f.addColorStop(0, "rgba(91,85,96,0)"); f.addColorStop(1, "rgba(91,85,96,.3)"); cx.fillStyle = f; cx.fillRect(0, 150, W, H - 150);
    for (let i = 0; i < 3; i++) { const fx = ((t * (6 + i * 4) + i * 190 - cam * (0.25 + i * 0.1)) % (W + 360) + W + 360) % (W + 360) - 180, fy = H - 50 - i * 26;
      const g = cx.createRadialGradient(fx, fy, 4, fx, fy, 130); g.addColorStop(0, "rgba(154,146,142,.09)"); g.addColorStop(1, "rgba(154,146,142,0)"); cx.fillStyle = g; cx.fillRect(fx - 130, fy - 60, 260, 120); }   // drifting mist
    cx.fillStyle = "rgba(217,207,189,.3)";
    for (const m of this.motes) cx.fillRect(Math.floor(((m.x + t * m.s - cam * 0.5) % W + W) % W), Math.floor((m.y + Math.sin(t + m.s) * 6 + H) % H), 1, 1);
    cx.globalCompositeOperation = "lighter";
    lights.push([p.x + 6 - cm, p.y + 10, 95, 0.2]);
    for (const [lx, ly, r, a] of lights) { const g = cx.createRadialGradient(lx, ly, 3, lx, ly, r); g.addColorStop(0, `rgba(200,85,61,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = g; cx.fillRect(lx - r, ly - r, r * 2, r * 2); }
    cx.globalCompositeOperation = "source-over";
    const v = cx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.65); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)"); cx.fillStyle = v; cx.fillRect(0, 0, W, H);
    if (p.hurt > 0 && !p.dead) { cx.fillStyle = `rgba(107,29,36,${Math.min(0.45, p.hurt * 1.8)})`; cx.fillRect(0, 0, W, H); }   // brief dried-blood flash when hurt
    this.hud(p); if (CFG.debug) this.debug(p, es, cm);
    cx.restore();
  },
  props(cm, t, lights) {
    const cx = this.cx, I = this.img.props, s = 0.28, gy = CFG.level.ground * CFG.T;
    for (const [name, col] of CFG.level.props) { const b = PROPS[name], x = col * CFG.T - cm, w = b[2] * s, h = b[3] * s; if (x < -w || x > CFG.W) continue;
      const y = b[4] ? 0 : gy - h + 1; cx.drawImage(I, b[0], b[1], b[2], b[3], Math.round(x), Math.round(y), w, h);
      if (LIT[name]) lights.push([x + w / 2, y + h * 0.35, 55 + Math.sin(t * 9 + col) * 4, 0.16]); }
  },
  shade(x, y, r) { const cx = this.cx; cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(Math.round(x), y, r, 2.5, 0, 0, 6.283); cx.fill(); },
  ghosts(cm) {   // rings (dodge start, hit flash) and the dodge shadow copies: dark with a bone rim so they show on any background
    const cx = this.cx, H = ANIMS.player, s = H.scale, f = H.dash.frames[1];
    for (const r of Fx.rings) { const k = 1 - r.life / r.d; cx.globalAlpha = (1 - k) * 0.8; cx.strokeStyle = r.c; cx.lineWidth = 1.5;
      cx.beginPath(); cx.ellipse(Math.round(r.x - cm), r.y, r.r + k * r.g, r.r * 2 + k * r.g * 0.5, 0, 0, 6.283); cx.stroke(); }
    for (const g of Fx.ghosts) { const a = Math.min(0.85, g.life * 3), w = f[2] * s, h = f[3] * s;
      cx.save(); cx.translate(Math.round(g.x + 6 - cm), Math.round(g.y + 26)); cx.scale(g.face, 1);
      cx.globalAlpha = a * 0.55; cx.drawImage(this.rim, f[0], f[1], f[2], f[3], -f[4] * s - 1, -h * 1.04 + 1, w * 1.06, h * 1.04);
      cx.globalAlpha = a; cx.drawImage(this.shadow, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); cx.restore(); }
    cx.globalAlpha = 1;
  },
  player(p, cm) {   // pick the animation and frame from what the Warden is doing
    const cx = this.cx, A = this.img.player, H = ANIMS.player, s = H.scale, a = CFG.player.atk; if (p.inv > 0 && p.dodge < 0 && !p.dead && Math.floor(p.t * 18) % 2) return;
    let an = "idle", i = 0;
    if (p.dead) { an = "death"; i = Math.min(4, Math.floor(p.deadT * 8)); }
    else if (p.hurt > 0) { an = "hurt"; i = p.hurt > 0.12 ? 0 : 1; }
    else if (p.dodge >= 0) { an = "dash"; i = Math.min(2, Math.floor(p.dodge / CFG.player.dodge.dur * 3)); }
    else if (p.atk >= 0) { an = "sword"; const t = p.atk, e = a.to + 0.04;
      i = t < a.from ? Math.floor(t / a.from * 3) : t < e ? 3 + Math.floor((t - a.from) / (e - a.from) * 2) : 5 + Math.min(4, Math.floor((t - e) / (a.dur - e) * 5)); }
    else if (!p.ground) { an = "jump"; i = p.vy < -250 ? 1 : p.vy < -80 ? 2 : p.vy < 80 ? 3 : 4; }
    else if (p.landT > 0) { an = "jump"; i = 5; }
    else if (Math.abs(p.vx) > 10) { an = "run"; i = Math.floor(p.t * H.run.fps) % 6; }
    else i = Math.floor(p.t * H.idle.fps) % 7;
    const f = H[an].frames[i], h = f[3] * s;
    cx.save(); cx.translate(Math.round(p.x + p.w / 2 - cm), Math.round(p.y + p.h)); cx.scale(p.face, 1);
    cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, f[2] * s, h);
    if (an === "sword" && p.atk >= a.from && p.atk < a.to + 0.1) {   // slash VFX: bone-coloured crescent that follows the real hit window
      const k = (p.atk - a.from) / (a.to + 0.1 - a.from), sw = Math.min(1, k * 1.5 + 0.3);
      cx.globalAlpha = 1 - k * k; cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 3 - 2 * k; cx.beginPath(); cx.arc(0, -13, a.reach - 4 + k * 5, -1.15, -1.15 + 2 * sw); cx.stroke();
      cx.lineWidth = 1; cx.beginPath(); cx.arc(0, -13, a.reach + 1 + k * 5, -1.0, -1.0 + 1.6 * sw); cx.stroke(); }
    cx.restore();
  },
  enemy(e, cm) {   // pick the animation and frame that match the enemy's state
    const cx = this.cx, A = this.img.husk, H = ANIMS.husk, d = e.d, s = H.scale; let an = "walk", i = 0;
    const pick = (n, t, dur) => Math.min(n - 1, Math.floor(t / dur * n));
    switch (e.st) {
      case "patrol": an = "walk"; break;
      case "chase": an = Math.abs(e.vx) < 1 ? "idle" : "walk"; break;
      case "notice": an = "notice"; i = pick(3, e.t, d.notice); break;
      case "windup": an = "windup"; i = pick(4, e.t, d.atk.windup); break;
      case "attack": an = "attack"; i = e.t < 0.04 ? 0 : 1; break;
      case "recover": an = "recover"; i = pick(3, e.t, d.atk.recover); break;
      case "hurt": an = "hurt"; i = pick(2, e.t, 0.3); break;
      default: an = "death"; i = Math.min(6, Math.floor(e.t * 8));
    }
    const a = H[an]; if (an === "walk" || an === "idle") i = Math.floor(e.t * a.fps) % a.frames.length;
    const f = a.frames[i], w = f[2] * s, h = f[3] * s;
    cx.save(); cx.globalAlpha = e.st === "dead" ? Math.max(0, Math.min(1, 1 - (e.t - 1) / 0.6)) : 1;
    cx.translate(Math.round(e.x + e.w / 2 - cm), Math.round(e.y + e.h)); cx.scale(e.face, 1);
    cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h);
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.6; cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); }
    cx.restore();
    if (e.st === "windup") { cx.fillStyle = "#c8553d"; const x = Math.round(e.x + e.w / 2 - cm); cx.fillRect(x - 1, e.y - 40, 2, 7); cx.fillRect(x - 1, e.y - 31, 2, 2); }   // warning mark
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
