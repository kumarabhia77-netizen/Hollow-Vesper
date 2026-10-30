"use strict";
(window.HV_V = window.HV_V || {}).touch = 10;
// The virtual gamepad for phones: a move pad on the left, face buttons (square, cross, circle, triangle) and two magic buttons on the right.
// Every control tracks its own finger, so several fingers can work at once. Layout, size, opacity and handedness can be customised and are saved.
const Touch = {
  DEF: { pad: { x: 2.5, y: 3, s: 24, v: 1, core: 1 }, attack: { x: 72, y: 9.5, s: 10.5, v: 1, core: 1 }, jump: { x: 79.5, y: 3, s: 10.5, v: 1, core: 1 }, dodge: { x: 87, y: 9.5, s: 10.5, v: 1, core: 1 },
    bell: { x: 79.5, y: 16.5, s: 9, v: 1 }, cast1: { x: 62, y: 4, s: 9, v: 1 }, cast2: { x: 62, y: 14.5, s: 7.5, v: 1 } },
  NAMES: { pad: "Move pad", attack: "Sword (square)", jump: "Jump (cross)", dodge: "Dash (circle)", bell: "Bell (triangle)", cast1: "Magic slot 1", cast2: "Magic slot 2" },
  GLYPH: { attack: "\u25A1", jump: "\u2715", dodge: "\u25CB", bell: "\u25B3" }, ART: { attack: "ui_sword", jump: "ui_jump", dodge: "ui_dash", bell: "ui_bell" },
  cfg: null, el: {}, st: {}, root: null, editing: false, sel: "attack", snap: null, drag: null, shown: null, cdv: {},
  defaults() { const o = { hand: "right", opacity: 0.9, mode: "dpad", dead: 0.22, sens: 1, ctl: {} }; for (const k in this.DEF) o.ctl[k] = Object.assign({}, this.DEF[k]); return o; },
  clean(c) {   // keep only sane saved values
    const o = this.defaults(), n = (v, a, b, d) => typeof v === "number" && v >= a && v <= b ? v : d; if (!c || typeof c !== "object") return o;
    o.hand = c.hand === "left" ? "left" : "right"; o.opacity = n(c.opacity, 0.3, 1, o.opacity); o.mode = c.mode === "stick" ? "stick" : "dpad"; o.dead = n(c.dead, 0.05, 0.6, o.dead); o.sens = n(c.sens, 0.5, 2, o.sens);
    if (c.ctl) for (const k in o.ctl) { const s = c.ctl[k]; if (!s) continue; const d = o.ctl[k]; d.s = n(s.s, 5, 36, d.s); d.x = n(s.x, 0, 100 - d.s, d.x); d.y = n(s.y, 0, 56, d.y); d.v = d.core ? 1 : (s.v === 0 ? 0 : 1); }
    return o;
  },
  init() {
    this.cfg = this.clean(Save.data.ctrl); this.root = document.getElementById("touch"); this.root.innerHTML = ""; const self = this;
    for (const id in this.DEF) {
      const e = document.createElement("div"); e.className = "tc " + (id === "pad" ? "tpad" : "tbtn"); e.dataset.id = id; e.style.touchAction = "none";
      if (id === "pad") e.innerHTML = '<i class="arr al">\u25C0</i><i class="arr ar">\u25B6</i><i class="arr au">\u25B2</i><i class="arr ad">\u25BC</i><b class="knob"></b>';
      else { if (this.ART[id]) e.style.backgroundImage = "url(assets/" + this.ART[id] + ".png)"; if (this.GLYPH[id]) e.innerHTML = '<span class="gl">' + this.GLYPH[id] + "</span>"; else e.innerHTML = '<img alt=""><span class="cdo"></span><span class="gl"></span>'; }
      e.addEventListener("pointerdown", ev => self.down(id, ev)); e.addEventListener("pointermove", ev => self.move(id, ev));
      for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) e.addEventListener(t, ev => self.up(id, ev));
      this.root.appendChild(e); this.el[id] = e;
    }
    this.apply(); this.icons(); this.bindPanel();
  },
  apply() {
    const c = this.cfg, left = c.hand === "left"; this.root.style.setProperty("--op", c.opacity);
    for (const id in this.el) { const s = c.ctl[id], e = this.el[id], x = left ? 100 - s.x - s.s : s.x;
      e.style.left = x + "cqw"; e.style.bottom = s.y + "cqw"; e.style.width = e.style.height = s.s + "cqw"; e.style.display = (s.v || this.editing) ? "" : "none"; e.classList.toggle("ghost", !s.v); e.classList.toggle("sel", this.editing && id === this.sel);
      if (id === "pad") e.classList.toggle("stick", c.mode === "stick"); }
  },
  icons() {   // show the equipped spells on the magic buttons
    ["cast1", "cast2"].forEach((id, i) => { const e = this.el[id], img = e.querySelector("img"), sp = Save.data.spells.slots[i]; if (sp) { img.src = Spells.icon(sp).src; img.style.visibility = "visible"; } else img.style.visibility = "hidden"; e.querySelector(".gl").textContent = i ? "2" : "1"; });
    this.el.bell.classList.toggle("lockd", !Spells.has("bell"));
  },
  cooldown(i, f, ready) { const id = i ? "cast2" : "cast1", e = this.el[id], q = Math.round(f * 20) / 20 + (ready ? 0 : 1); if (this.cdv[id] === q) return; this.cdv[id] = q; e.style.setProperty("--cd", (f * 100) + "%"); e.classList.toggle("noecho", !ready); },
  buzz() { try { if (Save.data.settings.vibrate && navigator.vibrate) navigator.vibrate(8); } catch (e) {} },
  down(id, ev) {
    ev.preventDefault(); if (this.editing) return this.dragStart(id, ev);
    const e = this.el[id]; if (this.st[id] !== undefined) return; this.st[id] = ev.pointerId; try { e.setPointerCapture(ev.pointerId); } catch (x) {} e.classList.add("on"); this.buzz();
    if (id === "pad") return this.padUpdate(ev);
    const T = Input.touch; if (id === "jump") { T.j = true; Input.press("jump"); } else Input.press({ attack: "attack", dodge: "dodge", bell: "bell", cast1: "cast1", cast2: "cast2" }[id]); Input.sync();
  },
  move(id, ev) { if (this.editing) return this.dragMove(id, ev); if (this.st[id] !== ev.pointerId) return; if (id === "pad") this.padUpdate(ev); },
  up(id, ev) {
    if (this.editing) return this.dragEnd(id, ev); if (this.st[id] !== ev.pointerId) return; delete this.st[id]; const e = this.el[id]; e.classList.remove("on");
    const T = Input.touch; if (id === "pad") { T.l = T.r = T.u = T.d = false; this.knob(0, 0); e.classList.remove("l", "r", "u", "d"); } else if (id === "jump") T.j = false; Input.sync();
  },
  padUpdate(ev) {   // slide your thumb across the pad: direction follows the thumb, no need to lift
    const e = this.el.pad, r = e.getBoundingClientRect(), dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2), thr = Math.max(0.06, Math.min(0.7, this.cfg.dead / this.cfg.sens));
    const T = Input.touch; T.l = dx < -thr; T.r = dx > thr; T.u = dy < -thr * 1.5; T.d = dy > thr * 1.5; Input.sync();
    e.classList.toggle("l", T.l); e.classList.toggle("r", T.r); e.classList.toggle("u", T.u); e.classList.toggle("d", T.d); this.knob(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
  },
  knob(dx, dy) { const k = this.el.pad.querySelector(".knob"); k.style.transform = "translate(" + dx * 30 + "%," + dy * 30 + "%)"; },
  // ----- customise mode -----
  dragStart(id, ev) { this.select(id); const e = this.el[id]; try { e.setPointerCapture(ev.pointerId); } catch (x) {} this.drag = { id, pid: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: this.cfg.ctl[id].x, oy: this.cfg.ctl[id].y }; },
  dragMove(id, ev) {
    const d = this.drag; if (!d || d.pid !== ev.pointerId) return; const k = 100 / document.getElementById("stage").getBoundingClientRect().width, c = this.cfg.ctl[id], sgn = this.cfg.hand === "left" ? -1 : 1;
    c.x = Math.max(0, Math.min(100 - c.s, Math.round(d.ox + sgn * (ev.clientX - d.sx) * k))); c.y = Math.max(0, Math.min(56 - c.s, Math.round(d.oy - (ev.clientY - d.sy) * k))); this.apply();
  },
  dragEnd(id, ev) { if (this.drag && this.drag.pid === ev.pointerId) this.drag = null; },
  select(id) { this.sel = id; this.apply(); this.fillPanel(); },
  edit(on) {
    this.editing = on; const p = document.getElementById("touchedit"); p.classList.toggle("hidden", !on); document.getElementById("stage").classList.toggle("editing", on);
    if (on) { this.snap = JSON.stringify(this.cfg); this.sel = "attack"; this.root.style.display = "block"; this.fillPanel(); } this.apply();
  },
  fillPanel() {
    const c = this.cfg, s = c.ctl[this.sel], $ = i => document.getElementById(i); $("te-name").textContent = this.NAMES[this.sel]; $("te-size").min = this.sel === "pad" ? 14 : 6; $("te-size").max = this.sel === "pad" ? 34 : 16; $("te-size").value = s.s;
    $("te-vis").checked = !!s.v; $("te-vis").disabled = !!this.DEF[this.sel].core; $("te-op").value = c.opacity; $("te-hand").checked = c.hand === "left"; $("te-mode").value = c.mode; $("te-dead").value = c.dead; $("te-sens").value = c.sens;
  },
  bindPanel() {
    const $ = i => document.getElementById(i), self = this, on = (id, ev, fn) => { const e = $(id); if (e && !e._b) { e._b = 1; e.addEventListener(ev, fn); } };
    on("te-size", "input", () => { const s = self.cfg.ctl[self.sel]; s.s = +$("te-size").value; s.x = Math.min(s.x, 100 - s.s); self.apply(); });
    on("te-vis", "change", () => { self.cfg.ctl[self.sel].v = $("te-vis").checked ? 1 : 0; self.apply(); });
    on("te-op", "input", () => { self.cfg.opacity = +$("te-op").value; self.apply(); }); on("te-hand", "change", () => { self.cfg.hand = $("te-hand").checked ? "left" : "right"; self.apply(); });
    on("te-mode", "change", () => { self.cfg.mode = $("te-mode").value; self.apply(); }); on("te-dead", "input", () => { self.cfg.dead = +$("te-dead").value; }); on("te-sens", "input", () => { self.cfg.sens = +$("te-sens").value; });
    on("te-reset", "click", () => UI.confirm("Reset the controller layout to the default?", () => { self.cfg = self.defaults(); self.apply(); self.fillPanel(); }));
    on("te-done", "click", () => { Save.data.ctrl = JSON.parse(JSON.stringify(self.cfg)); Save.save(); self.edit(false); UI.afterEdit(); });
    on("te-cancel", "click", () => { self.cfg = self.clean(JSON.parse(self.snap)); self.edit(false); UI.afterEdit(); });
  },
  want(state) {   // should the on-screen controller be visible now?
    if (this.editing) return true; if (state !== "play") return false; const m = Save.data.settings.touch;
    if (m === "off") return false; if (m === "on") return true; return !Input.pad && (("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0 || (window.matchMedia && matchMedia("(pointer:coarse)").matches));
  },
  sync(state) { const w = this.want(state); if (w === this.shown) return; this.shown = w; this.root.style.display = w ? "block" : "none"; if (!w) { for (const k in this.st) { try { this.el[k].classList.remove("on"); } catch (e) {} } this.st = {}; const T = Input.touch; T.l = T.r = T.u = T.d = T.j = false; Input.sync(); } }
};
                                                                                                                                                   
