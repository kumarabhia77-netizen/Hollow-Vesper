"use strict";
// Game flow: menu -> play -> pause / dead / win. Fixed 60 updates per second keeps physics steady.
(function () {
  const $ = id => document.getElementById(id), T = CFG.T, L = CFG.level, world = new World(L);
  let player, enemies = [], boss = null, cam = 0, state = "menu", acc = 0, last = 0, time = 0, cp = { x: L.spawn[0] * T }, fight = false, won = false, endT = 0, bellCd = 0;
  Render.init(world);
  const bellRect = { x: L.bell * T + 2, y: L.ground * T - 36, w: 24, h: 36 };
  const toast = m => { Fx.toast = { m, t: 3 }; };

  function spawn() {
    const mk = (type, c) => { const x = c * T, y = L.ground * T - (type === "keeper" ? CFG.boss.h : CFG.enemies[type].h);
      return type === "keeper" ? new Boss(x, y) : type === "bound" ? new Bound(x, y) : type === "mourner" ? new Mourner(x, y) : type === "sentinel" ? new Sentinel(x, y) : new Enemy(type, x, y); };
    enemies = L.enemies.filter(e => !(e[1] === "keeper" && won)).map(([c, t]) => mk(t, c)).concat(L.chimes.map(([c, r]) => new Chime(c * T, r * T)));
    if (world.bridge) enemies.forEach(e => { if (e.chime) e.wake(); });
    boss = enemies.find(e => e.boss) || null; fight = false; world.gate = false; Fx.waves = [];
  }
  function respawn() {   // after death: back at the last shrine, bell and bridge stay as they were
    player = new Player(cp.x, L.ground * T - CFG.player.h); Fx.pl = player; spawn(); Fx.parts = []; Fx.ghosts = []; Fx.rings = []; Fx.fx = []; Fx.bolts = []; Fx.shake = 0; Fx.hitstop = 0;
    cam = Math.max(0, Math.min(world.w - CFG.W, cp.x - CFG.W / 2));
  }
  function newGame() { world.bridge = false; world.bridgeT = 0; world.shrines.clear(); won = false; cp = { x: L.spawn[0] * T }; Fx.toast = null; respawn(); }
  function setState(s) {
    state = s;
    for (const id of ["menu", "pause", "dead", "win"]) $(id).classList.toggle("hidden", s !== id);
    $("pbtn").classList.toggle("hidden", s !== "play");
    Music.setMode(s === "menu" || s === "pause" || s === "win" ? "menu" : s === "dead" ? "dead" : fight ? "boss" : "game");
  }
  function ring() {   // the bell: strike it and a hidden bridge answers
    bellCd = 0.8; const x = bellRect.x + 12, y = bellRect.y + 14;
    Fx.rings.push({ x, y, life: 1, d: 1, c: "#d9cfbd", r: 6, g: 140 }); Fx.rings.push({ x, y, life: 0.7, d: 0.7, c: "#c8553d", r: 4, g: 90 });
    Fx.shake = 0.3; Sfx.play("bell"); ember(x, y - 6, 12); vfx("bellres", x, y - 6, 1.1, 0.7); for (let i = 0; i < L.bridge[1]; i += 3) vfx("rune", (L.bridge[0] + i) * T + 8, L.ground * T - 1, 1.2, 0.25, { delay: 0.2 + i * 0.05 }); enemies.forEach(e => { if (e.chime) e.wake(); });   // the bell wakes the chimes
    if (!world.bridge) { world.bridge = true; world.bridgeT = 0; toast("The bell rings. A bridge answers."); }
  }
  function activate(col) {
    world.shrines.add(col); cp = { x: col * T + 8 }; player.hp = Math.min(CFG.player.hp, player.hp + 2);
    Fx.rings.push({ x: col * T + 15, y: L.ground * T - 10, life: 0.8, d: 0.8, c: "#c8553d", r: 6, g: 40 }); ember(col * T + 15, L.ground * T - 20, 14); Sfx.play("shrine"); toast("Shrine awakened");
  }
  function fall() {   // into the pit: lose one health and return to the last shrine
    player.hp = Math.max(0, player.hp - 1); Fx.shake = 0.3;
    if (player.hp === 0) { player.dead = true; Sfx.play("die"); return; }
    Object.assign(player, { x: cp.x, y: L.ground * T - player.h, vx: 0, vy: 0, inv: 0.8, hurt: 0, dodge: -1, atk: -1 }); Sfx.play("hurt"); toast("You fell");
  }
  function update(dt) {
    if (Fx.hitstop > 0) { Fx.hitstop -= dt; return; }
    bellCd -= dt; if (world.bridge) world.bridgeT += dt;
    player.update(dt, world, enemies);
    for (const e of enemies) e.update(dt, world, player);
    enemies = enemies.filter(e => !e.gone);
    const a = CFG.player.atk;
    if (player.atk >= a.from && player.atk <= a.to && bellCd <= 0 && ov(player.hitbox(), bellRect)) ring();
    for (const col of L.shrines) if (!world.shrines.has(col) && player.ground && !player.dead && Math.abs(player.x + 6 - (col * T + 15)) < 20) activate(col);
    if (boss && !won && !fight && !player.dead && player.x > (L.gate[0] + 1) * T) { fight = true; world.gate = true; boss.wake(); toast("The Bell Keeper stirs"); Music.setMode("boss"); Sfx.play("bell"); Fx.shake = 0.4; }
    if (boss && fight && !boss.alive() && !won) { won = true; fight = false; world.gate = false; endT = 0; toast("The bells remember"); Music.setMode("game"); Sfx.play("bell"); }
    if (won) { endT += dt; if (endT > 3.5 && state === "play") setState("win"); }
    for (const v of Fx.waves) {   // floor waves from the boss: jump or dodge through them
      v.x += v.vx * dt; v.life -= dt; v.trail = (v.trail || 0) + Math.abs(v.vx * dt); if (v.trail > 14) { v.trail = 0; vfx("spike", v.x, v.y, 0.4, 0.28); }   // spikes erupt along the wave if (world.solid(Math.floor(v.x / T), L.ground - 1)) v.life = 0;
      if (!v.hit && !player.dead && ov({ x: v.x - 6, y: v.y - 10, w: 12, h: 10 }, player)) { v.hit = true; player.damage(1, v.dir, 140); }
      if (Math.random() < 0.5 && Fx.parts.length < 160) Fx.parts.push({ x: v.x, y: v.y - 2, vx: 0, vy: -10, g: -5, s: 1, life: 0.3, col: "#c8553d" }); }
    Fx.waves = Fx.waves.filter(v => v.life > 0);
    for (const b of Fx.bolts) {   // Ashen Bolt
      b.x += b.dir * 190 * dt; b.t += dt; b.life -= dt; const r = { x: b.x - 6, y: b.y - 5, w: 12, h: 10 };
      for (const e of enemies) if (e.alive() && e.st !== "sleep" && ov(r, e)) { e.damage(2, b.dir, 160); b.life = 0; hitFx(b.x, b.y, b.dir); break; }
      if (world.solid(Math.floor(b.x / T), Math.floor(b.y / T))) b.life = 0; }
    Fx.bolts = Fx.bolts.filter(b => b.life > 0); for (const f of Fx.fx) f.t += dt; Fx.fx = Fx.fx.filter(f => f.t < f.d);
    if (!player.dead && player.y > world.h + 24) fall();
    Fx.shake = Math.max(0, Fx.shake - dt);
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
    if (state === "play") { if (Input.pauseP) setState("pause"); else update(dt); }
    else if (state === "pause") { if (Input.pauseP) setState("play"); }
    else if (state === "dead" || state === "win") update(dt);
    else if (state === "menu") cam = (cam + dt * 14) % (world.w - CFG.W);
    Input.endFrame();
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min((ts - last) / 1000, 0.1); last = ts; acc += dt; time += dt; Render.fps = dt > 0 ? 1 / dt : 0;
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
    if (Render.ready) Render.draw(world, player, enemies, cam, time);
  }
  window.Game = { get player() { return player; }, get enemies() { return enemies; }, get state() { return state; }, get cam() { return cam; }, world, get boss() { return boss; }, get cp() { return cp; }, get won() { return won; } };
  $("start").onclick = () => { newGame(); setState("play"); };
  $("again").onclick = () => { newGame(); setState("play"); };
  $("resume").onclick = () => setState("play");
  $("quit").onclick = () => { newGame(); setState("menu"); };
  $("retry").onclick = () => { respawn(); setState("play"); };
  $("pbtn").onclick = () => setState("pause");
  $("snd").onclick = () => { Sfx.on = !Sfx.on; $("snd").textContent = "Sound: " + (Sfx.on ? "on" : "off"); };
  $("shk").onclick = () => { Fx.shakeOn = !Fx.shakeOn; $("shk").textContent = "Screen shake: " + (Fx.shakeOn ? "on" : "off"); };
  $("mus").onclick = () => { Music.setOn(!Music.on); $("mus").textContent = "Music: " + (Music.on ? "on" : "off"); };
  const wake = () => { Sfx.unlock(); Music.start(); }; addEventListener("pointerdown", wake); addEventListener("keydown", wake);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") setState("pause"); });
  addEventListener("error", e => { const b = $("err"); b.textContent = "Error: " + e.message + " (" + String(e.filename || "").split("/").pop() + ":" + e.lineno + ")"; b.classList.remove("hidden"); });
  for (let i = 0; i < 18; i++) { const e = document.createElement("i"); e.className = "ember";
    e.style.cssText = `left:${Math.random() * 100}%;animation-duration:${6 + Math.random() * 7}s;animation-delay:${-Math.random() * 10}s;--dx:${(Math.random() - .5) * 12}cqw`; $("menu").prepend(e); }
  newGame(); setState("menu"); requestAnimationFrame(t => { last = t; loop(t); });
})();
