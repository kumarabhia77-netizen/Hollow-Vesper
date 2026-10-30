"use strict";
(window.HV_V = window.HV_V || {}).spells = 10;
// The spell library. Everything the menus show (cost, cooldown, damage, range, unlock) comes from this list, and the game uses the same numbers.
// "impl: false" spells are planned: they are listed so you can see the roadmap, but they can not be cast.
const Spells = {
  CATS: [["all", "All"], ["offense", "Offensive"], ["defense", "Defensive"], ["move", "Movement"], ["bell", "Bell Resonance"], ["locked", "Locked"]],
  list: [
    { id: "fireball", name: "Ember Fireball", cat: "offense", impl: true, cost: 3, cd: 1.2, cast: 0.62, range: 150, dmg: 2, speed: 190, desc: "A glowing ember flies forward and bursts on the first enemy it meets.", unlock: "Known from the start.", need: () => true },
    { id: "wind", name: "Wind Slash", cat: "offense", impl: true, cost: 2, cd: 0.9, cast: 0.45, range: 120, dmg: 1, speed: 220, desc: "A fast curved blade of wind. It pierces through every enemy in its path.", unlock: "Awaken the second shrine.", need: s => s.shrines.length >= 2 },
    { id: "lightning", name: "Lightning Strike", cat: "offense", impl: true, cost: 4, cd: 3, cast: 0.5, range: 150, dmg: 3, delay: 0.35, desc: "A sign marks the ground, then lightning falls on the nearest enemy ahead. Heavy damage and a stagger.", unlock: "Defeat the Iron Sentinel.", need: s => s.sentinel },
    { id: "bell", name: "Bell Resonance", cat: "bell", impl: true, cost: 2, cd: 2.5, cast: 0.5, range: 90, dmg: 0, desc: "A pulse from the Warden's bell. It rings a nearby bell, which wakes hidden paths, and staggers enemies close to you.", unlock: "Ring the bell by the pit.", need: s => s.bell },
    { id: "tornado", name: "Fire Tornado", cat: "offense", impl: false, cost: 5, cd: 6, cast: 0.8, range: 100, dmg: 1, desc: "A column of fire that burns enemies inside it for a short time.", unlock: "Planned for a later update." },
    { id: "shield", name: "Ashen Shield", cat: "defense", impl: false, cost: 3, cd: 8, cast: 0.4, range: 0, dmg: 0, desc: "A temporary barrier of ash that absorbs hits.", unlock: "Planned for a later update." },
    { id: "echostep", name: "Echo Step", cat: "move", impl: false, cost: 1, cd: 2, cast: 0.2, range: 60, dmg: 0, desc: "A short step through danger. (The dash already covers this for now.)", unlock: "Planned for a later update." },
    { id: "lance", name: "Soul Lance", cat: "offense", impl: false, cost: 4, cd: 3, cast: 0.5, range: 220, dmg: 3, desc: "A narrow, long-range projectile.", unlock: "Planned for a later update." },
    { id: "rupture", name: "Ground Rupture", cat: "offense", impl: false, cost: 3, cd: 4, cast: 0.6, range: 140, dmg: 2, desc: "A low wave along the ground.", unlock: "Planned for a later update." },
    { id: "nova", name: "Abyssal Nova", cat: "offense", impl: false, cost: 6, cd: 12, cast: 1, range: 120, dmg: 5, desc: "A late-game burst of resonance.", unlock: "Planned for a later update." }
  ],
  cd: {}, effect: {}, _ic: {},
  def(id) { return this.list.find(s => s.id === id) || null; },
  has(id) { return Save.data.spells.unlocked.includes(id); },
  status(id) { const s = this.def(id); if (!s) return "unknown"; if (!s.impl) return "planned"; if (!this.has(id)) return "locked"; return (this.cd[id] || 0) > 0 ? "cooldown" : "ready"; },
  progress() { const d = Save.data; return { bell: d.bell, shrines: d.shrines, sentinel: d.sentinel, boss: d.boss }; },
  refresh() {   // unlock whatever the player has now earned; returns the names that were just unlocked
    const got = [], P = this.progress(), S = Save.data.spells;
    for (const s of this.list) if (s.impl && !this.has(s.id) && s.need(P)) { S.unlocked.push(s.id); got.push(s.name); const free = S.slots.indexOf(null); if (free >= 0 && s.cat !== "bell") S.slots[free] = s.id; }
    S.slots = S.slots.map(id => id && this.has(id) ? id : null); if (got.length) Save.save(); return got;
  },
  equip(id, slot) { const S = Save.data.spells; if (!this.has(id) || !this.def(id).impl || slot < 0 || slot > 1) return false; const o = S.slots.indexOf(id); if (o >= 0) S.slots[o] = S.slots[slot]; S.slots[slot] = id; Save.save(); return true; },
  unequip(slot) { Save.data.spells.slots[slot] = null; Save.save(); },
  tick(dt) { for (const k in this.cd) if (this.cd[k] > 0) this.cd[k] = Math.max(0, this.cd[k] - dt); },
  tryCast(slot, p) {   // 1 unlocked? 2 enough echo? 3 cooldown? 4 allowed right now? then start the casting animation
    const id = slot === "bell" ? "bell" : Save.data.spells.slots[slot], s = id && this.def(id);
    if (!s) { Fx.toast = { m: "No spell equipped in that slot", t: 1.6 }; return false; }
    if (!s.impl || !this.has(id)) return false;
    if (p.atk >= 0 || !p.ground || p.dodge >= 0 || p.dead || p.hurt > 0 || p.cast >= 0) return false;
    if ((this.cd[id] || 0) > 0) return false;
    if (p.echo < s.cost) { Fx.noEcho = 0.5; Sfx.play("clink"); return false; }
    p.cast = 0; p.castSpell = id; p.castFired = false; p.echo -= s.cost; this.cd[id] = s.cd; Sfx.play("cast"); return true;
  },
  refund(p) { if (p.cast >= 0 && !p.castFired && p.castSpell) { const s = this.def(p.castSpell); p.echo = Math.min(CFG.player.echoMax, p.echo + s.cost); this.cd[p.castSpell] = 0; } p.cast = -1; },   // interrupted before the spell left: give the cost back
  fire(id, p) { const f = this.effect[id]; if (f) f(p, this.def(id)); },
  icon(id) {   // a small original icon drawn in code, returned as an image (cached)
    if (this._ic[id]) return this._ic[id]; const S = 48, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
    x.fillStyle = "#1a1820"; x.beginPath(); x.arc(24, 24, 22, 0, 6.283); x.fill(); x.strokeStyle = "#5b5560"; x.lineWidth = 2; x.stroke();
    const bone = "#d9cfbd", ember = "#c8553d", F = (col, fn) => { x.fillStyle = col; x.beginPath(); fn(); x.fill(); };
    if (id === "fireball") { F(ember, () => { x.moveTo(24, 8); x.quadraticCurveTo(38, 22, 30, 36); x.quadraticCurveTo(24, 42, 18, 36); x.quadraticCurveTo(12, 24, 24, 8); }); F(bone, () => { x.arc(24, 30, 5, 0, 6.283); }); }
    else if (id === "wind") { x.strokeStyle = bone; x.lineWidth = 4; x.lineCap = "round"; x.beginPath(); x.arc(30, 24, 14, 2.2, 4.1); x.stroke(); x.strokeStyle = ember; x.lineWidth = 2; x.beginPath(); x.arc(30, 24, 8, 2.3, 4); x.stroke(); }
    else if (id === "lightning") { F(bone, () => { x.moveTo(28, 6); x.lineTo(15, 26); x.lineTo(23, 26); x.lineTo(19, 42); x.lineTo(34, 20); x.lineTo(25, 20); x.closePath(); }); }
    else if (id === "bell") { F(bone, () => { x.moveTo(12, 34); x.quadraticCurveTo(14, 12, 24, 10); x.quadraticCurveTo(34, 12, 36, 34); x.closePath(); }); F(ember, () => { x.arc(24, 37, 3, 0, 6.283); }); x.strokeStyle = ember; x.lineWidth = 1.5; x.beginPath(); x.arc(24, 24, 20, -0.6, 0.6); x.stroke(); }
    else if (id === "tornado") { x.strokeStyle = ember; x.lineWidth = 3; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(24, 14 + i * 8, 6 + i * 3, 3, 0, 0, 6.283); x.stroke(); } }
    else if (id === "shield") { F(bone, () => { x.moveTo(24, 8); x.lineTo(38, 14); x.lineTo(36, 30); x.quadraticCurveTo(30, 40, 24, 42); x.quadraticCurveTo(18, 40, 12, 30); x.lineTo(10, 14); x.closePath(); }); }
    else if (id === "echostep") { F(bone, () => { x.moveTo(10, 14); x.lineTo(24, 24); x.lineTo(10, 34); x.closePath(); }); F(ember, () => { x.moveTo(26, 14); x.lineTo(40, 24); x.lineTo(26, 34); x.closePath(); }); }
    else if (id === "lance") { F(bone, () => { x.moveTo(8, 38); x.lineTo(38, 10); x.lineTo(40, 14); x.lineTo(12, 40); x.closePath(); }); F(ember, () => { x.moveTo(40, 8); x.lineTo(44, 4); x.lineTo(42, 14); x.closePath(); }); }
    else if (id === "rupture") { x.strokeStyle = bone; x.lineWidth = 3; x.beginPath(); x.moveTo(6, 34); x.lineTo(18, 28); x.lineTo(24, 36); x.lineTo(32, 26); x.lineTo(42, 34); x.stroke(); x.strokeStyle = ember; x.beginPath(); x.moveTo(24, 36); x.lineTo(24, 14); x.stroke(); }
    else { F(ember, () => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.lineTo(24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18); x.lineTo(24 + Math.cos(a + 0.39) * 7, 24 + Math.sin(a + 0.39) * 7); } }); }
    const im = new Image(); im.src = c.toDataURL(); this._ic[id] = im; return im;
  }
};
