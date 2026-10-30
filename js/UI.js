"use strict";
(window.HV_V = window.HV_V || {}).ui = 10;
// Menus: pause, world map, magic library, controls, settings and the confirm box. Opened and closed from the pause state.
const $ = id => document.getElementById(id);
const UI = {
  IDS: { pause: "pause", map: "s-map", magic: "s-magic", controls: "s-controls", settings: "s-settings" }, stack: [], game: null, yes: null, ready: false,
  init(game) {
    this.game = game; if (this.ready) return; this.ready = true;
    $("pause").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.ui) this.open(b.dataset.ui); });
    document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => this.back()));
    $("confirm-yes").addEventListener("click", () => { $("confirm").classList.add("hidden"); const f = this.yes; this.yes = null; if (f) f(); }); $("confirm-no").addEventListener("click", () => { $("confirm").classList.add("hidden"); this.yes = null; });
    addEventListener("keydown", e => { if (!this.stack.length) return; if (e.code === "ArrowDown" || e.code === "ArrowUp") { if (document.activeElement && document.activeElement.type === "range") return; e.preventDefault(); this.focusMove(e.code === "ArrowDown" ? 1 : -1); } });
    Settings.init(); ControlsView.init(); MagicView.init(); MapView.init();
  },
  show(name) { for (const k in this.IDS) $(this.IDS[k]).classList.toggle("hidden", k !== name); setTimeout(() => this.focusFirst(), 30); },
  openPause(name) { this.stack = ["pause"]; this.show("pause"); if (name) this.open(name); },
  open(name) {
    if (this.stack[this.stack.length - 1] === name) return; this.stack.push(name); this.show(name);
    if (name === "map") MapView.open(); if (name === "magic") MagicView.open(); if (name === "controls") ControlsView.open(); if (name === "settings") Settings.open();
  },
  back() {
    if (!$("confirm").classList.contains("hidden")) { $("confirm").classList.add("hidden"); return; }
    const was = this.stack.pop(); if (was === "map") MapView.close(); if (!this.stack.length) { this.game.resume(); return; } this.show(this.stack[this.stack.length - 1]);
  },
  closeAll() { for (const k in this.IDS) $(this.IDS[k]).classList.add("hidden"); $("confirm").classList.add("hidden"); this.stack = []; MapView.close(); },
  afterEdit() { this.show("controls"); },   // back from the layout editor
  confirm(msg, yes) { $("confirm-msg").textContent = msg; this.yes = yes; $("confirm").classList.remove("hidden"); setTimeout(() => $("confirm-no").focus(), 20); },
  focusables() { const top = $("confirm").classList.contains("hidden") ? $(this.IDS[this.stack[this.stack.length - 1]] || "pause") : $("confirm"); return [...top.querySelectorAll("button:not([disabled]),input,select")].filter(e => e.offsetParent !== null); },
  focusFirst() { const f = this.focusables(); if (f[0]) f[0].focus(); },
  focusMove(d) { const f = this.focusables(); if (!f.length) return; let i = f.indexOf(document.activeElement); i = i < 0 ? 0 : (i + d + f.length) % f.length; f[i].focus(); },
  nav() {   // gamepad menu navigation (called every frame while paused)
    if (!this.stack.length && $("confirm").classList.contains("hidden")) return;
    if (Input.navD) this.focusMove(1); if (Input.navU) this.focusMove(-1); if (Input.navOK && document.activeElement && document.activeElement.click) document.activeElement.click(); if (Input.navBack) this.back();
  }
};

// ---------------- Settings ----------------
const Settings = {
  init() {
    const S = () => Save.data.settings, self = this;
    $("s-music").addEventListener("input", () => { S().music = +$("s-music").value; Music.setVol(S().music); Save.save(); });
    $("s-sfx").addEventListener("input", () => { S().sfx = +$("s-sfx").value; Sfx.setVol(S().sfx); Save.save(); Sfx.play("step"); });
    $("s-shake").addEventListener("change", () => { S().shake = $("s-shake").checked; Fx.shakeOn = S().shake; Save.save(); });
    $("s-touch").addEventListener("change", () => { S().touch = $("s-touch").value; Save.save(); });
    $("s-vib").addEventListener("change", () => { S().vibrate = $("s-vib").checked; Save.save(); });
    $("s-lite").addEventListener("change", () => { const v = $("s-lite").value === "light"; S().lite = v; Music.lite = v; Save.save(); $("s-litenote").textContent = "Applies the next time the game is opened."; });
  },
  apply() { const s = Save.data.settings; Music.setVol(s.music); Sfx.setVol(s.sfx); Fx.shakeOn = s.shake; if (s.lite !== null) Music.lite = s.lite; },
  open() { const s = Save.data.settings; $("s-music").value = s.music; $("s-sfx").value = s.sfx; $("s-shake").checked = s.shake; $("s-touch").value = s.touch; $("s-vib").checked = s.vibrate; $("s-lite").value = Music.lite ? "light" : "full"; $("s-litenote").textContent = ""; }
};

