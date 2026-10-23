"use strict";
// Keyboard and touch buttons both feed one Input object.
const Input = { left: false, right: false, jump: false, jumpP: false, atkP: false, pauseP: false,
  endFrame() { this.jumpP = this.atkP = this.pauseP = false; } };
(function () {
  const map = { ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r", Space: "j", ArrowUp: "j", KeyW: "j",
    KeyJ: "a", KeyX: "a", KeyZ: "a", KeyP: "p", Escape: "p", F3: "d" };
  const key = {}, touch = {};
  const sync = () => { Input.left = !!(key.l || touch.l); Input.right = !!(key.r || touch.r); Input.jump = !!(key.j || touch.j); };
  const press = k => { if (k === "j") Input.jumpP = true; if (k === "a") Input.atkP = true; if (k === "p") Input.pauseP = true; };
  addEventListener("keydown", e => { const k = map[e.code]; if (!k) return; e.preventDefault();
    if (!e.repeat) { press(k); if (k === "d") CFG.debug = !CFG.debug; } key[k] = true; sync(); });
  addEventListener("keyup", e => { const k = map[e.code]; if (!k) return; key[k] = false; sync(); });
  document.querySelectorAll("[data-btn]").forEach(b => {
    const k = b.dataset.btn, up = () => { touch[k] = false; sync(); };
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); touch[k] = true; press(k); sync(); });
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  });
  addEventListener("contextmenu", e => e.preventDefault());
  addEventListener("blur", () => { for (const k in key) key[k] = false; for (const k in touch) touch[k] = false; sync(); });
})();
