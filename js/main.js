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
    Fx.parts = Fx.parts.filter(q => q.life > 0);
    const target = Math.max(0, Math.min(world.w - CFG.W, player.x + player.w / 2 - CFG.W / 2 + player.face * 20));
    cam += (target - cam) * Math.min(1, dt * 6);
    if (player.dead && player.deadT > 1 && state === "play") setState("dead");
  }
  function step(dt) {
    if (state === "play") { if (Input.pauseP) setState("pause"); else update(dt); }
    else if (state === "pause") { if (Input.pauseP) setState("play"); }
    else if (state === "dead") update(dt);
    Input.endFrame();
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min((ts - last) / 1000, 0.1); last = ts; acc += dt; time += dt; Render.fps = dt > 0 ? 1 / dt : 0;
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
    Render.draw(world, player, enemies, cam, time);
  }

  $("start").onclick = () => { reset(); setState("play"); };
  $("resume").onclick = () => setState("play");
  $("quit").onclick = () => { reset(); setState("menu"); };
  $("retry").onclick = () => { reset(); setState("play"); };
  $("pbtn").onclick = () => setState("pause");
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") setState("pause"); });
  addEventListener("error", e => { const b = $("err"); b.textContent = "Error: " + e.message + " (" + String(e.filename || "").split("/").pop() + ":" + e.lineno + ")"; b.classList.remove("hidden"); });

  reset(); setState("menu"); requestAnimationFrame(t => { last = t; loop(t); });
})();
    