// ---------------- Controls ----------------
const ControlsView = {
  init() {
    $("c-edit").addEventListener("click", () => { for (const k in UI.IDS) $(UI.IDS[k]).classList.add("hidden"); Touch.edit(true); });
    $("c-reset").addEventListener("click", () => UI.confirm("Reset the controller layout to the default?", () => { Touch.cfg = Touch.defaults(); Save.data.ctrl = JSON.parse(JSON.stringify(Touch.cfg)); Save.save(); Touch.apply(); Touch.icons(); }));
    $("c-touch").addEventListener("change", () => { Save.data.settings.touch = $("c-touch").value; Save.save(); });
    $("c-keys").addEventListener("click", e => { const b = e.target.closest("button[data-act]"); if (!b) return; b.textContent = "press a key..."; Input.capture(b.dataset.act, () => this.keys()); });
    $("c-keyreset").addEventListener("click", () => { Save.data.bindings = {}; Save.save(); Input.rebuild(); this.keys(); });
  },
  open() { $("c-touch").value = Save.data.settings.touch; this.keys(); $("c-pad").textContent = Input.pad ? "A game controller is connected." : "No game controller found. Plug one in or pair one by Bluetooth and press a button."; },
  keys() { $("c-keys").innerHTML = Object.keys(Input.DEF).map(a => '<div class="krow"><span>' + Input.NAMES[a] + '</span><button data-act="' + a + '">' + Input.keysFor(a).map(k => k.replace("Key", "").replace("Arrow", "\u2192 ").replace("Space", "Space")).join(" / ") + "</button></div>").join(""); }
};

// ---------------- Magic library ----------------
const MagicView = {
  cat: "all", page: 0, sel: null, PER: 6,
  init() {
    $("mtabs").addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (!b) return; this.cat = b.dataset.c; this.page = 0; this.render(); });
    $("mgrid").addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (!b) return; this.sel = b.dataset.id; this.render(); });
    $("mdetail").addEventListener("click", e => { const b = e.target.closest("button[data-eq]"); if (!b) return; const v = b.dataset.eq; if (v === "off") { const i = Save.data.spells.slots.indexOf(this.sel); if (i >= 0) Spells.unequip(i); } else Spells.equip(this.sel, +v); Touch.icons(); this.render(); });
    $("mprev").addEventListener("click", () => { if (this.page > 0) { this.page--; this.render(); } }); $("mnext").addEventListener("click", () => { this.page++; this.render(); });
  },
  open() { this.render(); },
  list() { const all = Spells.list; if (this.cat === "all") return all; if (this.cat === "locked") return all.filter(s => !s.impl || !Spells.has(s.id)); return all.filter(s => s.cat === this.cat); },
  render() {
    const l = this.list(), pages = Math.max(1, Math.ceil(l.length / this.PER)); this.page = Math.max(0, Math.min(pages - 1, this.page)); const slots = Save.data.spells.slots;
    $("mtabs").innerHTML = Spells.CATS.map(([k, n]) => '<button data-c="' + k + '"' + (k === this.cat ? ' class="act"' : "") + ">" + n + "</button>").join("");
    $("mgrid").innerHTML = l.slice(this.page * this.PER, this.page * this.PER + this.PER).map(s => { const st = Spells.status(s.id), q = slots.indexOf(s.id);
      return '<button class="mt ' + st + (s.id === this.sel ? " sel" : "") + '" data-id="' + s.id + '"><img src="' + Spells.icon(s.id).src + '" alt=""><span class="nm">' + s.name + '</span><span class="ct">Cost ' + s.cost + "</span><span class=\"stt\">" +
        (q >= 0 ? "Equipped " + (q + 1) : st === "planned" ? "Planned" : st === "locked" ? "Locked" : st === "cooldown" ? "Recharging" : "Ready") + "</span></button>"; }).join("");
    $("mpage").textContent = "Page " + (this.page + 1) + " / " + pages; $("mprev").disabled = this.page <= 0; $("mnext").disabled = this.page >= pages - 1;
    const pl = Fx.pl; $("mecho").textContent = "Echo " + (pl ? pl.echo : 0) + " / " + CFG.player.echoMax;
    const s = this.sel && Spells.def(this.sel); if (!s) { $("mdetail").innerHTML = "<p class=\"dim\">Choose a spell to see its details.</p>"; return; }
    const st = Spells.status(s.id), q = slots.indexOf(s.id), can = s.impl && Spells.has(s.id) && s.cat !== "bell";
    $("mdetail").innerHTML = '<div class="dh"><img src="' + Spells.icon(s.id).src + '" alt=""><div><b>' + s.name + "</b><br><span class=\"dim\">" + ({ planned: "Planned (not castable yet)", locked: "Locked", ready: "Unlocked", cooldown: "Unlocked" }[st]) + (q >= 0 ? ", equipped in slot " + (q + 1) : "") + "</span></div></div><p>" + s.desc + "</p>" +
      '<table><tr><td>Cost</td><td>' + s.cost + " echo</td></tr><tr><td>Cooldown</td><td>" + s.cd + " s</td></tr><tr><td>Cast time</td><td>" + s.cast + " s</td></tr><tr><td>Range</td><td>" + (s.range || "-") + "</td></tr><tr><td>Damage</td><td>" + (s.dmg || "none") + "</td></tr><tr><td>Unlock</td><td>" + s.unlock + "</td></tr><tr><td>Upgrades</td><td>None yet</td></tr></table>" +
      (can ? '<div class="eq"><button data-eq="0">Equip to slot 1</button><button data-eq="1">Equip to slot 2</button>' + (q >= 0 ? '<button data-eq="off">Unequip</button>' : "") + "</div>" : s.cat === "bell" && s.impl ? "<p class=\"dim\">Use it with the triangle button (or key B).</p>" : "");
  }
};

