"use strict";
(window.HV_V = window.HV_V || {}).input = 10;
// One input layer for keyboard, touch and gamepad. Every source sets the same flags, so the game only reads Input.
const Input = {
  left: false, right: false, up: false, down: false, jump: false,
  jumpP: false, atkP: false, dodgeP: false, castP: false, cast2P: false, bellP: false, pauseP: false, mapP: false, magicP: false,
  navU: false, navD: false, navOK: false, navBack: false,   // menu navigation from a gamepad
  pad: false, cap: null, kb: {}, touch: { l: false, r: false, u: false, d: false, j: false }, gp: { l: false, r: false, u: false, d: false, j: false }, prev: {}, map: {},
  NAMES: { left: "Move left", right: "Move right", jump: "Jump", attack: "Sword", dodge: "Dash", cast1: "Magic slot 1", cast2: "Magic slot 2", bell: "Bell Resonance", pause: "Pause", map: "World map", magic: "Magic menu" },
  DEF: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], jump: ["Space", "KeyW", "ArrowUp"], attack: ["KeyJ", "KeyX", "KeyZ"], dodge: ["ShiftLeft", "ShiftRight", "KeyL", "KeyC"], cast1: ["KeyK", "KeyV"], cast2: ["KeyI"], bell: ["KeyB", "KeyU"], pause: ["KeyP", "Escape"], map: ["KeyM"], magic: ["Tab"] },
  keysFor(a) { const b = (Save.data && Save.data.bindings[a]); return b && b.length ? b : this.DEF[a]; },
  rebuild() { this.map = {}; for (const a in this.DEF) for (const k of this.keysFor(a)) this.map[k] = a; },
  sync() { const t = this.touch, g = this.gp, k = this.kb; this.left = !!(k.left || t.l || g.l); this.right = !!(k.right || t.r || g.r); this.up = !!(t.u || g.u); this.down = !!(t.d || g.d); this.jump = !!(k.jump || t.j || g.j); },
  press(a) { const f = { jump: "jumpP", attack: "atkP", dodge: "dodgeP", cast1: "castP", cast2: "cast2P", bell: "bellP", pause: "pauseP", map: "mapP", magic: "magicP" }[a]; if (f) this[f] = true; },
  endFrame() { this.jumpP = this.atkP = this.dodgeP = this.castP = this.cast2P = this.bellP = this.pauseP = this.mapP = this.magicP = this.navU = this.navD = this.navOK = this.navBack = false; },
  capture(action, done) { this.cap = { action, done }; },   // wait for the next key press and bind it to an action
  poll() {   // gamepad (standard layout): stick or d-pad moves, A jump, X sword, B dash, Y bell, RB/RT magic 1, LB/LT magic 2, Start pause, Back map
    let gp = null; try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch (e) { gp = null; }
    this.pad = !!gp; if (!gp) { if (this.gp.l || this.gp.r || this.gp.j) { this.gp = { l: false, r: false, u: false, d: false, j: false }; this.sync(); } return; }
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), x = gp.axes[0] || 0, y = gp.axes[1] || 0, n = { l: x < -0.35 || b(14), r: x > 0.35 || b(15), u: y < -0.5 || b(12), d: y > 0.5 || b(13), j: b(0) };
    const edge = (key, now, act) => { if (now && !this.prev[key]) act(); this.prev[key] = now; };
    [[0, "jump"], [2, "attack"], [1, "dodge"], [3, "bell"], [5, "cast1"], [7, "cast1"], [4, "cast2"], [6, "cast2"], [9, "pause"], [8, "map"]].forEach(([i, a]) => edge("b" + i, b(i), () => this.press(a)));
    edge("nu", n.u, () => this.navU = true); edge("nd", n.d, () => this.navD = true); edge("nok", b(0), () => this.navOK = true); edge("nb", b(1), () => this.navBack = true);
    this.gp = n; this.sync();
  }
};
(function () {
  Input.rebuild();
  addEventListener("keydown", e => {
    if (e.code === "F3") { e.preventDefault(); CFG.debug = !CFG.debug; return; }
    if (Input.cap) { e.preventDefault(); const c = Input.cap; Input.cap = null; if (e.code !== "Escape") { Save.data.bindings[c.action] = [e.code]; Save.save(); Input.rebuild(); } if (c.done) c.done(); return; }
    const a = Input.map[e.code]; if (!a) return;
    if (a === "magic" || a === "pause") e.preventDefault(); else if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; else e.preventDefault();
    if (!e.repeat) Input.press(a); Input.kb[a] = true; Input.sync();
  });
  addEventListener("keyup", e => { const a = Input.map[e.code]; if (!a) return; Input.kb[a] = false; Input.sync(); });
  addEventListener("blur", () => { for (const k in Input.kb) Input.kb[k] = false; for (const k in Input.touch) Input.touch[k] = false; Input.sync(); });
  addEventListener("contextmenu", e => e.preventDefault());
})();
