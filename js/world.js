"use strict";
// The room: a grid of tiles (1 = solid stone) plus simple, predictable collision.
class World {
  constructor(L) {
    this.T = CFG.T; this.cols = L.cols; this.rows = L.rows; this.w = this.cols * this.T; this.h = this.rows * this.T;
    this.g = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
    for (let y = L.ground; y < this.rows; y++) this.g[y].fill(1);
    for (const [x, y, w, h = 1] of L.platforms) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.g[y + j][x + i] = 2;
  }
  solid(tx, ty) { if (tx < 0 || tx >= this.cols) return true; if (ty < 0) return false; if (ty >= this.rows) return true; return this.g[ty][tx] > 0; }
  hit(b) { const T = this.T, x1 = Math.floor(b.x / T), x2 = Math.floor((b.x + b.w - 0.01) / T), y1 = Math.floor(b.y / T), y2 = Math.floor((b.y + b.h - 0.01) / T);
    for (let ty = y1; ty <= y2; ty++) for (let tx = x1; tx <= x2; tx++) if (this.solid(tx, ty)) return [tx, ty]; return null; }
  // Move horizontally first, then vertically, fixing overlaps each time.
  move(b, dt) {
    const T = this.T; let h; b.wall = false;
    b.x += b.vx * dt;
    if ((h = this.hit(b))) { b.wall = true; b.x = b.vx > 0 ? h[0] * T - b.w : (h[0] + 1) * T; b.vx = 0; }
    b.y += b.vy * dt; b.ground = false;
    if ((h = this.hit(b))) { if (b.vy > 0) { b.y = h[1] * T - b.h; b.ground = true; } else b.y = (h[1] + 1) * T; b.vy = 0; }
  }
}
