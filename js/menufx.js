"use strict";
(window.HV_V = window.HV_V || {}).menufx = 10;
// Animated canvas behind the main menu and the pause menu: drifting fog, slow light shafts, rising embers and a hanging bell that rings now and then.
// It only runs while one of those screens is open and is switched off by the "reduce motion" setting of the device.
(function () {
  const stage = document.getElementById("stage"), before = document.getElementById("menu"); if (!stage || !before) return;
  const cv = document.createElement("canvas"); cv.id = "menufx"; cv.width = 960; cv.height = 540; stage.insertBefore(cv, before);
  const cx = cv.getContext("2d"), W = 960, H = 540, calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const em = Array.from({ length: calm ? 0 : 54 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 12 + Math.random() * 34, r: 0.8 + Math.random() * 1.9, ph: Math.random() * 6.3, bone: Math.random() < 0.25 }));
  const fog = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * W, y: 300 + i * 48, r: 220 + Math.random() * 160, v: 6 + Math.random() * 9 }));
  let t = 0, last = 0, ringAt = 2.5, ringK = 0, waves = [], burst = [];
  const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains("hidden"); };
  function bell(x, y, a, k, s) {   // chain, bronze bell body, cracked rim and a glowing mouth
    cx.save(); cx.translate(x, 0); cx.strokeStyle = "#1b1418"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, y - 70); cx.stroke();
    for (let i = 0; i < (y - 70) / 14; i++) { cx.strokeStyle = "#2a2630"; cx.lineWidth = 1.5; cx.beginPath(); cx.ellipse(0, 7 + i * 14, 3, 6.5, 0, 0, 6.283); cx.stroke(); }
    cx.translate(0, y - 70); cx.rotate(a); cx.scale(s, s);
    const g = cx.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, "#0c0b11"); g.addColorStop(0.35, "#4a3a2c"); g.addColorStop(0.6, "#2e2320"); g.addColorStop(1, "#0c0b11");
    cx.fillStyle = g; cx.beginPath(); cx.moveTo(-14, 6); cx.quadraticCurveTo(-18, -8, -8, -14); cx.lineTo(8, -14); cx.quadraticCurveTo(18, -8, 14, 6); cx.quadraticCurveTo(30, 40, 38, 84); cx.lineTo(-38, 84); cx.quadraticCurveTo(-30, 40, -14, 6); cx.closePath(); cx.fill();
    cx.strokeStyle = "#6b5646"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(-38, 84); cx.lineTo(38, 84); cx.stroke(); cx.strokeStyle = "rgba(12,11,17,.8)"; cx.beginPath(); cx.moveTo(-6, 20); cx.lineTo(-10, 40); cx.lineTo(-5, 54); cx.stroke();
    const gl = cx.createRadialGradient(0, 86, 2, 0, 86, 40 + 30 * k); gl.addColorStop(0, `rgba(255,160,100,${0.5 + 0.4 * k})`); gl.addColorStop(0.4, `rgba(200,85,61,${0.3 + 0.3 * k})`); gl.addColorStop(1, "rgba(200,85,61,0)");
    cx.globalCompositeOperation = "lighter"; cx.fillStyle = gl; cx.fillRect(-90, 40, 180, 130); cx.restore();
  }
  function frame(ts) {
    requestAnimationFrame(frame); const menu = vis("menu"), pause = vis("pause");
    if (!menu && !pause) { if (cv.style.display !== "none") cv.style.display = "none"; last = ts; return; } cv.style.display = "block";
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; t += dt; const I = menu ? 1 : 0.6;
    cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = "lighter";
    for (const f of fog) { f.x += f.v * dt; if (f.x - f.r > W) f.x = -f.r; const g = cx.createRadialGradient(f.x, f.y, 10, f.x, f.y, f.r); g.addColorStop(0, `rgba(154,146,142,${0.07 * I})`); g.addColorStop(1, "rgba(154,146,142,0)"); cx.fillStyle = g; cx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }
    for (let i = 0; i < 3; i++) { const bx = 160 + i * 260 + Math.sin(t * 0.25 + i * 2) * 30, g = cx.createLinearGradient(bx, 0, bx + 120, 460); g.addColorStop(0, `rgba(200,120,90,${(0.07 + 0.03 * Math.sin(t * 0.6 + i)) * I})`); g.addColorStop(1, "rgba(200,120,90,0)");
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx + 50, 0); cx.lineTo(bx + 220, 520); cx.lineTo(bx + 90, 520); cx.closePath(); cx.fill(); }
    if (t > ringAt) { ringAt = t + 7 + Math.random() * 3; ringK = 1; waves.push({ t: 0 }); for (let i = 0; i < 16; i++) burst.push({ x: 800 + (Math.random() - 0.5) * 40, y: 218, vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 70, l: 1 + Math.random() }); }
    ringK = Math.max(0, ringK - dt * 0.35); const swing = Math.sin(t * 0.55) * 0.045 + Math.sin(t * 17) * 0.08 * ringK * ringK;
    if (!calm) bell(800, 300, swing, ringK, menu ? 1 : 0.8);
    cx.globalCompositeOperation = "lighter";
    for (const w of waves) { w.t += dt; const k = w.t / 2.2, a = (1 - k) * 0.7 * I; for (let j = 0; j < 3; j++) { const r = (w.t - j * 0.12) * 190; if (r <= 0) continue; cx.strokeStyle = j ? `rgba(200,85,61,${a * 0.6})` : `rgba(217,207,189,${a})`; cx.lineWidth = 2.2 - j * 0.5; cx.beginPath(); cx.ellipse(800, 218, r, r * 0.3, 0, 0, 6.283); cx.stroke(); } }
    waves = waves.filter(w => w.t < 2.2);
    for (const b of burst) { b.l -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 30 * dt; cx.fillStyle = `rgba(255,150,90,${Math.max(0, b.l) * 0.8})`; cx.fillRect(b.x, b.y, 2.2, 2.2); } burst = burst.filter(b => b.l > 0);
    for (const e of em) { e.y -= e.v * dt; e.x += Math.sin(t * 0.9 + e.ph) * 9 * dt; if (e.y < -10) { e.y = H + 10; e.x = Math.random() * W; }
      const a = (0.35 + 0.5 * Math.abs(Math.sin(t * 2 + e.ph))) * I, g = cx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5); g.addColorStop(0, e.bone ? `rgba(217,207,189,${a})` : `rgba(255,140,80,${a})`); g.addColorStop(1, "rgba(200,85,61,0)"); cx.fillStyle = g; cx.fillRect(e.x - e.r * 5, e.y - e.r * 5, e.r * 10, e.r * 10); }
    cx.globalCompositeOperation = "source-over";
  }
  requestAnimationFrame(frame);
})();
