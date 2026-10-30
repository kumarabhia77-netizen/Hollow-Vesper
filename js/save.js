"use strict";
(window.HV_V = window.HV_V || {}).save = 10;
// Saved progress, settings and controller layout (kept in the browser's localStorage). Missing or broken data falls back to safe defaults.
const Save = {
  KEY: "hollow_vesper_save_v1", data: null,
  defaults() {
    return { v: 1, started: false, discovered: ["gate"], shrines: [], bell: false, sentinel: false, boss: false, cp: null, mapSeen: false,
      spells: { unlocked: ["fireball"], slots: ["fireball", null] },
      settings: { music: 0.55, sfx: 0.9, shake: true, touch: "auto", vibrate: true, lite: null },
      ctrl: null, bindings: {} };
  },
  load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { d = null; }
    const o = this.defaults(); if (d && typeof d === "object") {
      const strs = a => Array.isArray(a) ? a.filter(x => typeof x === "string").slice(0, 60) : null, num = (v, a, b, df) => typeof v === "number" && v >= a && v <= b ? v : df;
      if (strs(d.discovered)) o.discovered = strs(d.discovered); if (strs(d.shrines)) o.shrines = strs(d.shrines).map(Number).filter(n => n >= 0 && n < 400);
      for (const k of ["started", "bell", "sentinel", "boss", "mapSeen"]) if (typeof d[k] === "boolean") o[k] = d[k];
      if (d.cp && typeof d.cp.x === "number" && d.cp.x >= 0 && d.cp.x < 6000) o.cp = { x: d.cp.x };
      if (d.spells && strs(d.spells.unlocked)) o.spells.unlocked = strs(d.spells.unlocked);
      if (d.spells && Array.isArray(d.spells.slots)) o.spells.slots = [0, 1].map(i => typeof d.spells.slots[i] === "string" ? d.spells.slots[i] : null);
      if (d.settings && typeof d.settings === "object") { const s = d.settings; o.settings.music = num(s.music, 0, 1, o.settings.music); o.settings.sfx = num(s.sfx, 0, 1, o.settings.sfx);
        if (typeof s.shake === "boolean") o.settings.shake = s.shake; if (typeof s.vibrate === "boolean") o.settings.vibrate = s.vibrate; if (["auto", "on", "off"].includes(s.touch)) o.settings.touch = s.touch; if (typeof s.lite === "boolean") o.settings.lite = s.lite; }
      if (d.ctrl && typeof d.ctrl === "object") o.ctrl = d.ctrl;   // validated by Touch.init
      if (d.bindings && typeof d.bindings === "object") for (const k in d.bindings) if (Array.isArray(d.bindings[k]) && d.bindings[k].every(x => typeof x === "string")) o.bindings[k] = d.bindings[k].slice(0, 3);
    }
    if (!o.spells.unlocked.includes("fireball")) o.spells.unlocked.push("fireball");
    return this.data = o;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  newGame() { const keep = { settings: this.data.settings, ctrl: this.data.ctrl, bindings: this.data.bindings, mapSeen: this.data.mapSeen }; this.data = Object.assign(this.defaults(), keep); this.save(); }
};
Save.load();