// ---------------- World map ----------------
const MapView = {
  cv: null, cx: null, t: { x: 0, y: 0, s: 1 }, ptrs: new Map(), pd: 0, timer: null, region: 0, U: 12, ready: false,
  regions() { return CFG.level.regions; },
  init() {
    this.cv = $("mapc"); this.cx = this.cv.getContext("2d"); const cv = this.cv, self = this;
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); self.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); self.pd = 0; });
    cv.addEventListener("pointermove", e => { const p = self.ptrs.get(e.pointerId); if (!p) return; const d = self.dpr || 1;
      if (self.ptrs.size === 1) { self.t.x += (e.clientX - p.x) * d; self.t.y += (e.clientY - p.y) * d; }
      else if (self.ptrs.size === 2) { const o = [...self.ptrs.entries()].find(([id]) => id !== e.pointerId)[1], dist0 = Math.hypot(p.x - o.x, p.y - o.y), dist1 = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (dist0 > 4) self.zoom(dist1 / dist0, ((e.clientX + o.x) / 2 - cv.getBoundingClientRect().left) * d, ((e.clientY + o.y) / 2 - cv.getBoundingClientRect().top) * d); }
      p.x = e.clientX; p.y = e.clientY; self.draw(); });
    for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(t, e => self.ptrs.delete(e.pointerId));
    cv.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(), d = self.dpr || 1; self.zoom(e.deltaY < 0 ? 1.15 : 0.87, (e.clientX - r.left) * d, (e.clientY - r.top) * d); self.draw(); }, { passive: false });
    $("zin").addEventListener("click", () => { this.zoom(1.3); this.draw(); }); $("zout").addEventListener("click", () => { this.zoom(0.77); this.draw(); }); $("zc").addEventListener("click", () => { this.center(); this.draw(); });
    $("rprev").addEventListener("click", () => { if (this.region > 0) { this.region--; this.fit(); this.draw(); } }); $("rnext").addEventListener("click", () => { if (this.region < this.regions().length - 1) { this.region++; this.fit(); this.draw(); } });
    $("maphintok").addEventListener("click", () => { Save.data.mapSeen = true; Save.save(); $("maphint").classList.add("hidden"); });
    $("legend").innerHTML = '<span><b>\u25C6</b> Shrine</span><span><b>\u25B2</b> Bell</span><span><b>\u25A3</b> Boss arena</span><span><b>\u25AD</b> Locked passage</span><span><b>?</b> Unexplored route</span><span><b>\u25CF</b> You are here</span>';
    addEventListener("resize", () => { if (this.timer) { this.size(); this.draw(); } });
  },
  size() { const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.cv.width = Math.max(50, Math.round(r.width * this.dpr)); this.cv.height = Math.max(50, Math.round(r.height * this.dpr)); },
  open() {
    this.size(); this.region = Math.max(0, this.regions().findIndex(r => r.areas.includes(this.areaId()))); this.fit(); this.draw(); if (!this.timer) this.timer = setInterval(() => this.draw(), 120);
    $("maphint").classList.toggle("hidden", !!Save.data.mapSeen);
  },
  close() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.ptrs.clear(); },
  areaId() { const p = Fx.pl, col = p ? p.x / CFG.T : 0, a = CFG.level.areas.find(a => col >= a.c[0] && col < a.c[1]); return a ? a.id : CFG.level.areas[0].id; },
  bounds() { const R = this.regions()[this.region], as = CFG.level.areas.filter(a => R.areas.includes(a.id)); return { x0: Math.min(...as.map(a => a.c[0])) * this.U, x1: Math.max(...as.map(a => a.c[1])) * this.U }; },
  fit() { const b = this.bounds(), w = this.cv.width, h = this.cv.height, s = Math.max(0.2, (w - 40) / (b.x1 - b.x0 + 40)); this.t.s = s; this.t.x = 20 - (b.x0 - 20) * s; this.t.y = h * 0.68; this.minS = s * 0.7; },
  center() { const p = Fx.pl; if (!p) return; this.t.x = this.cv.width / 2 - (p.x / CFG.T * this.U) * this.t.s; this.t.y = this.cv.height * 0.68; },
  zoom(f, px, py) { const t = this.t, ns = Math.max(this.minS || 0.2, Math.min(5, t.s * f)); f = ns / t.s; px = px === undefined ? this.cv.width / 2 : px; py = py === undefined ? this.cv.height / 2 : py; t.x = px - (px - t.x) * f; t.y = py - (py - t.y) * f; t.s = ns; },
  draw() {
    const cx = this.cx, cv = this.cv, L = CFG.level, U = this.U, W = Fx.pl ? null : null, D = Save.data.discovered, R = this.regions()[this.region]; if (!cv.width) return;
    cx.setTransform(1, 0, 0, 1, 0, 0); const g = cx.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, "#2a2630"); g.addColorStop(1, "#16141b"); cx.fillStyle = g; cx.fillRect(0, 0, cv.width, cv.height);
    cx.setTransform(this.t.s, 0, 0, this.t.s, this.t.x, this.t.y); cx.lineJoin = "round"; const world = Game.world, pl = Fx.pl, curId = this.areaId(), time = performance.now() / 1000;
    const areas = L.areas.filter(a => R.areas.includes(a.id)), idx = a => L.areas.indexOf(a);
    for (const a of areas) { const seen = D.includes(a.id), x0 = a.c[0] * U, x1 = a.c[1] * U, nb = [L.areas[idx(a) - 1], L.areas[idx(a) + 1]].some(n => n && D.includes(n.id));
      if (!seen) { if (!nb) continue; cx.setLineDash([6, 5]); cx.strokeStyle = "#5b5560"; cx.lineWidth = 2; cx.strokeRect(x0 + 3, -130, x1 - x0 - 6, 170); cx.setLineDash([]); cx.fillStyle = "#5b5560"; cx.font = "bold 34px Georgia,serif"; cx.textAlign = "center"; cx.fillText("?", (x0 + x1) / 2, -40); continue; }
      const p = cx.createLinearGradient(0, -130, 0, 40); p.addColorStop(0, "rgba(217,207,189,.22)"); p.addColorStop(1, "rgba(217,207,189,.07)"); cx.fillStyle = p; cx.fillRect(x0 + 3, -130, x1 - x0 - 6, 170);
      cx.strokeStyle = a.id === curId ? "#c8553d" : "#8d8374"; cx.lineWidth = a.id === curId ? 3 : 2; cx.strokeRect(x0 + 3, -130, x1 - x0 - 6, 170);
      cx.fillStyle = "#d9cfbd"; cx.font = "13px Georgia,serif"; cx.textAlign = "left"; cx.fillText(a.name, x0 + 10, -112);
      // ground line from the real level data (a gap where the pit is)
      cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 2.5; cx.beginPath(); const pit0 = L.pit[0] * U, pit1 = (L.pit[0] + L.pit[1]) * U;
      if (a.type === "chasm") { cx.moveTo(x0 + 3, 0); cx.lineTo(Math.max(x0 + 3, pit0), 0); cx.moveTo(Math.min(x1 - 3, pit1), 0); cx.lineTo(x1 - 3, 0); } else { cx.moveTo(x0 + 3, 0); cx.lineTo(x1 - 3, 0); } cx.stroke();
      cx.fillStyle = "rgba(12,11,17,.5)"; if (a.type !== "chasm") cx.fillRect(x0 + 3, 1, x1 - x0 - 6, 38);
      for (const [px, py, pw] of L.platforms) if (px * U >= x0 && px * U < x1) { cx.fillStyle = "#8d8374"; cx.fillRect(px * U, (py - L.ground) * 7, pw * U, 4); } }
    // the hidden bridge: dashed question marks until the bell is rung, then a drawn bridge
    const bx = L.bridge[0] * U, bw = L.bridge[1] * U; if (D.includes("span")) { if (world.bridge) { cx.strokeStyle = "#d9cfbd"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx + bw, 0); cx.stroke(); } else { cx.setLineDash([4, 6]); cx.strokeStyle = "#c8553d"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx + bw, 0); cx.stroke(); cx.setLineDash([]); cx.fillStyle = "#c8553d"; cx.font = "bold 22px Georgia,serif"; cx.textAlign = "center"; cx.fillText("?", bx + bw / 2, -10); } }
    const mark = (shape, x, y, col, filled) => { cx.fillStyle = col; cx.strokeStyle = col; cx.lineWidth = 2.5; cx.beginPath();
      if (shape === "diamond") { cx.moveTo(x, y - 9); cx.lineTo(x + 7, y); cx.lineTo(x, y + 9); cx.lineTo(x - 7, y); cx.closePath(); } else if (shape === "tri") { cx.moveTo(x, y - 9); cx.lineTo(x + 8, y + 7); cx.lineTo(x - 8, y + 7); cx.closePath(); } else if (shape === "box") { cx.rect(x - 8, y - 8, 16, 16); cx.moveTo(x - 5, y - 5); cx.lineTo(x + 5, y + 5); cx.moveTo(x + 5, y - 5); cx.lineTo(x - 5, y + 5); } else { cx.rect(x - 5, y - 8, 10, 14); }
      if (filled) cx.fill(); cx.stroke(); };
    const inD = col => { const a = L.areas.find(a => col >= a.c[0] && col < a.c[1]); return a && D.includes(a.id); };
    for (const c of L.shrines) if (inD(c)) mark("diamond", (c + 1) * U, -16, world.shrines.has(c) ? "#c8553d" : "#8d8374", world.shrines.has(c));
    if (inD(L.bell)) mark("tri", (L.bell + 1) * U, -16, world.bridge ? "#d9cfbd" : "#8d8374", world.bridge);
    const bossCol = L.enemies.find(e => e[1] === "keeper")[0]; if (inD(bossCol)) { mark("box", bossCol * U, -22, Save.boss || Save.data.boss ? "#8d8374" : "#6b1d24", false); if (Save.data.boss) { cx.fillStyle = "#d9cfbd"; cx.font = "14px Georgia,serif"; cx.textAlign = "center"; cx.fillText("\u2713 defeated", bossCol * U, 4 + 14); } }
    if (inD(L.gate[0])) mark("lock", L.gate[0] * U, -40, world.gate ? "#c8553d" : "#8d8374", world.gate);
    if (pl) { const px = pl.x / CFG.T * U, py = -6 + Math.sin(time * 4) * 1.5; cx.fillStyle = "#d9cfbd"; cx.beginPath(); cx.arc(px, py - 4, 6.5, 0, 6.283); cx.fill(); cx.strokeStyle = "#c8553d"; cx.lineWidth = 2.5; cx.stroke(); cx.fillStyle = "#c8553d"; cx.beginPath(); cx.moveTo(px + pl.face * 11, py - 4); cx.lineTo(px + pl.face * 5, py - 9); cx.lineTo(px + pl.face * 5, py + 1); cx.closePath(); cx.fill(); }
    const cur = L.areas.find(a => a.id === curId); $("curarea").textContent = "You are in: " + (cur ? cur.name : "?") + "   |   Discovered " + D.length + " of " + L.areas.length + " areas";
    $("rname").textContent = R.name; $("rprev").disabled = this.region <= 0; $("rnext").disabled = this.region >= this.regions().length - 1; $("rnote").textContent = this.regions().length < 2 ? "More regions will appear here when new levels are added." : "";
  }
};
      
