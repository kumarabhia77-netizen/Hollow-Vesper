"use strict";
(window.HV_V = window.HV_V || {}).main = 10;
// Game flow: menu -> play -> pause (menus) / dead / win. Fixed 60 updates per second keeps physics steady.
// Everything that can go wrong is caught, so one problem never freezes the game.
(function () {
  const T = CFG.T, L = CFG.level, world = new World(L), shown = {};
  let player, enemies = [], boss = null, cam = 0, state = "menu", acc = 0, last = 0, time = 0, cp = { x: L.spawn[0] * T }, fight = false, won = false, endT = 0, bellCd = 0, loaded = false;
  const bellRect = { x: L.bell * T + 2, y: L.ground * T - 36, w: 24, h: 36 };
  const toast = m => { Fx.toast = { m, t: 3 }; };
  function report(e, label) {   // show a problem once, keep playing
    const m = (label ? label + ": " : "") + (e && e.message ? e.message : String(e)); if (shown[m]) return; shown[m] = 1;
    const b = $("err"); b.textContent = (window.HV_MSG ? window.HV_MSG + " | " : "") + "Problem: " + m + ". The game keeps running. If it looks wrong, reload; if it keeps happening, send this text to your helper."; b.classList.remove("hidden");
  }
  Settings.apply(); Render.init(world); Touch.init(); Input.rebuild();

  // ---------- progress ----------
  function persist() { const d = Save.data; d.started = true; d.shrines = [...world.shrines]; d.bell = world.bridge; d.boss = won; d.cp = { x: cp.x }; Save.save(); }
  function unlocks() { const got = Spells.refresh(); if (got.length) { toast("Spell unlocked: " + got[0] + " (open the Magic menu)"); Touch.icons(); Sfx.play("shrine"); } }
  function discover() {
    const col = player.x / T, a = L.areas.find(a => col >= a.c[0] && col < a.c[1]); if (!a || Save.data.discovered.includes(a.id)) return;
    Save.data.discovered.push(a.id); toast("Discovered: " + a.name); persist();
  }
  // ---------- spawning ----------
  function spawn() {
    const mk = (type, c) => { const x = c * T, y = L.ground * T - (type === "keeper" ? CFG.boss.h : CFG.enemies[type].h);
      return type === "keeper" ? new Boss(x, y) : type === "bound" ? new Bound(x, y) : type === "mourner" ? new Mourner(x, y) : type === "sentinel" ? new Sentinel(x, y) : new Enemy(type, x, y); };
    enemies = L.enemies.filter(e => !(e[1] === "keeper" && won)).map(([c, t]) => mk(t, c)).concat(L.chimes.map(([c, r]) => new Chime(c * T, r * T)));
    if (world.bridge) enemies.forEach(e => { if (e.chime) e.wake(); });
    boss = enemies.find(e => e.boss) || null; fight = false; world.gate = false; Fx.waves = [];
  }
  function respawn() {   // after death: back at the last shrine; bell, bridge and map progress stay
    player = new Player(cp.x, L.ground * T - CFG.player.h); Fx.pl = player; spawn(); Fx.parts = []; Fx.ghosts = []; Fx.rings = []; Fx.fx = []; Fx.bolts = []; Fx.strikes = []; Fx.shake = 0; Fx.hitstop = 0; Fx.flash = 0; Spells.cd = {};
    cam = Math.max(0, Math.min(world.w - CFG.W, cp.x - CFG.W / 2)); Touch.icons();
  }
  function newGame() { Save.newGame(); world.bridge = false; world.bridgeT = 0; world.shrines = new Set(); won = false; cp = { x: L.spawn[0] * T }; Fx.toast = null; respawn(); Spells.refresh(); Touch.icons(); }
  function loadGame() { const d = Save.data; world.bridge = d.bell; world.bridgeT = 99; world.shrines = new Set(d.shrines); won = d.boss; cp = d.cp ? { x: d.cp.x } : { x: L.spawn[0] * T }; Fx.toast = null; respawn(); Spells.refresh(); Touch.icons(); }
  // ---------- state ----------
  function setState(s) {
    state = s; for (const id of ["menu", "dead", "win"]) $(id).classList.toggle("hidden", s !== id); $("pbtn").classList.toggle("hidden", s !== "play");
    Music.setMode(s === "menu" || s === "pause" || s === "win" ? "menu" : s === "dead" ? "dead" : fight ? "boss" : "game"); Touch.sync(s);
    if (s !== "pause") UI.closeAll();
  }
  function pause(open) { if (state !== "play") return; Input.touch.l = Input.touch.r = Input.touch.j = false; Input.sync(); setState("pause"); UI.openPause(open); }
  UI.init({ resume() { setState("play"); } });
  // ---------- world events ----------
  function ring() {   // the bell: strike it (or use Bell Resonance near it) and a hidden bridge answers
    bellCd = 0.8; const x = bellRect.x + 12, y = bellRect.y + 14;
    Fx.rings.push({ x, y, life: 1, d: 1, c: "#d9cfbd", r: 6, g: 140 }); Fx.rings.push({ x, y, life: 0.7, d: 0.7, c: "#c8553d", r: 4, g: 90 });
    Fx.shake = 0.3; Sfx.play("bell"); ember(x, y - 6, 12); vfx("bellres", x, y - 6, 1.1, 0.7);
    for (let i = 0; i < L.bridge[1]; i += 3) vfx("rune", (L.bridge[0] + i) * T + 8, L.ground * T - 1, 1.2, 0.25, { delay: 0.2 + i * 0.05 });
    enemies.forEach(e => { if (e.chime) e.wake(); });   // the bell wakes the chimes
    if (!world.bridge) { world.bridge = true; world.bridgeT = 0; toast("The bell rings. A bridge answers."); }
    persist(); unlocks();
  }
  function activate(col) {
    world.shrines.add(col); cp = { x: col * T + 8 }; player.hp = Math.min(CFG.player.hp, player.hp + 2);
    Fx.rings.push({ x: col * T + 15, y: L.ground * T - 10, life: 0.8, d: 0.8, c: "#c8553d", r: 6, g: 40 }); ember(col * T + 15, L.ground * T - 20, 14); Sfx.play("shrine"); toast("Shrine awakened"); persist(); unlocks();
  }
  function fall() {   // into the pit: lose one health and return to the last shrine
    player.hp = Math.max(0, player.hp - 1); Fx.shake = 0.3;
    if (player.hp === 0) { player.dead = true; Sfx.play("die"); return; }
    Object.assign(player, { x: cp.x, y: L.ground * T - player.h, vx: 0, vy: 0, inv: 0.8, hurt: 0, dodge: -1, atk: -1, cast: -1 }); Sfx.play("hurt"); toast("You fell");
  }
  // ---------- spell effects (numbers come from spells.js) ----------
  Spells.effect.fireball = (p, sp) => { Fx.bolts.push({ kind: "fire", x: p.face > 0 ? p.x + p.w + 6 : p.x - 6, y: p.y + 13, dir: p.face, life: sp.range / sp.speed + 0.2, t: 0, dmg: sp.dmg, speed: sp.speed }); Sfx.play("bolt"); Fx.shake = Math.max(Fx.shake, 0.1); };
  Spells.effect.wind = (p, sp) => { Fx.bolts.push({ kind: "wind", x: p.face > 0 ? p.x + p.w + 4 : p.x - 4, y: p.y + 14, dir: p.face, life: sp.range / sp.speed, t: 0, dmg: sp.dmg, speed: sp.speed, hit: new Set() }); Sfx.play("whoosh"); };
  Spells.effect.lightning = (p, sp) => {
    let tx = p.x + 6 + p.face * 70, best = 1e9;
    for (const e of enemies) if (e.alive() && e.st !== "sleep") { const dx = (e.x + e.w / 2) - (p.x + 6); if (dx * p.face > -4 && Math.abs(dx) <= sp.range && Math.abs(dx) < best) { best = Math.abs(dx); tx = e.x + e.w / 2; } }
    Fx.strikes.push({ x: tx, t: 0, hit: false, dmg: sp.dmg }); vfx("rune", tx, L.ground * T - 3, sp.delay, 0.4); Sfx.play("chant");   // a warning mark first, then the strike
  };
  Spells.effect.bell = (p, sp) => {
    const x = p.x + 6, y = p.y + 12; Fx.rings.push({ x, y, life: 0.9, d: 0.9, c: "#d9cfbd", r: 6, g: sp.range * 1.3 }); Fx.rings.push({ x, y, life: 0.6, d: 0.6, c: "#c8553d", r: 4, g: sp.range }); vfx("bellres", x, y - 10, 0.8, 0.5); Sfx.play("bell"); Fx.shake = 0.15;
    for (const e of enemies) if (e.alive() && !e.boss && !["sleep", "dormant", "gone", "fade", "appear"].includes(e.st) && Math.abs((e.x + e.w / 2) - x) < sp.range && Math.abs(e.y - p.y) < 60) { if (e.chime) e.cool = 1.2; else if (e.go) { e.go("hurt"); e.vx = 0; } }   // stagger, no damage
    if (Math.abs(bellRect.x + 12 - x) < sp.range + 30 && Math.abs(bellRect.y - p.y) < 60) ring();
  };
  // ---------- one game step ----------
  function update(dt) {
    if (Fx.hitstop > 0) { Fx.hitstop -= dt; return; }
    bellCd -= dt; if (world.bridge) world.bridgeT += dt; Spells.tick(dt);
    player.update(dt, world, enemies);
    for (const e of enemies) { e.update(dt, world, player); if (e.sentinel && e.st === "dead" && !Save.data.sentinel) { Save.data.sentinel = true; persist(); unlocks(); } }
    enemies = enemies.filter(e => !e.gone);
    const a = CFG.player.atk;
    if (player.atk >= a.from && player.atk <= a.to && bellCd <= 0 && ov(player.hitbox(), bellRect)) ring();
    for (const col of L.shrines) if (!world.shrines.has(col) && player.ground && !player.dead && Math.abs(player.x + 6 - (col * T + 15)) < 20) activate(col);
    discover();
    if (boss && !won && !fight && !player.dead && player.x > (L.gate[0] + 1) * T) { fight = true; world.gate = true; boss.wake(); toast("The Bell Keeper stirs"); Sfx.play("bell"); Fx.shake = 0.4; Music.setMode("boss"); }
    if (boss && fight && !boss.alive() && !won) { won = true; fight = false; world.gate = false; endT = 0; toast("The bells remember"); Sfx.play("bell"); Music.setMode("game"); persist(); unlocks(); }
    if (won) { endT += dt; if (endT > 3.5 && state === "play") setState("win"); }
    for (const v of Fx.waves) {   // floor waves from the boss and Bellbound: jump or dodge through them
      v.x += v.vx * dt; v.life -= dt; v.trail = (v.trail || 0) + Math.abs(v.vx * dt); if (v.trail > 14) { v.trail = 0; vfx("spike", v.x, v.y, 0.4, 0.28); }
      if (world.solid(Math.floor(v.x / T), L.ground - 1)) v.life = 0;
      if (!v.hit && !player.dead && ov({ x: v.x - 6, y: v.y - 10, w: 12, h: 10 }, player)) { v.hit = true; player.damage(1, v.dir, 140); }
      if (Math.random() < 0.5 && Fx.parts.length < 160) Fx.parts.push({ x: v.x, y: v.y - 2, vx: 0, vy: -10, g: -5, s: 1, life: 0.3, col: "#c8553d" }); }
    Fx.waves = Fx.waves.filter(v => v.life > 0);
    for (const b of Fx.bolts) {   // Ember Fireball (stops at the first enemy) and Wind Slash (pierces)
      b.x += b.dir * b.speed * dt; b.t += dt; b.life -= dt; const r = { x: b.x - 6, y: b.y - 5, w: 12, h: 10 };
      for (const e of enemies) if (e.alive() && e.st !== "sleep" && ov(r, e) && !(b.hit && b.hit.has(e))) { if (b.hit) b.hit.add(e); e.damage(b.dmg, b.dir, 160); hitFx(b.x, b.y, b.dir); if (b.kind === "fire") { b.life = 0; vfx("ember", b.x, b.y, 0.3, 0.5); break; } }
      if (world.solid(Math.floor(b.x / T), Math.floor(b.y / T))) b.life = 0; }
    Fx.bolts = Fx.bolts.filter(b => b.life > 0);
    const LD = Spells.def("lightning").delay;
    for (const s of Fx.strikes) { s.t += dt; if (!s.hit && s.t >= LD) { s.hit = true; Fx.flash = 0.25; Fx.shake = Math.max(Fx.shake, 0.35); Sfx.play("thunder"); vfx("spark", s.x, L.ground * T - 6, 0.25, 0.9);
      for (const e of enemies) if (e.alive() && e.st !== "sleep" && Math.abs((e.x + e.w / 2) - s.x) < 16) { e.damage(s.dmg, 0, 100); if (e.alive() && !e.boss && !e.chime && e.go) e.go("hurt"); hitFx(s.x, e.y + e.h * 0.4, 1); } } }
    Fx.strikes = Fx.strikes.filter(s => s.t < 0.7);
    for (const f of Fx.fx) f.t += dt; Fx.fx = Fx.fx.filter(f => f.t < f.d);
    if (!player.dead && player.y > world.h + 24) fall();
    Fx.shake = Math.max(0, Fx.shake - dt); Fx.flash = Math.max(0, Fx.flash - dt); Fx.noEcho = Math.max(0, Fx.noEcho - dt);
    if (Fx.toast && (Fx.toast.t -= dt) <= 0) Fx.toast = null;
    for (const q of Fx.parts) { q.life -= dt; q.x += q.vx * dt; q.vy += (q.g === undefined ? 400 : q.g) * dt; q.y += q.vy * dt; }
    Fx.parts = Fx.parts.filter(q => q.life > 0);
    for (const g of Fx.ghosts) g.life -= dt; Fx.ghosts = Fx.ghosts.filter(g => g.life > 0);
    for (const r of Fx.rings) r.life -= dt; Fx.rings = Fx.rings.filter(r => r.life > 0);
    if (Math.random() < 0.3) for (const [n, c] of L.props) {   // drifting embers above torches, lanterns, braziers and lit shrines
      const p = PROPS[n]; if (p.lit === undefined || Math.random() < 0.7 || (n === "shrine" && !world.shrines.has(c))) continue; const b = propBox(n, c);
      if (b.x - cam < -20 || b.x - cam > CFG.W + 20 || Fx.parts.length > 160) continue;
      Fx.parts.push({ x: b.x + b.w / 2 + (Math.random() - 0.5) * 4, y: b.y + b.h * p.lit, vx: (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 14, g: -6, s: 1, life: 0.8 + Math.random() * 0.8, col: "#c8553d" }); }
    const target = Math.max(0, Math.min(world.w - CFG.W, player.x + player.w / 2 - CFG.W / 2 + player.face * 16));
    cam += (target - cam) * Math.min(1, dt * 6);
    if (player.dead && player.deadT > 1 && state === "play") setState("dead");
  }
  function step(dt) {
    try {
      if (state === "play") {
        if (Input.mapP) pause("map"); else if (Input.magicP) pause("magic"); else if (Input.pauseP) pause(); else update(dt);
      } else if (state === "pause") {
        UI.nav();
        if (!Touch.editing) { const top = UI.stack[UI.stack.length - 1]; if (Input.pauseP) UI.back(); else if (Input.mapP) { if (top === "map") UI.back(); else UI.open("map"); } else if (Input.magicP) { if (top === "magic") UI.back(); else UI.open("magic"); } }
      } else if (state === "dead" || state === "win") update(dt);
      else if (state === "menu") cam = (cam + dt * 14) % (world.w - CFG.W);
    } catch (e) { report(e, "game step"); }
    Input.endFrame();
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    try {
      const dt = Math.min((ts - last) / 1000, 0.1); last = ts; acc += dt; time += dt; Render.fps = dt > 0 ? 1 / dt : 0; Input.poll();
      if (!loaded && Render.ready) { loaded = true; if (!window.HV_MSG) { $("start").disabled = false; $("cont").disabled = false; } $("start").textContent = Save.data.started ? "New game" : "Begin"; $("cont").classList.toggle("hidden", !Save.data.started); }
      while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
      Touch.sync(state);
      if (state === "play") for (let i = 0; i < 2; i++) { const id = Save.data.spells.slots[i], s = id && Spells.def(id); if (s) Touch.cooldown(i, Math.min(1, (Spells.cd[id] || 0) / s.cd), player.echo >= s.cost && !(Spells.cd[id] > 0)); }
      if (Render.ready) Render.draw(world, player, enemies, cam, time);
    } catch (e) { report(e, "drawing"); acc = 0; }
  }
  // ---------- buttons ----------
  $("start").onclick = () => { const go = () => { newGame(); setState("play"); }; if (Save.data.started) UI.confirm("Start a new game? Your saved progress will be erased. Settings and controls stay.", go); else go(); };
  $("cont").onclick = () => { loadGame(); setState("play"); };
  $("again").onclick = () => { newGame(); setState("play"); };
  $("resume").onclick = () => UI.back();
  $("quit").onclick = () => UI.confirm("Return to the main menu? Your progress is saved.", () => { persist(); loadGame(); setState("menu"); });
  $("retry").onclick = () => { respawn(); setState("play"); };
  $("pbtn").onclick = () => pause();
  const wake = () => { Sfx.unlock(); Music.start(); }; addEventListener("pointerdown", wake); addEventListener("keydown", wake);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") pause(); });
  addEventListener("error", e => report(e.error || { message: e.message + " (" + String(e.filename || "").split("/").pop() + ":" + e.lineno + ")" }));
  addEventListener("unhandledrejection", e => report(e.reason || "promise problem"));
  for (let i = 0; i < 18; i++) { const e = document.createElement("i"); e.className = "ember"; e.style.cssText = "left:" + Math.random() * 100 + "%;animation-duration:" + (6 + Math.random() * 7) + "s;animation-delay:" + (-Math.random() * 10) + "s;--dx:" + ((Math.random() - 0.5) * 12) + "cqw"; $("menu").prepend(e); }
  window.Game = { get player() { return player; }, get enemies() { return enemies; }, get state() { return state; }, get cam() { return cam; }, world, get boss() { return boss; }, get cp() { return cp; }, get won() { return won; }, pause, persist, loadGame, newGame };
  $("start").disabled = true; $("cont").disabled = true; $("start").textContent = "Loading...";
  loadGame(); if (!Save.data.started) newGame(); setState("menu"); requestAnimationFrame(t => { last = t; loop(t); });
})();
