"use strict";
(window.HV_V = window.HV_V || {}).bellringer = 10;
// Bell-Ringer upgrade pipeline. Two parts:
// 1) BR.fx: small ember specks around the bell and dust at the feet while it walks (drawing only; no damage, no gameplay change).
// 2) A loader for NEW painted animation strips. It is OFF by default (BR.enabled = false), so the game keeps using your original hand-painted Bell-Ringer sheet.
//    To use new art: put the ten strips and manifest.json in assets/bellringer/ (format in docs/BELL_RINGER_UPGRADE.md), then set enabled = true below.
//    Only the base Bell-Ringer uses it; the recoloured enemies and every bit of gameplay (AI, speed, health, damage, timing, hitboxes) are untouched.
const BR = {
  enabled: false, ready: false, sets: {}, dustT: 0,
  load() {
    if (!this.enabled) return;
    fetch("assets/bellringer/manifest.json").then(r => r.json()).then(m => { const names = Object.keys(m.anims); let n = 0;
      for (const k of names) { const a = m.anims[k], img = new Image(), cw = a.cell[0], ch = a.cell[1]; img.onload = () => { if (++n === names.length) this.ready = true; }; img.onerror = () => { this.ready = false; this.enabled = false; };
        img.src = "assets/bellringer/" + a.image; this.sets[k] = { img, fps: a.fps, loop: a.loop, scale: m.scale, frames: Array.from({ length: a.frames }, (_, i) => [i * cw, 0, cw, ch, a.ax, a.ember[i][0], a.ember[i][1]]) }; } }).catch(() => { this.enabled = false; });
  },
  pick(e, an, pr, d) {   // chooses the strip and frame from the enemy's existing state; gameplay timing stays with the AI
    let name = an, p = pr; const st = e.st;
    if (st === "stagger") { name = "stagger"; p = Math.min(0.99, e.t / 0.55); }
    else if (st === "ringup") { name = "resonance"; p = Math.min(0.49, e.t / d.ring.windup * 0.5); }
    else if (st === "ring") { name = "resonance"; p = 0.5 + Math.min(0.49, e.t / d.ring.active * 0.5); }
    else if (st === "attack") { name = "attack"; p = Math.min(0.99, e.t / d.atk.active); }
    else if (st === "dead") { name = "death"; p = Math.min(0.99, e.t * 8 / (this.sets.death ? this.sets.death.frames.length : 8)); }
    const a = this.sets[name] || this.sets.idle, n = a.frames.length;
    return { a, i: p < 0 ? Math.floor(e.t * a.fps) % n : Math.max(0, Math.min(n - 1, Math.floor(p * n))) };
  },
  fx(e, f, s, h) {   // restrained ember specks near the bell and dust when moving (capped, off in light mode)
    if (typeof Fx === "undefined" || Fx.parts.length > 140) return; try { if (typeof Env !== "undefined" && (Env.lite() || Env.calm)) return; } catch (x) {}
    if (e.st === "dead" || f[5] === undefined) return; const k = e.st === "ring" || e.st === "ringup" ? 0.35 : e.st === "windup" ? 0.2 : 0.05;
    if (Math.random() < k) { const bx = e.x + e.w / 2 + e.face * (-f[4] * s + f[5] * s), by = e.y + e.h - h + 1 + f[6] * s; Fx.parts.push({ x: bx + (Math.random() - 0.5) * 6, y: by, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 12, g: -6, s: 1, life: 0.5 + Math.random() * 0.4, col: Math.random() < 0.3 ? "#ff9a6a" : "#c8553d" }); }
    if (Math.abs(e.vx) > 8 && e.ground && Math.random() < 0.12) Fx.parts.push({ x: e.x + e.w / 2 - e.face * 4, y: e.y + e.h - 1, vx: -e.face * 10, vy: -8, g: -4, s: 1.5, life: 0.4, col: "#5b5560" });
  }
};
BR.load();
