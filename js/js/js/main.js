"use strict";
// Game flow: menu -> play -> pause / dead. Fixed 60 updates per second so physics stays steady.
(function () {
  const $ = id => document.getElementById(id), T = CFG.T, L = CFG.level;
  let world = new World(L), player, enemies, cam = 0, state = "menu", acc = 0, last = 0, time = 0;
  Render.init(world);

  function reset() {
    player = new Player(L.spawn[0] * T, L.spawn[1] * T - CFG.player.h);
    enemies = L.enemies.map(([c, type]) => new Enemy(type, c * T, L.ground * T - CFG.enemies[type].h));
    Fx.parts = []; Fx.shake = 0; Fx.hitstop = 0; cam = 0;
  }
  function setState(s) {
    state = s;
    $("menu").classList.toggle("hidden", s !== "menu"); $("pause").classList.toggle("hidden", s !== "pause");
    $("dead").classList.toggle("hidden", s !== "dead"); $("pbtn").classList.toggle("hidden", s !== "play");
  }
  function update(dt) {
    if (Fx.hitstop > 0) { Fx.hitstop -= dt; return; }
    player.update(dt, world, enemies);
    for (const e of enemies) e.update(dt, world, player);
    enemies = enemies.filter(e => !e.gone);
    Fx.shake = Math.max(0, Fx.shake - dt);
    for (const q of Fx.parts) { q.life -= dt; q.x += q.vx * dt; q.vy += 400 * dt; q.y += q.vy * dt; }
