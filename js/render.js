"use strict";
(window.HV_V = window.HV_V || {}).render = 10;
// Everything that draws. Pictures come from the assets/ folder; swap a PNG to change the look.
function propBox(name, col) {   // where a prop sits in the world (shared by drawing and effects)
  const p = PROPS[name], h = p.h, w = p.r[2] * h / p.r[3];
  return { x: col * CFG.T, y: p.hang ? CFG.CAMY + (p.chain ? 18 + (col * 7) % 24 : 0) : CFG.level.ground * CFG.T - h + 1, w, h };
}
const Render = {
  ready: false,
  err(m) { const b = document.getElementById("err"); b.textContent = m; b.classList.remove("hidden"); },
  init(world) {
    this.cv = document.getElementById("game"); this.cx = this.cv.getContext("2d"); this.cx.imageSmoothingQuality = "high";
    this.img = {}; let n = 0; const names = ["player", "player_s", "husk", "husk_b", "husk_m", "tiles", "props", "bg_far", "vfx", "ui_status"];
    names.forEach(k => { const i = new Image();
      i.onload = () => { if (++n === names.length) { this.tiles = this.buildTiles(world); this.shadow = this.tint(this.img.player, "#0c0b11"); this.rim = this.tint(this.img.player, "#d9cfbd"); this.mid = this.arcade({ pw: 480, bay: 120, colW: 15, spring: 92, apex: 26, floor: 152, win: true, rose: true, seed: 11, dark: 0.3, rib: "#2a2630" }); this.near = this.arcade({ pw: 480, bay: 160, colW: 20, spring: 78, apex: 8, floor: 152, win: false, rose: false, seed: 5, dark: 0.55, rib: "#1a1820" }); this.ready = true; } };
      i.onerror = () => this.err("Missing picture: assets/" + k + ".png (check the name and folder)");
      i.src = (typeof ASSET_DATA !== "undefined" && ASSET_DATA[k]) || "assets/" + k + ".png"; this.img[k] = i; });
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
    for (const [px, py, pw] of CFG.level.platforms) { const q = PROPS["ledge" + ((px + py) % 4)].r, lw = pw * T + 8, lh = q[3] * lw / q[2]; x.drawImage(this.img.props, q[0], q[1], q[2], q[3], px * T - 4, py * T - 1, lw, lh);   // hanging stone-and-wood ledge
      const gr = x.createLinearGradient(0, (py + 1) * T, 0, (py + 1) * T + T * 0.9); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(px * T, (py + 1) * T, pw * T, T * 0.9); }
    return c;
  },
  arcade(o) {   // procedural gothic nave: clustered columns, pointed arches, lancet windows, rose windows, hanging chains. Tiles every o.pw pixels.
    const S = 2, PW = o.pw, c = document.createElement("canvas"); c.width = PW * S; c.height = CFG.H * S; const x = c.getContext("2d"); x.scale(S, S);
    const I = this.img.tiles, tw = TILESHEET.cw, th = TILESHEET.ch, pc = document.createElement("canvas"); pc.width = pc.height = 48; pc.getContext("2d").drawImage(I, 4, 4, tw - 8, th - 8, 0, 0, 48, 48);
    const pat = x.createPattern(pc, "repeat"), n = Math.round(PW / o.bay); let sd = o.seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const bays = []; for (let i = 0; i < n; i++) bays.push({ chain: 18 + rnd() * 34, lamp: rnd() > 0.6, crack: rnd(), moss: rnd() });
    const { bay, colW, spring, apex, floor } = o;
    const draw = off => { for (let i = 0; i < n; i++) { const b = bays[i], pi = off + i * bay, pj = pi + bay, cx = pi + bay / 2, rise = spring - apex;
      if (o.win) {   // lancet window (or rose window in every second bay) glowing dried-blood and ember
        if (i % 2) { const ry = spring - 22; const g = x.createRadialGradient(cx, ry, 2, cx, ry, 20); g.addColorStop(0, "rgba(200,85,61,.9)"); g.addColorStop(0.6, "rgba(107,29,36,.85)"); g.addColorStop(1, "rgba(42,38,48,.9)");
          x.fillStyle = g; x.beginPath(); x.arc(cx, ry, 19, 0, 6.283); x.fill(); x.strokeStyle = "#0c0b11"; x.lineWidth = 2.5; x.stroke(); x.lineWidth = 1;
          for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; x.beginPath(); x.moveTo(cx + Math.cos(t) * 4, ry + Math.sin(t) * 4); x.lineTo(cx + Math.cos(t) * 19, ry + Math.sin(t) * 19); x.stroke(); }
          x.beginPath(); x.arc(cx, ry, 9, 0, 6.283); x.stroke(); }
        else { const ww = bay * 0.2, wt = apex + 14, wb = spring + 24; const g = x.createLinearGradient(0, wt, 0, wb); g.addColorStop(0, "rgba(107,29,36,.95)"); g.addColorStop(0.5, "rgba(200,85,61,.6)"); g.addColorStop(1, "rgba(42,38,48,.25)");
          x.fillStyle = g; x.beginPath(); x.moveTo(cx - ww / 2, wb); x.lineTo(cx - ww / 2, wt + ww * 0.9); x.quadraticCurveTo(cx - ww / 2, wt + ww * 0.2, cx, wt); x.quadraticCurveTo(cx + ww / 2, wt + ww * 0.2, cx + ww / 2, wt + ww * 0.9); x.lineTo(cx + ww / 2, wb); x.closePath(); x.fill();
          x.strokeStyle = "#0c0b11"; x.lineWidth = 2; x.stroke(); x.lineWidth = 1; x.beginPath(); x.moveTo(cx, wt + 3); x.lineTo(cx, wb); x.moveTo(cx - ww / 2, wt + ww * 1.4); x.lineTo(cx + ww / 2, wt + ww * 1.4); x.stroke(); } }
      const arch = () => { x.beginPath(); x.moveTo(pi, spring); x.bezierCurveTo(pi, spring - rise * 0.55, cx - bay * 0.12, apex + rise * 0.12, cx, apex); x.bezierCurveTo(cx + bay * 0.12, apex + rise * 0.12, pj, spring - rise * 0.55, pj, spring); };
      arch(); x.strokeStyle = o.rib; x.lineWidth = 7; x.stroke(); x.save(); x.translate(-1, -1); arch(); x.strokeStyle = "rgba(217,207,189,.3)"; x.lineWidth = 1.4; x.stroke(); x.restore();   // light from above-left
      x.strokeStyle = "#5b5560"; x.lineWidth = 0.8; x.save(); x.translate(0, 4); arch(); x.stroke(); x.restore();
      x.strokeStyle = "#5b5560"; x.lineWidth = 0.7; x.beginPath(); x.moveTo(cx, apex); x.lineTo(cx, apex + 14 + b.chain); x.stroke();   // hanging chain
      for (let y = apex + 16; y < apex + 14 + b.chain; y += 4) { x.beginPath(); x.ellipse(cx, y, 1.2, 2, 0, 0, 6.283); x.stroke(); }
      if (b.lamp) { const ly = apex + 14 + b.chain; x.fillStyle = "#2a2630"; x.fillRect(cx - 3, ly, 6, 7); x.fillStyle = "rgba(200,85,61,.9)"; x.fillRect(cx - 1, ly + 2, 2, 3); }
      const cxp = pi; x.fillStyle = pat; x.fillRect(cxp - colW / 2, spring, colW, floor - spring);   // column shaft in the same stone as the floor
      let g = x.createLinearGradient(cxp - colW / 2, 0, cxp + colW / 2, 0); g.addColorStop(0, "rgba(217,207,189,.22)"); g.addColorStop(0.45, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(12,11,17,.7)"); x.fillStyle = g; x.fillRect(cxp - colW / 2, spring, colW, floor - spring);
      x.fillStyle = "#2a2630"; x.fillRect(cxp - colW / 2 - 3, spring, 3, floor - spring); x.fillRect(cxp + colW / 2, spring, 3, floor - spring);
      x.fillStyle = "#5b5560"; x.fillRect(cxp - colW / 2 - 4, spring - 7, colW + 8, 8); x.fillStyle = "rgba(217,207,189,.35)"; x.fillRect(cxp - colW / 2 - 4, spring - 7, colW + 8, 1);   // capital
      x.fillStyle = "#5b5560"; x.fillRect(cxp - colW / 2 - 4, floor - 9, colW + 8, 9); x.fillStyle = "rgba(12,11,17,.5)"; x.fillRect(cxp - colW / 2 - 4, floor - 3, colW + 8, 3);   // base
      g = x.createLinearGradient(0, floor - 30, 0, floor); g.addColorStop(0, "rgba(47,58,44,0)"); g.addColorStop(1, `rgba(47,58,44,${0.35 + b.moss * 0.3})`); x.fillStyle = g; x.fillRect(cxp - colW / 2, floor - 30, colW, 30);   // damp moss
      x.strokeStyle = "rgba(12,11,17,.6)"; x.lineWidth = 0.8; x.beginPath(); const cy = spring + 14 + b.crack * 36; x.moveTo(cxp - colW / 2 + 2, cy); x.lineTo(cxp, cy + 5); x.lineTo(cxp - 2, cy + 11); x.stroke(); } };
    for (const off of [-PW, 0, PW]) draw(off);
    x.globalCompositeOperation = "source-atop"; x.fillStyle = `rgba(12,11,17,${o.dark})`; x.fillRect(0, 0, PW, CFG.H);
    return c;
  },
  loop(img, sc, f, y, cam, a, nm) {   // repeating background, every second copy mirrored so no seam shows
    const cx = this.cx, w = img.width * sc, h = img.height * sc, off = cam * f; cx.globalAlpha = a || 1;
    for (let k = Math.floor(off / w); k * w - off < CFG.W; k++) { const x = Math.floor(k * w - off);
      if (!nm && ((k % 2) + 2) % 2) { cx.save(); cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(img, 0, 0, w, h); cx.restore(); } else cx.drawImage(img, x, y, w, h); }
    cx.globalAlpha = 1;
  },
  draw(w, p, es, cam, t) {
    const cx = this.cx, W = CFG.W, H = CFG.H, Y = CFG.CAMY, cm = Math.floor(cam), sh = Fx.shake > 0 && Fx.shakeOn ? Fx.shake * 8 : 0;
    cx.setTransform(3, 0, 0, 3, 0, 0); cx.save(); cx.translate(Math.round((Math.random() - .5) * sh), Math.round((Math.random() - .5) * sh));
    cx.fillStyle = this.sky; cx.fillRect(-10, -10, W + 20, H + 20);
    const gy = CFG.level.ground * CFG.T - Y;
    this.loop(this.img.bg_far, H / this.img.bg_far.height, 0.1, 0, cam);
    this.loop(this.mid, 0.5, 0.3, 0, cam, 0.95, true);
    cx.globalCompositeOperation = "lighter";   // slow shafts of dim light from the windows
    for (let i = 0; i < 3; i++) { const bx = ((i * 170 - cam * 0.3 + Math.sin(t * 0.2 + i) * 6) % (W + 120) + W + 120) % (W + 120) - 60, g = cx.createLinearGradient(bx, 0, bx + 40, H * 0.8); g.addColorStop(0, "rgba(200,85,61,.07)"); g.addColorStop(1, "rgba(200,85,61,0)");
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx + 16, 0); cx.lineTo(bx + 62, H * 0.85); cx.lineTo(bx + 26, H * 0.85); cx.closePath(); cx.fill(); }
    cx.globalCompositeOperation = "source-over"; this.loop(this.near, 0.5, 0.55, 0, cam, 0.85, true);
    cx.drawImage(this.tiles, cm * 2, Y * 2, W * 2, H * 2, 0, 0, W, H);
    cx.save(); cx.translate(0, -Y);
    const lights = []; this.props(cm, t, lights, w); this.world(w, cm, t);
    for (const e of es) if (e.alive() && !e.chime) this.shade(e.x + e.w / 2 - cm, e.y + e.h, e.boss ? 16 : 9);
    if (p.ground && !p.dead) this.shade(p.x + p.w / 2 - cm, p.y + p.h, 8);
    for (const e of es) this.enemy(e, cm);
    for (const v of Fx.waves) { cx.globalAlpha = Math.min(1, v.life); cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.ellipse(v.x - cm, v.y - 4, 7, 5, 0, 0, 6.283); cx.fill(); cx.fillStyle = "#c8553d"; cx.beginPath(); cx.ellipse(v.x - cm, v.y - 4, 4, 3, 0, 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
    this.ghosts(cm); this.player(p, cm); this.drawFx(cm);
    for (const q of Fx.parts) { cx.globalAlpha = Math.min(1, q.life * 3); cx.fillStyle = q.col; cx.fillRect(Math.round(q.x - cm), Math.round(q.y), q.s || 2, q.s || 2); } cx.globalAlpha = 1;
    cx.restore();
    const f = cx.createLinearGradient(0, 90, 0, H); f.addColorStop(0, "rgba(91,85,96,0)"); f.addColorStop(1, "rgba(91,85,96,.3)"); cx.fillStyle = f; cx.fillRect(0, 90, W, H - 90);
    for (let i = 0; i < 3; i++) { const fx = ((t * (6 + i * 4) + i * 130 - cam * (0.25 + i * 0.1)) % (W + 240) + W + 240) % (W + 240) - 120, fy = H - 24 - i * 16;
      const g = cx.createRadialGradient(fx, fy, 3, fx, fy, 90); g.addColorStop(0, "rgba(154,146,142,.09)"); g.addColorStop(1, "rgba(154,146,142,0)"); cx.fillStyle = g; cx.fillRect(fx - 90, fy - 45, 180, 90); }
    cx.fillStyle = "rgba(217,207,189,.3)";
    for (const m of this.motes) cx.fillRect(Math.floor(((m.x + t * m.s - cam * 0.5) % W + W) % W), Math.floor((m.y + Math.sin(t + m.s) * 4 + H) % H), 1, 1);
    cx.globalCompositeOperation = "lighter"; lights.push([p.x + 6 - cm, p.y + 10, 70, 0.2]);
    for (const [lx, ly0, r, a] of lights) { const ly = ly0 - Y, g = cx.createRadialGradient(lx, ly, 2, lx, ly, r); g.addColorStop(0, `rgba(200,85,61,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = g; cx.fillRect(lx - r, ly - r, r * 2, r * 2); }
    cx.globalCompositeOperation = "source-over";
    const v = cx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.65); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.55)"); cx.fillStyle = v; cx.fillRect(0, 0, W, H);
    if (Fx.flash > 0) { cx.fillStyle = `rgba(217,207,189,${Math.min(0.5, Fx.flash * 1.6)})`; cx.fillRect(0, 0, W, H); }   // lightning flash
    if (p.hurt > 0 && !p.dead) { cx.fillStyle = `rgba(107,29,36,${Math.min(0.45, p.hurt * 1.8)})`; cx.fillRect(0, 0, W, H); }
    this.hud(p, es); if (CFG.debug) this.debug(p, es, cm);
    cx.restore();
  },
  world(w, cm, t) {   // pit, hidden bridge (appears when the bell rings), boss gate
    const cx = this.cx, T = CFG.T, L = CFG.level, gy = L.ground * T, I = this.img.tiles, cw = TILESHEET.cw, ch = TILESHEET.ch;
    const g = cx.createLinearGradient(0, gy, 0, gy + 50); g.addColorStop(0, "rgba(12,11,17,.25)"); g.addColorStop(1, "rgba(12,11,17,1)"); cx.fillStyle = g; cx.fillRect(L.pit[0] * T - cm, gy, L.pit[1] * T, 60);
    if (w.bridge) { const a = Math.min(1, w.bridgeT / 1.2); cx.globalAlpha = a;
      for (let i = 0; i < L.bridge[1]; i++) cx.drawImage(I, 3 * cw + 4, 4, cw - 8, ch - 8, (L.bridge[0] + i) * T - cm, gy, T, T);
      cx.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 4)); cx.fillStyle = "#c8553d"; cx.fillRect(L.bridge[0] * T - cm, gy, L.bridge[1] * T, 1); cx.globalAlpha = 1; }
    if (w.gate) { const q = PROPS.gate.r; cx.drawImage(this.img.props, q[0], q[1], q[2], q[3], L.gate[0] * T - cm - 3, L.gate[1] * T, 22, L.gate[2] * T); }
  },
  props(cm, t, lights, w) {
    const cx = this.cx, I = this.img.props;
    for (const [name, col] of CFG.level.props) { const b = propBox(name, col), p = PROPS[name], x = b.x - cm; if (x < -b.w || x > CFG.W) continue;
      if (p.chain) { cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.8; cx.beginPath(); cx.moveTo(Math.round(x + b.w / 2) + 0.5, CFG.CAMY); cx.lineTo(Math.round(x + b.w / 2) + 0.5, b.y + 2); cx.stroke(); }
      const on = name !== "shrine" || w.shrines.has(col); cx.globalAlpha = on ? 1 : 0.6; cx.drawImage(I, p.r[0], p.r[1], p.r[2], p.r[3], Math.round(x), Math.round(b.y), b.w, b.h); cx.globalAlpha = 1;
      if (p.lit !== undefined && on) lights.push([x + b.w / 2, b.y + b.h * p.lit, (name === "shrine" ? 60 : 42) + Math.sin(t * 9 + col) * 3, name === "shrine" ? 0.22 : 0.16]); }
  },
  shade(x, y, r) { const cx = this.cx; cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(Math.round(x), y, r, 2.5, 0, 0, 6.283); cx.fill(); },
  ghosts(cm) {   // rings (dodge start) and the dodge shadow copies: dark with a bone rim so they show on any background
    const cx = this.cx, D = ANIMS.player.dash, s = D.scale;
    for (const r of Fx.rings) { const k = 1 - r.life / r.d; cx.globalAlpha = (1 - k) * 0.8; cx.strokeStyle = r.c; cx.lineWidth = 1.5;
      cx.beginPath(); cx.ellipse(Math.round(r.x - cm), r.y, r.r + k * r.g, r.r * 2 + k * r.g * 0.5, 0, 0, 6.283); cx.stroke(); }
    for (const g of Fx.ghosts) { const f = D.frames[g.f === undefined ? 1 : g.f], a = Math.min(0.8, g.life * 2.2), w = f[2] * s, h = f[3] * s;
      cx.save(); cx.translate(Math.round(g.x + 6 - cm), Math.round(g.y + 26)); cx.scale(g.face, 1);
      cx.globalAlpha = a * 0.55; cx.drawImage(this.rim, f[0], f[1], f[2], f[3], -f[4] * s - 1, -h * 1.04 + 1, w * 1.06, h * 1.04);
      cx.globalAlpha = a; cx.drawImage(this.shadow, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); cx.restore(); }
    cx.globalAlpha = 1;
  },
  drawFx(cm) {   // sprite effects (sparks, dust, spikes, runes, bell light) and the flying ember bolt
    const cx = this.cx, V = this.img.vfx, ADD = { spark: 1, hitslash: 1, fireball: 1, bellres: 1, rune: 1, ember: 1 }, GROUND = { dust: 1, spike: 1 };
    for (const f of Fx.fx) { if (f.t < 0) continue; const fr = VFXD[f.k].frames, n = fr.length, q = fr[Math.min(n - 1, Math.floor(f.t / f.d * n))], w = q[2] * f.sc, h = q[3] * f.sc;
      cx.save(); cx.translate(Math.round(f.x - cm), Math.round(f.y)); cx.scale(f.face, f.flipY ? -1 : 1); if (f.rot) cx.rotate(f.rot);
      cx.globalAlpha = Math.min(1, (f.d - f.t) / (f.d * 0.35)); if (ADD[f.k]) cx.globalCompositeOperation = "lighter";
      cx.drawImage(V, q[0], q[1], q[2], q[3], -w / 2, GROUND[f.k] ? -h : -h / 2, w, h); cx.restore(); }
    const fb = VFXD.fireball.frames, sl = VFXD.slash.frames, gy = CFG.level.ground * CFG.T;
    for (const b of Fx.bolts) {
      if (b.kind === "wind") { const q = sl[2], w = q[2] * 0.3, h = q[3] * 0.3; cx.save(); cx.translate(Math.round(b.x - cm), Math.round(b.y)); cx.scale(b.dir, 1); cx.globalAlpha = Math.min(1, b.life * 4); cx.drawImage(V, q[0], q[1], q[2], q[3], -w / 2, -h / 2, w, h); cx.restore(); continue; }
      const q = fb[1 + Math.floor(b.t * 14) % 3], w = q[2] * 0.55, h = q[3] * 0.55;
      cx.save(); cx.translate(Math.round(b.x - cm), Math.round(b.y)); cx.scale(b.dir, 1); cx.globalCompositeOperation = "lighter"; cx.drawImage(V, q[0], q[1], q[2], q[3], -w * 0.7, -h / 2, w, h); cx.restore(); }
    for (const s of Fx.strikes) {   // Lightning Strike: a pale warning line, then a jagged bolt from the sky
      const X = Math.round(s.x - cm); if (s.t < Spells.def("lightning").delay) { cx.globalAlpha = 0.25 + 0.2 * Math.sin(s.t * 40); cx.fillStyle = "#d9cfbd"; cx.fillRect(X - 0.5, CFG.CAMY, 1, gy - CFG.CAMY); cx.globalAlpha = 1; }
      else if (s.t < 0.6) { const seed = Math.floor(s.t * 40); cx.save(); cx.globalCompositeOperation = "lighter"; cx.lineJoin = "round";
        for (const [wd, col, al] of [[7, "#c8553d", 0.3], [2.5, "#d9cfbd", 1]]) { cx.lineWidth = wd; cx.strokeStyle = col; cx.globalAlpha = al * Math.min(1, (0.6 - s.t) * 6); cx.beginPath(); cx.moveTo(X, CFG.CAMY);
          for (let y = CFG.CAMY + 14, k = 0; y < gy; y += 14, k++) cx.lineTo(X + ((((seed * 31 + k * 17) % 13) - 6) * 1.1), y); cx.lineTo(X, gy); cx.stroke(); } cx.restore(); } }
  },
  player(p, cm) {   // pick the animation and frame from what the Warden is doing
    const cx = this.cx, A = this.img.player, H = ANIMS.player, a = CFG.player.atk; if (p.inv > 0 && p.dodge < 0 && !p.dead && Math.floor(p.t * 18) % 2) return;
    let an = "idle", i = 0;
    if (p.dead) { an = "death"; i = Math.min(5, Math.floor(p.deadT * 8)); }
    else if (p.hurt > 0) { an = "hurt"; i = p.hurt > 0.12 ? 0 : 1; }
    else if (p.dodge >= 0) { an = "dash"; i = Math.min(2, Math.floor(p.dodge / CFG.player.dodge.dur * 3)); }
    else if (p.cast >= 0) { an = "cast"; const sd = Spells.def(p.castSpell); i = Math.min(5, Math.floor(p.cast / (sd ? sd.cast : 0.6) * 6)); }
    else if (p.atk >= 0) { an = "attack"; const t = p.atk, e = a.to + 0.04;
      i = t < a.from ? Math.floor(t / a.from * 2) : t < e ? 2 + Math.min(2, Math.floor((t - a.from) / (e - a.from) * 3)) : 5 + Math.min(2, Math.floor((t - e) / (a.dur - e) * 3)); }
    else if (!p.ground) { an = "jump"; i = p.vy < -250 ? 1 : p.vy < -80 ? 2 : p.vy < 80 ? 3 : 4; }
    else if (p.landT > 0) { an = "jump"; i = 5; }
    else if (Math.abs(p.vx) > 10) { an = "run"; i = Math.floor(p.t * H.run.fps) % 6; }
    else i = Math.floor(p.t * H.idle.fps) % 7;
    const s = H[an].scale, f = H[an].frames[i], h = f[3] * s;
    cx.save(); cx.translate(Math.round(p.x + p.w / 2 - cm), Math.round(p.y + p.h)); cx.scale(p.face, 1);
    cx.globalAlpha = 0.28; for (const o of [-0.7, 0.7]) cx.drawImage(this.rim, f[0], f[1], f[2], f[3], -f[4] * s + o, -h + 1, f[2] * s, h); cx.globalAlpha = 1;   // faint bone rim so the dark Warden separates from the background
    cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, f[2] * s, h); cx.restore();
  },
  enemy(e, cm) {   // pick the animation and frame that match the enemy's state
    if (e.chime) return this.chime(e, cm); if (e.sentinel) return this.sentinel(e, cm);
    const cx = this.cx, A = this.img[e.atlas || "husk"], H = ANIMS.husk, d = e.d, wu = d.atk.windup || d.windup, rc = d.atk.recover || d.recover; let an = "walk", pr = -1;   // pr: progress 0..1 through a one-shot animation
    switch (e.st) {
      case "patrol": an = "walk"; break;
      case "chase": case "idle": an = Math.abs(e.vx) > 1 ? "walk" : "idle"; break;
      case "notice": an = "notice"; pr = e.t / d.notice; break;
      case "windup": an = "windup"; pr = e.t / wu; break;
      case "attack": an = "attack"; pr = e.t < 0.05 ? 0 : 1; break;
      case "recover": an = "recover"; pr = e.t / rc; break;
      case "hurt": an = "hurt"; pr = e.t / 0.3; break;
      case "roar": an = "notice"; pr = e.t / 0.9; break;
      case "sleep": an = "idle"; pr = 0; break;
      case "fade": an = "notice"; pr = 0.99; break;
      case "gone": return;
      case "appear": an = "notice"; pr = e.t / 0.3; break;
      default: an = "death"; pr = Math.min(0.99, e.t * 8 / H.death.frames.length);
    }
    const a = H[an], n = a.frames.length, i = pr < 0 ? Math.floor(e.t * a.fps) % n : Math.max(0, Math.min(n - 1, Math.floor(pr * n))), s = a.scale * (e.sc || 1), f = a.frames[i], w = f[2] * s, h = f[3] * s;
    cx.save(); cx.globalAlpha = e.st === "dead" ? Math.max(0, Math.min(1, 1 - (e.t - 1) / 0.6)) : (e.alpha === undefined ? 1 : e.alpha);
    cx.translate(Math.round(e.x + e.w / 2 - cm), Math.round(e.y + e.h)); cx.scale(e.face, 1);
    cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h);
    if (e.st === "windup") { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.2 * (0.5 + 0.5 * Math.sin(e.t * 28)); cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); }   // pulsing tell before the swing
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.6; cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); }
    cx.restore();
    if (e.st === "windup") { cx.fillStyle = "#c8553d"; const x = Math.round(e.x + e.w / 2 - cm), k = e.sc || 1; cx.fillRect(x - 1, e.y - 40 * k, 2, 7); cx.fillRect(x - 1, e.y - 31 * k, 2, 2); }   // warning mark
  },
  sentinel(e, cm) {   // Iron Sentinel: Warden frames in iron grey, plus a code-drawn tower shield
    const cx = this.cx, H = ANIMS.player, d = e.d, pick = (n, t, dur) => Math.min(n - 1, Math.floor(t / dur * n)); let an = "idle", i = 0;
    switch (e.st) {
      case "patrol": case "chase": if (Math.abs(e.vx) > 1) { an = "run"; i = Math.floor(e.t * 7) % 6; } break;
      case "windup": an = "attack"; i = pick(2, e.t, d.atk.windup); break;
      case "attack": an = "attack"; i = e.t < 0.07 ? 2 : 3; break;
      case "recover": an = "attack"; i = 4 + pick(4, e.t, d.atk.recover); break;
      case "hurt": an = "hurt"; i = pick(2, e.t, 0.25); break;
      case "dead": an = "death"; i = Math.min(5, Math.floor(e.t * 8)); break;
    }
    const s = H[an].scale * e.sc, f = H[an].frames[i], w = f[2] * s, h = f[3] * s, A = this.img.player_s;
    cx.save(); cx.globalAlpha = e.st === "dead" ? Math.max(0, Math.min(1, 1 - (e.t - 1) / 0.6)) : 1; cx.translate(Math.round(e.x + e.w / 2 - e.x * 0 - cm), Math.round(e.y + e.h)); cx.scale(e.face, 1);
    cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h);
    if (e.st === "windup") { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.2 * (0.5 + 0.5 * Math.sin(e.t * 28)); cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
    if (e.flash > 0) { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = 0.6; cx.drawImage(A, f[0], f[1], f[2], f[3], -f[4] * s, -h + 1, w, h); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
    if (e.guarding() && e.alive()) {   // tower shield: iron plate with rivets and a bone rim
      const g = cx.createLinearGradient(8, 0, 14, 0); g.addColorStop(0, "#5b5560"); g.addColorStop(1, "#2a2630"); cx.fillStyle = g; cx.beginPath(); cx.moveTo(8, -27); cx.lineTo(14, -24); cx.lineTo(14, -6); cx.lineTo(11, -2); cx.lineTo(8, -6); cx.closePath(); cx.fill();
      cx.strokeStyle = "#0c0b11"; cx.lineWidth = 0.8; cx.stroke(); cx.fillStyle = "#d9cfbd"; cx.fillRect(10, -22, 1, 1); cx.fillRect(10, -14, 1, 1); cx.fillRect(10, -8, 1, 1);
      if (e.sh > 0) { cx.globalAlpha = e.sh * 6; cx.fillStyle = "#d9cfbd"; cx.fillRect(7, -27, 8, 24); } }
    cx.restore();
    if (e.st === "windup") { cx.fillStyle = "#c8553d"; const x = Math.round(e.x + e.w / 2 - cm); cx.fillRect(x - 1, e.y - 18, 2, 7); cx.fillRect(x - 1, e.y - 9, 2, 2); }
  },
  chime(e, cm) {   // code-drawn bell-spirit: bone dome, ember clapper, gentle sway
    const cx = this.cx, sleep = e.st === "dormant";
    cx.save(); cx.translate(Math.round(e.x + 5 - cm), Math.round(e.y + 5)); cx.rotate(Math.sin(e.ph * 5) * (sleep ? 0.1 : 0.28)); cx.globalAlpha = e.st === "dead" ? Math.max(0, 1 - e.t / 0.6) : (sleep ? 0.75 : 1);
    cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.moveTo(-5, 5); cx.lineTo(-4, -1); cx.quadraticCurveTo(-4, -6, 0, -6); cx.quadraticCurveTo(4, -6, 4, -1); cx.lineTo(5, 5); cx.closePath(); cx.fill();
    cx.fillStyle = "rgba(42,38,48,.55)"; cx.beginPath(); cx.moveTo(1, -6); cx.quadraticCurveTo(4, -6, 4, -1); cx.lineTo(5, 5); cx.lineTo(1, 5); cx.closePath(); cx.fill();
    cx.fillStyle = "#5b5560"; cx.fillRect(-5, 4, 10, 1.5);
    cx.globalAlpha *= sleep ? 0.45 : 0.7 + 0.3 * Math.sin(e.ph * 8); cx.fillStyle = "#c8553d"; cx.beginPath(); cx.arc(Math.sin(e.ph * 5) * 1.5, 6.5, 1.8, 0, 6.283); cx.fill(); cx.restore();
  },
  hud(p, es) {
    const cx = this.cx;
    const U = this.img.ui_status, k = 0.27;   // portrait with health and echo bars
    cx.drawImage(U, 4, 4, U.width * k, U.height * k);
    const bar = (b, f, col) => { const x = 4 + b[0] * k, y = 4 + b[1] * k, w = (b[2] - b[0]) * k, h = (b[3] - b[1]) * k; cx.fillStyle = "rgba(12,11,17,.88)"; cx.fillRect(x + w * f, y, w * (1 - f) + 0.5, h);
      if (col) { cx.strokeStyle = col; cx.lineWidth = 0.6; cx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1); } };
    bar(UIM.health, p.hp / CFG.player.hp); bar(UIM.echo, p.echo / CFG.player.echoMax, Fx.noEcho > 0 && Math.floor(Fx.noEcho * 12) % 2 ? "#d9cfbd" : (p.echo >= 2 ? "#c8553d" : null));
    for (let i = 0; i < 2; i++) {   // the two equipped spells: icon, key hint, recharge, and dimmed when there is not enough echo
      const id = Save.data.spells.slots[i], x = 6 + i * 18, y = 34; cx.fillStyle = "rgba(12,11,17,.75)"; cx.fillRect(x, y, 16, 16); cx.strokeStyle = "#5b5560"; cx.lineWidth = 0.6; cx.strokeRect(x + 0.3, y + 0.3, 15.4, 15.4);
      if (id) { const im = Spells.icon(id), s = Spells.def(id), cd = Spells.cd[id] || 0; if (im.complete && im.naturalWidth) { cx.globalAlpha = p.echo >= s.cost && cd <= 0 ? 1 : 0.4; cx.drawImage(im, x + 1, y + 1, 14, 14); cx.globalAlpha = 1; }
        if (cd > 0) { cx.fillStyle = "rgba(12,11,17,.6)"; cx.fillRect(x, y + 16 * (1 - cd / s.cd), 16, 16 * (cd / s.cd)); } }
      cx.fillStyle = "#d9cfbd"; cx.font = "5px Georgia,serif"; cx.fillText(i ? "I" : "K", x + 1, y + 21); }
    if (Fx.toast) { cx.globalAlpha = Math.min(1, Fx.toast.t); cx.fillStyle = "#d9cfbd"; cx.font = "9px Georgia, serif"; cx.textAlign = "center"; cx.fillText(Fx.toast.m, CFG.W / 2, 34); cx.textAlign = "left"; cx.globalAlpha = 1; }
    const b = es.find(e => e.boss && e.st !== "sleep" && e.alive());
    if (b) { const w = 150, x = (CFG.W - w) / 2, y = CFG.H - 16, k = Math.max(0, b.hp / b.maxhp);
      cx.fillStyle = "rgba(12,11,17,.8)"; cx.fillRect(x - 2, y - 2, w + 4, 8); cx.fillStyle = "#6b1d24"; cx.fillRect(x, y, w * k, 4); cx.fillStyle = "#c8553d"; cx.fillRect(x + w * k - 1, y, 1, 4);
      cx.strokeStyle = "#8d8374"; cx.lineWidth = 0.5; cx.strokeRect(x - 2, y - 2, w + 4, 8); cx.fillStyle = "#d9cfbd"; cx.font = "7px Georgia, serif"; cx.textAlign = "center"; cx.fillText("THE BELL KEEPER", CFG.W / 2, y - 5); cx.textAlign = "left"; }
  },
  debug(p, es, cm) {
    const cx = this.cx, Y = CFG.CAMY; cx.lineWidth = 0.6; const box = (r, c) => { cx.strokeStyle = c; cx.strokeRect(Math.round(r.x - cm) + .5, Math.round(r.y - Y) + .5, r.w, r.h); };
    box(p, "#0f0"); if (p.atk >= CFG.player.atk.from && p.atk <= CFG.player.atk.to) box(p.hitbox(), "#ff0");
    for (const e of es) { box(e, "#f33"); if (e.st === "attack") box(e.hitbox(), "#f80"); }
    cx.fillStyle = "#fff"; cx.font = "5px monospace"; cx.fillText(`hp ${p.hp} x ${Math.round(p.x)} y ${Math.round(p.y)} fps ${Math.round(this.fps || 0)}`, 4, CFG.H - 4);
  }
};
