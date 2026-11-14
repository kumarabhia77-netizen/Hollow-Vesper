"use strict";
(window.HV_V = window.HV_V || {}).environment = 10;
// Gothic cosmic-horror environment layer (drawing only; collision, physics, combat and saving are not touched).
// New art lives in assets/environment/. If any of it fails to load the game falls back to the original background, so nothing breaks.
// Layers, back to front: sky (0.03) -> original painted skyline, faint (0.1) -> distant city (0.16) -> cathedral towers (0.24) -> original nave arches (0.3, in render.js)
//   -> light shafts -> original near arches (0.55) -> tiles -> environment props, lights, debris -> characters -> ground mist, ash, embers -> foreground silhouettes (1.35 / 1.6).
const Env = {
  ready: false, failed: false, img: {}, last: 0, mist: null, parts: [], debris: [], nextDebris: 3, emberT: 0,
  calm: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),
  coarse: !!(window.matchMedia && matchMedia("(pointer:coarse)").matches),
  PROPS: {"candelabra": {"r": [0, 0, 40, 88], "lit": [0.5, 0.18, 36, 0.18], "sway": 0, "hang": 0}, "chandelier": {"r": [44, 0, 88, 76], "lit": [0.5, 0.45, 46, 0.16], "sway": 0, "hang": 1}, "statue_broken": {"r": [136, 0, 56, 120], "lit": null, "sway": 0, "hang": 0}, "column_fallen": {"r": [196, 0, 128, 44], "lit": null, "sway": 0, "hang": 0}, "altar": {"r": [328, 0, 112, 60], "lit": [0.2, 0.05, 40, 0.14], "sway": 0, "hang": 0}, "crypt": {"r": [444, 0, 80, 104], "lit": [0.5, 0.2, 26, 0.1], "sway": 0, "hang": 0}, "bell_broken": {"r": [0, 124, 72, 64], "lit": [0.5, 0.5, 30, 0.14], "sway": 0, "hang": 0}, "dead_tree": {"r": [76, 124, 88, 128], "lit": null, "sway": 0, "hang": 0}, "banner_pole": {"r": [168, 124, 36, 104], "lit": null, "sway": 1, "hang": 0}, "growth": {"r": [208, 124, 56, 80], "lit": [0.45, 0.5, 30, 0.14], "sway": 0, "hang": 0}, "coffin": {"r": [268, 124, 112, 40], "lit": [0.5, 0.3, 24, 0.08], "sway": 0, "hang": 0}, "crack": {"r": [384, 124, 88, 16], "lit": [0.5, 0.4, 32, 0.12], "sway": 0, "hang": 0}},
  // Decorative scenery only (never on the pit, never on a platform edge). [name, column]. Planned regions can use the same table with their own lists.
  LAYOUT: [["statue_broken", 3], ["candelabra", 7], ["crack", 8], ["chandelier", 12], ["column_fallen", 13], ["banner_pole", 15], ["dead_tree", 19], ["crack", 22], ["altar", 25], ["chandelier", 28], ["crypt", 30], ["candelabra", 31], ["banner_pole", 34], ["bell_broken", 38], ["chandelier", 40], ["crack", 41], ["growth", 44],
    ["coffin", 65], ["column_fallen", 71], ["candelabra", 72], ["crack", 75], ["growth", 77], ["banner_pole", 78], ["candelabra", 87], ["chandelier", 90], ["column_fallen", 92], ["crack", 93], ["chandelier", 98], ["crack", 99], ["candelabra", 103], ["crypt", 106]],
  SHAFTS: [[10, 20, 0.05], [24, 26, 0.05], [37, 22, 0.06], [66, 24, 0.05], [88, 26, 0.06], [96, 26, 0.06], [102, 24, 0.06]],   // column, width, strength: light falling from broken windows
  MOOD: { courtyard: { fog: 1, tint: [217, 207, 189] }, tower: { fog: 0.8, tint: [200, 120, 90] }, chasm: { fog: 1.5, tint: [150, 160, 175] }, chapel: { fog: 1.2, tint: [190, 200, 170] }, boss: { fog: 1.1, tint: [200, 85, 61] }, chancel: { fog: 1.3, tint: [170, 140, 190] } },
  // Area backdrops: a full painted picture that fades in when the Warden enters that area and fades out when he leaves (map change).
  // To add one: put the picture (about 16:9, JPG or PNG) in assets/environment/backdrops/ and add a line here: areaId: "backdrops/file.jpg". Area ids: gate, yard, tower, span, rise, arena, chancel.
  BACKDROPS: { arena: "backdrops/bd_bell_arena.jpg", chancel: "backdrops/bd_bone_chancel.jpg" },
  bd: {}, bdW: {},
  loadBackdrops() { for (const k in this.BACKDROPS) { const i = new Image(); i.onload = () => { this.bd[k] = i; this.bdW[k] = this.bdW[k] || 0; }; i.src = "assets/environment/" + this.BACKDROPS[k]; } },
  areaOf(p) { const col = p.x / CFG.T; return CFG.level.areas.find(a => col >= a.c[0] && col < a.c[1]); },
  bdMix() { let m = 0; for (const k in this.bdW) m = Math.max(m, this.bdW[k]); return m; },
  backdrop(cx, cam, t, p) {
    const a = this.areaOf(p), id = a ? a.id : "", x0 = a ? a.c[0] * CFG.T : 0;
    for (const k in this.bd) { const target = k === id ? 1 : 0; this.bdW[k] += (target - this.bdW[k]) * 0.045; if (Math.abs(target - this.bdW[k]) < 0.004) this.bdW[k] = target; const w = this.bdW[k]; if (w < 0.01) continue;
      const img = this.bd[k], ih = CFG.H, iw = img.width / img.height * ih, off = -Math.max(0, Math.min(iw - CFG.W, (cam - (x0 - 200)) * 0.12));   // slow pan inside the area
      cx.globalAlpha = 0.97 * w; cx.drawImage(img, Math.round(off), 0, Math.round(iw), ih); cx.globalAlpha = 1; cx.fillStyle = `rgba(12,11,17,${0.2 * w})`; cx.fillRect(0, 0, CFG.W, CFG.H); }   // dimmed so it sits in the dark palette
  },
  load() {
    const names = { sky: "backgrounds/env_sky", city: "backgrounds/env_city", towers: "backgrounds/env_towers", fg_top: "foregrounds/env_fg_top", fg_bottom: "foregrounds/env_fg_bottom", props: "props/env_props" }; let n = 0, total = Object.keys(names).length;
    for (const k in names) { const i = new Image(); i.onload = () => { if (++n === total && !this.failed) this.ready = true; }; i.onerror = () => { this.failed = true; this.ready = false; }; i.src = "assets/environment/" + names[k] + ".png"; this.img[k] = i; }
  },
  lite() { try { const s = Save.data.settings; return s.lite !== null && s.lite !== undefined ? !!s.lite : this.coarse; } catch (e) { return this.coarse; } },   // same Music quality setting; no new setting added
  layer(cx, img, f, cam, a) {   // seamless tile: 1920 x 540 picture drawn at 640 x 180 logical pixels
    const w = img.width / 3, x0 = -(((cam * f) % w) + w) % w; cx.globalAlpha = a === undefined ? 1 : a;
    for (let x = x0 - 1; x < CFG.W; x += w - 1) cx.drawImage(img, Math.round(x), 0, w, CFG.H); cx.globalAlpha = 1;
  },
  sky(cx, cam) { this.layer(cx, this.img.sky, 0.03, cam); },
  city(cx, cam) { this.layer(cx, this.img.city, 0.16, cam, 0.9); },
  towers(cx, cam) { this.layer(cx, this.img.towers, 0.24, cam, 0.95); },
  area(p) { const col = p.x / CFG.T, a = CFG.level.areas.find(a => col >= a.c[0] && col < a.c[1]); return this.MOOD[a ? a.type : "courtyard"] || this.MOOD.courtyard; },
  tick(t) { const dt = Math.min(0.05, Math.max(0, t - this.last)); this.last = t; return dt; },
  flick(t, col) { return this.calm ? 0.95 : 0.86 + 0.14 * Math.sin(t * 11 + col) * Math.sin(t * 7.3 + col * 2); },
  shafts(cx, cam, t, p) {   // soft shafts from broken windows, tinted by the area; a few specks drift inside
    const m = this.area(p), c = m.tint, lite = this.lite(); cx.save(); cx.globalCompositeOperation = "lighter";
    for (const [col, w, s] of this.SHAFTS) { const x = col * CFG.T - cam; if (x < -90 || x > CFG.W + 40) continue; const a = s * (0.8 + 0.2 * Math.sin(t * 0.5 + col)), g = cx.createLinearGradient(x, 0, x + 40, CFG.H * 0.95);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); cx.fillStyle = g; cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x + w, 0); cx.lineTo(x + w + 56, CFG.H * 0.95); cx.lineTo(x + 20, CFG.H * 0.95); cx.closePath(); cx.fill();
      if (!lite && !this.calm) { cx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.35)`; for (let k = 0; k < 5; k++) { const f = (t * 0.03 * (k + 2) + k * 0.2) % 1; cx.fillRect(Math.round(x + w * 0.5 + f * 50 + Math.sin(t + k * 3) * 3), Math.round(f * CFG.H * 0.9), 1, 1); } } }
    cx.restore();
  },
  props(cx, cm, t, lights) {   // scenery behind the characters, with light, sway and pulsing ember cracks
    const T = CFG.T, gy = CFG.level.ground * T, I = this.img.props;
    for (const [name, col] of this.LAYOUT) { const d = this.PROPS[name], r = d.r, w = r[2] / 2, h = r[3] / 2, x = col * T - cm; if (x < -w - 4 || x > CFG.W + 4) continue;
      let y = d.hang ? CFG.CAMY + 2 + (col * 5) % 14 : name === "crack" ? gy - h + 1 : gy - h + 1;
      cx.save(); cx.translate(Math.round(x), Math.round(y));
      if (d.sway && !this.calm) { cx.transform(1, 0, Math.sin(t * 1.3 + col) * 0.06, 1, 0, 0); }
      else if (d.hang && !this.calm) { cx.translate(w / 2, 0); cx.rotate(Math.sin(t * 0.9 + col) * 0.035); cx.translate(-w / 2, 0); }
      cx.drawImage(I, r[0], r[1], r[2], r[3], 0, 0, w, h);
      if (name === "crack") { cx.globalCompositeOperation = "lighter"; cx.globalAlpha = this.calm ? 0.25 : 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.7 + col)); cx.drawImage(I, r[0], r[1], r[2], r[3], 0, 0, w, h); }   // ember cracks pulse gently
      cx.restore();
      if (d.lit) lights.push([x + w * d.lit[0], y + h * d.lit[1], d.lit[2] * this.flick(t, col), d.lit[3] * this.flick(t, col + 3)]); }
    for (const [name, col] of CFG.level.props) { if (name !== "torch" && name !== "brazier") continue; const x = col * CFG.T - cm; if (x < -30 || x > CFG.W + 30) continue; const b = propBox(name, col); lights.push([x + b.w / 2, b.y + b.h * 0.25, 30 * this.flick(t, col), 0.1]); }   // a warm pool of light on the floor beside each fire
  },
  spawnEmber(x, y, lite) { if (this.parts.length >= (lite ? 20 : 48)) return; this.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 10, life: 1.2 + Math.random() * 1.2, max: 2.4, k: Math.random() < 0.3 ? 1 : 0 }); },
  update(cx, cm, t, p) {   // embers near fires and rare falling stone: small, capped, pooled
    const dt = this.tick(t); if (dt <= 0 || this.calm) return; const lite = this.lite(), gy = CFG.level.ground * CFG.T;
    this.emberT -= dt;
    if (this.emberT <= 0) { this.emberT = lite ? 0.35 : 0.18; for (const [name, col] of CFG.level.props) { if (name !== "torch" && name !== "brazier") continue; const x = col * CFG.T; if (x - cm < -20 || x - cm > CFG.W + 20) continue; const b = propBox(name, col); this.spawnEmber(x + b.w / 2, b.y + b.h * 0.2, lite); }
      for (const [name, col] of this.LAYOUT) if (name === "candelabra") { const x = col * CFG.T; if (x - cm > -20 && x - cm < CFG.W + 20 && Math.random() < 0.5) this.spawnEmber(x + 10, gy - 40, lite); } }
    for (const q of this.parts) { q.life -= dt; q.x += q.vx * dt + Math.sin(t * 2 + q.max) * 0.05; q.y += q.vy * dt; } this.parts = this.parts.filter(q => q.life > 0);
    if (!lite) { this.nextDebris -= dt; if (this.nextDebris <= 0 && this.debris.length < 4) { this.nextDebris = 3 + Math.random() * 5; this.debris.push({ x: cm + 30 + Math.random() * (CFG.W - 60), y: CFG.CAMY + 2, vy: 0, s: 1 + (Math.random() * 2 | 0) }); }
      for (const d of this.debris) { d.vy += 300 * dt; d.y += d.vy * dt; if (d.y >= gy - 1) { d.dead = true; for (let i = 0; i < 4; i++) if (this.parts.length < 48) this.parts.push({ x: d.x, y: gy - 2, vx: (Math.random() - 0.5) * 24, vy: -10 - Math.random() * 14, life: 0.5, max: 1, k: 2 }); } } this.debris = this.debris.filter(d => !d.dead); }
  },
  particles(cx, cm) {
    for (const q of this.parts) { const a = Math.min(1, q.life * 2), x = Math.round(q.x - cm), y = Math.round(q.y - CFG.CAMY + 0); cx.globalAlpha = a; cx.fillStyle = q.k === 1 ? "#ff9a6a" : q.k === 2 ? "#5b5560" : "#c8553d"; cx.fillRect(x, Math.round(q.y) - CFG.CAMY, 1.2, 1.2); } cx.globalAlpha = 1;
    cx.fillStyle = "#2a2630"; for (const d of this.debris) cx.fillRect(Math.round(d.x - cm), Math.round(d.y) - CFG.CAMY, d.s + 1, d.s + 1);
  },
  mistFx(cx, cam, t, p) {   // two to four drifting banks of low mist from one cached soft sprite
    if (!this.mist) { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(128, 32, 4, 128, 32, 128); g.addColorStop(0, "rgba(154,146,142,.5)"); g.addColorStop(1, "rgba(154,146,142,0)"); x.save(); x.scale(1, 0.25); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.restore(); this.mist = c; }
    const n = this.lite() ? 2 : 4, k = this.area(p).fog, gy = CFG.level.ground * CFG.T - CFG.CAMY;
    for (let i = 0; i < n; i++) { const sp = 3 + i * 2.5, w = 260 + i * 60, x = (((t * sp * (this.calm ? 0.2 : 1) + i * 190 - cam * (0.35 + i * 0.12)) % (CFG.W + w)) + CFG.W + w) % (CFG.W + w) - w; cx.globalAlpha = Math.min(0.5, 0.2 * k); cx.drawImage(this.mist, x, gy - 26 - i * 8, w, 36 + i * 6); } cx.globalAlpha = 1;
  },
  fg(cx, cam, t) {   // dark foreground silhouettes along the top and bottom edges only, so fights and attack warnings stay visible
    const w = this.img.fg_top.width / 3, s = this.calm ? 0 : Math.sin(t * 0.6) * 1.2, off = -((cam * 1.35 + s) % w), off2 = -((cam * 1.6) % w), ht = this.img.fg_top.height / 3, hb = this.img.fg_bottom.height / 3;
    cx.globalAlpha = 0.95; for (let x = off - 1; x < CFG.W; x += w - 1) cx.drawImage(this.img.fg_top, Math.round(x), 0, w, ht);
    for (let x = off2 - 1; x < CFG.W; x += w - 1) cx.drawImage(this.img.fg_bottom, Math.round(x), CFG.H - hb, w, hb); cx.globalAlpha = 1;
  }
};
Env.load(); Env.loadBackdrops();
