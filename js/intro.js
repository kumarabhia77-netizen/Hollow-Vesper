"use strict";
(window.HV_V = window.HV_V || {}).intro = 10;
// Fast cinematic intro (about 22 seconds), a compressed version of the "Last Divine Fall" teaser plan:
// black -> one bell -> drone and wordless choir over a starfield and a broken throne -> the drone sours as the dark spreads ->
// barrier cracks, ember flash, HARD SILENCE -> final bell, bass drop and the title. No character is shown (canon lock).
// All sound is generated here (no audio files). Optional real narration: put MP3 files at assets/intro/narr_1.mp3, narr_2.mp3 and rizan.mp3, then open the game with ?narr in the address and they play on cue.
// Tap or press any key to start it (browsers need that for sound) and again to skip. Add ?nointro to the address to turn it off.
(function () {
  const stage = document.getElementById("stage"); if (!stage || /nointro/.test(location.search)) return;
  try { if (sessionStorage.getItem("hv_intro")) return; } catch (e) {}
  const wrap = document.createElement("div"); wrap.id = "intro";
  wrap.innerHTML = '<canvas width="960" height="540"></canvas><div class="intro-hint">Tap or press any key to enter<small>sound on</small></div><div class="intro-sub"></div><button class="intro-skip hidden">Skip</button>';
  stage.appendChild(wrap);
  const cv = wrap.querySelector("canvas"), cx = cv.getContext("2d"), hint = wrap.querySelector(".intro-hint"), sub = wrap.querySelector(".intro-sub"), skip = wrap.querySelector(".intro-skip");
  const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, END = 22.5, W = 960, H = 540;
  let phase = "wait", t0 = 0, c = null, busA = null, busB = null, voices = [], ivl = null, raf = 0;
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd() * H * 0.92, s: rnd() < 0.15 ? 2 : 1, ph: rnd() * 6.3, die: 8.6 + rnd() * 4.6, a: 0.35 + rnd() * 0.65 }));
  const cracks = Array.from({ length: 6 }, (_, i) => { const pts = [[W * (0.25 + i * 0.1), H * 0.1 + rnd() * 20]]; for (let k = 0; k < 7; k++) { const l = pts[pts.length - 1]; pts.push([l[0] + (rnd() - 0.5) * 50, l[1] + 18 + rnd() * 26]); } return pts; });
  // ---------- sound (D minor, tolling bell near the tonic) ----------
  function setup() { try { Sfx.unlock(); c = Sfx.c; if (!c || !Sfx.out) return false; busA = c.createGain(); busA.gain.value = 0.9; busA.connect(Sfx.out); busB = c.createGain(); busB.gain.value = 0.9; busB.connect(Sfx.out); return true; } catch (e) { return false; } }
  const env = (g, t, a, v, hold, rel) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); };
  function bell(bus, t, f, vol, dur) { [[0.5, 0.5, 1], [1, 1, 1], [2, 0.5, 0.8], [2.76, 0.35, 0.6], [4.07, 0.2, 0.4], [5.4, 0.12, 0.3]].forEach(([r, a, d]) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f * r; g.gain.setValueAtTime(vol * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur * d + 0.1); }); }
  function pad(bus, t, notes, a, hold, rel, vol, formants, wave) { notes.forEach(n => { const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = formants ? 3000 : 1500; env(g, t, a, vol / notes.length, hold, rel); lp.connect(g); g.connect(bus);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.1; lg.gain.value = 5; lfo.connect(lg); lfo.start(t); lfo.stop(t + a + hold + rel + 0.2);
      [-7, 0, 7].forEach(d => { const o = c.createOscillator(); o.type = wave || "sawtooth"; o.frequency.value = n; o.detune.value = d; lg.connect(o.detune);
        if (formants) { [[800, 4], [1150, 5], [2500, 8]].forEach(([f, q]) => { const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; o.connect(bp); bp.connect(lp); }); } else o.connect(lp);   // choir: saw voices through "ah" vowel filters
        o.start(t); o.stop(t + a + hold + rel + 0.2); }); }); }
  function drone(bus, t, f, vol, hold) { const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240; env(g, t, 3, vol, hold, 1.2); lp.connect(g); g.connect(bus); [[f, "sawtooth"], [f * 1.006, "sawtooth"], [f / 2, "sine"]].forEach(([ff, ty]) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = ff; o.connect(lp); o.start(t); o.stop(t + hold + 4.4); }); }
  function sweep(bus, t, dur, f0, f1, vol, q) { const s = c.createBufferSource(); s.buffer = Sfx.nb; s.loop = true; const bp = c.createBiquadFilter(), g = c.createGain(); bp.type = "bandpass"; bp.Q.value = q || 1.2; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bp); bp.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.05); }
  function boom(bus, t, vol, f0, dur) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(28, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05); sweep(bus, t, 0.5, 400, 60, vol * 0.5, 0.8); }
  function tick(bus, t, f) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.15); }
  function strings(bus, t, f0, f1, dur, vol) { const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2200, t + dur); env(g, t, dur * 0.6, vol, dur * 0.4, 0.2); lp.connect(g); g.connect(bus); [0, 5, -5].forEach(d => { const o = c.createOscillator(); o.type = "sawtooth"; o.detune.value = d; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(lp); o.start(t); o.stop(t + dur + 0.5); }); }
  function score(s) {   // times are seconds after the tap; everything before the hard silence goes to busA, everything after to busB
    const A = busA, B = busB, D3 = 146.8, A3 = 220, D4 = 293.7, F4 = 349.2, F3 = 174.6, Eb2 = 77.8, D2 = 73.4;
    bell(A, s + 1.0, D3, 0.5, 12); drone(A, s + 1.2, 36.7, 0.5, 13.5); drone(A, s + 1.2, D2, 0.18, 13.5);
    [2.4, 3.0, 3.5, 4.2, 5.1, 6.0].forEach(x => tick(A, s + x, 2200 + rnd() * 1200));
    pad(A, s + 3.2, [D3, A3, D4, F4], 2.6, 3.5, 1.8, 0.28, true);
    drone(A, s + 7.5, Eb2, 0.25, 5); sweep(A, s + 7.6, 5, 90, 40, 0.28, 0.7); tick(A, s + 8.8, 1800);
    strings(A, s + 9.0, 110, 220, 6.6, 0.22); pad(A, s + 10.5, [D3, 110.0], 1.2, 3.5, 0.5, 0.2, false);
    pad(A, s + 11.0, [D3, F3, A3, D4], 2.2, 2.5, 0.5, 0.45, true);
    [12.8, 13.4, 14.0, 14.6, 15.2].forEach(x => boom(A, s + x, 0.28, 95, 0.3));
    [14.2, 14.5, 14.75, 15.0, 15.3].forEach(x => sweep(A, s + x, 0.12, 2500, 5000, 0.12, 3));   // barrier cracks
    sweep(A, s + 15.75, 0.6, 400, 4000, 0.3, 0.9); boom(A, s + 15.8, 0.9, 80, 0.55);   // ember flash and the fall
    busA.gain.setValueAtTime(0.9, s + 16.28); busA.gain.setTargetAtTime(0, s + 16.3, 0.006);   // HARD SILENCE: nothing else, no tails
    busB.gain.value = 0.9;
    sweep(B, s + 17.2, 1.0, 600, 1500, 0.04, 6); bell(B, s + 17.6, D3, 0.65, 10); boom(B, s + 17.6, 0.7, 90, 0.8); drone(B, s + 17.7, 36.7, 0.3, 2.5);   // final bell, bass drop, sub drone
    [[3.6, "narr_1"], [8.4, "narr_2"], [13.6, "rizan"]].forEach(([x, n]) => setTimeout(() => { if (phase !== "play" || !/narr/.test(location.search)) return; try { const a = new Audio("assets/intro/" + n + ".mp3"); a.volume = Math.min(1, Sfx.vol); a.play().catch(() => {}); voices.push(a); } catch (e) {} }, x * 1000));
  }
  // ---------- picture ----------
  function throne(t, k) {
    const x = W / 2, y = H * 0.97, s = 1.55 + (t - 4) * 0.006;
    cx.save(); cx.translate(x, y); cx.scale(s, s); cx.globalAlpha = k;
    const g = cx.createRadialGradient(0, -170, 10, 0, -170, 260); g.addColorStop(0, "rgba(217,207,189,.16)"); g.addColorStop(1, "rgba(217,207,189,0)"); cx.fillStyle = g; cx.fillRect(-300, -450, 600, 560);
    cx.fillStyle = "#1a171d"; cx.beginPath(); cx.moveTo(-90, 0); cx.lineTo(-98, -60); cx.lineTo(-70, -75); cx.lineTo(-72, -230); cx.lineTo(-52, -262); cx.lineTo(-40, -300); cx.lineTo(-18, -268); cx.lineTo(-4, -330); cx.lineTo(14, -276); cx.lineTo(36, -296); cx.lineTo(48, -240); cx.lineTo(72, -226); cx.lineTo(70, -75); cx.lineTo(98, -60); cx.lineTo(90, 0); cx.closePath(); cx.fill();   // broken-edged throne
    cx.fillRect(-150, -8, 300, 8); cx.fillRect(-124, -22, 248, 14); cx.fillStyle = "#0c0b11"; cx.fillRect(-46, -190, 92, 140);
    cx.strokeStyle = "rgba(217,207,189,.55)"; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(-72, -230); cx.lineTo(-52, -262); cx.lineTo(-40, -300); cx.lineTo(-18, -268); cx.moveTo(-98, -60); cx.lineTo(-70, -75); cx.lineTo(-72, -230); cx.moveTo(-150, -8); cx.lineTo(150, -8); cx.stroke();   // rim light from the left
    cx.restore();
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame); const t = phase === "play" ? (ts - t0) / 1000 : 0; cx.globalAlpha = 1; cx.fillStyle = "#0c0b11"; cx.fillRect(0, 0, W, H);
    if (phase === "play") {
      const star = Math.min(1, Math.max(0, (t - 2.2) / 2.4)); if (t < 16.3) {
        const hz = cx.createRadialGradient(W / 2, H * 0.5, 40, W / 2, H * 0.5, 520); hz.addColorStop(0, `rgba(91,85,96,${0.1 * star})`); hz.addColorStop(1, "rgba(91,85,96,0)"); cx.fillStyle = hz; cx.fillRect(0, 0, W, H);
        for (const s of stars) { const dead = t > s.die ? Math.max(0, 1 - (t - s.die) / 0.9) : 1; if (dead <= 0) continue; cx.globalAlpha = star * dead * s.a * (0.6 + 0.4 * Math.sin(t * 1.5 + s.ph)) * (t > s.die && t < s.die + 0.12 ? 1.8 : 1); cx.fillStyle = "#d9cfbd"; cx.fillRect(s.x | 0, s.y | 0, s.s, s.s); } cx.globalAlpha = 1;
        const th = Math.min(1, Math.max(0, (t - 4) / 2.5)); if (th > 0) throne(t, th * (t > 13.5 ? Math.max(0.25, 1 - (t - 13.5) * 0.3) : 1));
        if (t > 8.5) { const k = Math.min(1, (t - 8.5) / 6), sh = [[W * 0.9 - k * 360, H * 0.2, 330, 150, 0.4], [W * 0.1 + k * 280, H * 0.12, 280, 120, -0.3], [W * 0.5, -40 + k * 150, 520, 120, 0]];   // subtractive dark shapes: nothing is lit, the stars are simply removed
          sh.forEach(([x, y, rx, ry, rot]) => { cx.fillStyle = "#050408"; cx.beginPath(); cx.ellipse(x, y, rx, ry, rot, 0, 6.283); cx.fill(); cx.strokeStyle = "rgba(217,207,189,.22)"; cx.lineWidth = 1; cx.stroke(); }); }
        if (t > 13.4) { const k = Math.min(1, (t - 13.4) / 1.6); cx.strokeStyle = `rgba(217,207,189,${0.5 * k})`; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(W / 2, H * 0.72, 330, 420, 0, Math.PI * 1.1, Math.PI * 1.9); cx.stroke();   // barrier
          cx.lineWidth = 1; cracks.forEach((p, i) => { const n = Math.floor(p.length * Math.min(1, Math.max(0, (t - 14 - i * 0.15) / 1.2))); if (n < 2) return; cx.strokeStyle = t > 15 ? "#c8553d" : "#d9cfbd"; cx.beginPath(); cx.moveTo(p[0][0], p[0][1]); for (let j = 1; j < n; j++) cx.lineTo(p[j][0], p[j][1]); cx.stroke(); }); }
      }
      if (t >= 15.8 && t < 16.0) { cx.globalAlpha = (calm ? 0.25 : 0.85) * (1 - (t - 15.8) / 0.2); cx.fillStyle = "#d9cfbd"; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
      if (t >= 17.4) { const a = Math.min(1, (t - 17.4) / 0.6); cx.globalAlpha = a; const ex = W / 2, ey = H * 0.44 - Math.min(1, (t - 17.4) / 1.5) * 10, g = cx.createRadialGradient(ex, ey, 1, ex, ey, 70); g.addColorStop(0, "rgba(255,150,100,.5)"); g.addColorStop(1, "rgba(200,85,61,0)"); cx.globalCompositeOperation = "lighter"; cx.fillStyle = g; cx.fillRect(ex - 80, ey - 80, 160, 160); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
      if (t >= 17.8) { const a = Math.min(1, (t - 17.8) / 1.4), gl = 0.7 + 0.3 * Math.sin(t * 2.4); cx.save(); cx.textAlign = "center"; cx.font = "64px Georgia, serif"; cx.globalAlpha = a; cx.shadowColor = `rgba(200,85,61,${0.8 * gl})`; cx.shadowBlur = 28; cx.fillStyle = "#c8553d"; if ("letterSpacing" in cx) cx.letterSpacing = "14px"; cx.fillText("HOLLOW VESPER", W / 2 + 7, H * 0.5); cx.shadowBlur = 0; cx.fillStyle = "#d9cfbd"; cx.globalAlpha = a * Math.min(1, Math.max(0, (t - 19.2) / 1)); cx.font = "italic 17px Georgia, serif"; if ("letterSpacing" in cx) cx.letterSpacing = "6px"; cx.fillText("THE LAST DIVINE FALL", W / 2 + 3, H * 0.5 + 40); cx.restore(); }
      const line = t >= 3.6 && t < 7.4 ? "Before the silence... there was a god." : t >= 8.4 && t < 12.6 ? "Then came those who existed beyond his universe." : t >= 13.6 && t < 15.7 ? "THIS REALITY... SHALL NOT FALL." : ""; if (sub.textContent !== line) { sub.textContent = line; sub.classList.toggle("big", line.startsWith("THIS")); }
      sub.style.opacity = line ? "1" : "0"; if (t > 0.8) skip.classList.remove("hidden"); if (t >= END) finish();
    }
  }
  function finish() {
    if (phase === "done") return; phase = "done"; clearInterval(ivl); try { sessionStorage.setItem("hv_intro", "1"); } catch (e) {}
    try { if (c) { busA.gain.cancelScheduledValues(c.currentTime); busA.gain.setTargetAtTime(0, c.currentTime, 0.08); busB.gain.setTargetAtTime(0, c.currentTime + 0.01, 0.25); } voices.forEach(a => a.pause()); } catch (e) {}
    wrap.classList.add("out"); setTimeout(() => { wrap.remove(); cancelAnimationFrame(raf); try { Music.setMode("menu"); } catch (e) {} }, 1300);
  }
  function begin() {
    if (phase !== "wait") return; phase = "play"; hint.style.display = "none"; const ok = setup(); t0 = performance.now(); if (ok) score(c.currentTime + 0.12);
    ivl = setInterval(() => { try { Music.setMode("none"); } catch (e) {} }, 300); try { Music.setMode("none"); } catch (e) {}   // the menu music waits until the intro is over
  }
  const onTap = e => { if (e.target === skip) return finish(); if (phase === "wait") return begin(); if (phase === "play" && performance.now() - t0 > 800) finish(); };
  wrap.addEventListener("pointerdown", onTap); addEventListener("keydown", e => { if (!wrap.isConnected) return; if (e.code === "F3") return; onTap(e); }, true);
  skip.addEventListener("click", finish); raf = requestAnimationFrame(frame);
})();
