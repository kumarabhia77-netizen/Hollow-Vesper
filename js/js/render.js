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
