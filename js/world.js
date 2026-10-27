"use strict";
// The room: a grid of tiles (1 = solid stone) plus simple, predictable collision.
class World {
  constructor(L) {
    this.T = CFG.T; this.cols = L.cols; this.rows = L.rows; this.w = this.cols * this.T; this.h = this.rows * this.T;
    this.g = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
    for (let y = L.ground; y < this.rows; y++) this.g[y].fill(1);
    this.shrines = new Set(); this.bridge = false; this.bridgeT = 0; this.gate = false;
    for (let x = L.pit[0]; x < L.pit[0] + L.pit[1]; x++) for (let y = L.ground; y < this.rows; y++) this.g[y][x] = 0;
    for (let x = L.bridge[0]; x < L.bridge[0] + L.bridge[1]; x++) this.g[L.ground][x] = 3;
    for (let r = 0; r < L.gate[2]; r++) this.g[L.gate[1] + r][L.gate[0]] = 4;
    for (const [x, y, w, h = 1] of L.platforms) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.g[y + j][x + i] = 2;
  }
  solid(tx, ty) {
    if (tx < 0 || tx >= this.cols) return true; if (ty < 0 || ty >= this.rows) return false;
    const v = this.g[ty][tx]; return v === 1 || v === 2 || (v === 3 && this.bridge) || (v === 4 && this.gate);   // 3 = hidden bridge, 4 = boss gate
  }
  solidOld(tx, ty) { if (tx < 0 || tx >= this.cols) return true; if (ty < 0) return false; if (ty >= this.rows) return true; return this.g[ty][tx] > 0; }
  hit(b) { const T = this.T, x1 = Math.floor(b.x / T), x2 = Math.floor((b.x + b.w - 0.01) / T), y1 = Math.floor(b.y / T), y2 = Math.floor((b.y + b.h - 0.01) / T);
    for (let ty = y1; ty <= y2; ty++) for (let tx = x1; tx <= x2; tx++) if (this.solid(tx, ty)) return [tx, ty]; return null; }
  clear(a, b) {   // line of sight: no solid tile between two bodies at body height
    const T = this.T, x1 = a.x + a.w / 2, x2 = b.x + b.w / 2, y = Math.floor((a.y + a.h / 2) / T), n = Math.ceil(Math.abs(x2 - x1) / (T / 2));
    for (let i = 1; i < n; i++) if (this.solid(Math.floor((x1 + (x2 - x1) * i / n) / T), y)) return false; return true;
  }
  // Move horizontally first, then vertically, fixing overlaps each time.
  move(b, dt) {
    const T = this.T; let h; b.wall = false;
    b.x += b.vx * dt;
    if ((h = this.hit(b))) { b.wall = true; b.x = b.vx > 0 ? h[0] * T - b.w : (h[0] + 1) * T; b.vx = 0; }
    b.y += b.vy * dt; b.ground = false;
    if ((h = this.hit(b))) { if (b.vy > 0) { b.y = h[1] * T - b.h; b.ground = true; } else b.y = (h[1] + 1) * T; b.vy = 0; }
  }
}
