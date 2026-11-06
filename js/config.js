"use strict";
(window.HV_V = window.HV_V || {}).config = 10;
// All game numbers live here. Change a number, reload, see the difference.
const CFG = {
  W: 320, H: 180, CAMY: 92, T: 16, GRAV: 1500,
  player: { w: 12, h: 26, speed: 110, jump: 480, hp: 5, inv: 0.5, echoMax: 6, castCost: 3, castDur: 0.62, coyote: 0.1, buffer: 0.12,
    dodge: { dur: 0.3, speed: 260, inv: 0.24, cd: 0 },
    atk: { dur: 0.44, from: 0.12, to: 0.22, reach: 26, h: 22, dmg: 1, knock: 130, moveMul: 0.35 },   // legacy sword numbers, kept only as a fallback
    // Gilded Thorn (first weapon). Damage = base x scale (100 / 90 / 80 percent, finisher 200 percent, from the weapon sheet).
    // Angles: 0 = straight ahead, negative = up, positive = down. Times are in seconds.
    // Eclipse Slayer (second weapon, Q). Moves 0-2 are the tap combo (move 2 = Heavy Cleave), 3 = Arcane Edge release, 4 = Shadow-Step Thrust (dash + attack).
    slayer: { base: 1.6, chargeMin: 0.35, chargeFull: 0.95, moveMul: 0.3,
      blast: { speed: 230, life: 0.75, dmg: 2.2, knock: 220 },
      moves: [
        { name: "Cleave 1", dur: 0.42, from: 0.12, to: 0.24, reach: 34, hy: -2, h: 28, dmg: 1.6, knock: 140, push: 50, a0: -2.4, a1: 0.5 },
        { name: "Cleave 2", dur: 0.44, from: 0.12, to: 0.25, reach: 38, hy: 4, h: 24, dmg: 1.52, knock: 150, push: 60, a0: 0.9, a1: -0.4 },
        { name: "Heavy Cleave", dur: 0.7, from: 0.26, to: 0.42, reach: 46, hy: -6, h: 36, dmg: 3.2, knock: 240, push: 70, a0: -3.0, a1: 0.9 },
        { name: "Arcane Edge", dur: 0.5, from: 0.16, to: 0.28, reach: 30, hy: 0, h: 24, dmg: 1.9, knock: 200, push: 0, a0: -2.9, a1: 0 },
        { name: "Shadow-Step Thrust", thrust: true, dur: 0.4, from: 0.05, to: 0.2, reach: 58, hy: 7, h: 12, dmg: 2.2, knock: 200, push: 380, a0: 0, a1: 0 } ] },
    whip: { base: 1.2, tier1: 30, tier2: 60, gain: 12, rupture: 60, decay: 5, decayDelay: 2.2, loss: 25, moveMul: 0.35,
      moves: [
        { name: "Lash 1", dur: 0.38, from: 0.09, to: 0.20, reach: 44, hy: 2, h: 22, dmg: 1.2 * 1.0, knock: 120, push: 55, a0: -1.5, a1: 0.35 },
        { name: "Lash 2", dur: 0.38, from: 0.09, to: 0.20, reach: 48, hy: 2, h: 22, dmg: 1.2 * 0.9, knock: 130, push: 55, a0: 0.8, a1: -0.55 },
        { name: "Lash 3", dur: 0.50, from: 0.15, to: 0.30, reach: 56, hy: 2, h: 22, dmg: 1.2 * 0.8, knock: 170, push: 70, a0: -2.2, a1: 0.1 },
        { name: "Rupture Lash", fin: true, dur: 0.62, from: 0.20, to: 0.38, reach: 76, hy: -2, h: 30, dmg: 1.2 * 2.0, knock: 240, push: 90, a0: -2.6, a1: 0.55 } ] } },
  enemies: {
    sentinel: { w: 14, h: 26, hp: 5, speed: 34, sight: 130, notice: 0.5, atk: { range: 34, windup: 0.7, active: 0.15, recover: 1.0, reach: 36, dmg: 1, knock: 190 } },
    bound: { w: 16, h: 28, hp: 4, speed: 26, sight: 150, notice: 0.5, keep: 60, rest: 1.1, wave: 75, atk: { windup: 0.7, recover: 0.9, reach: 0, dmg: 1, knock: 140 } },
    mourner: { w: 14, h: 24, hp: 3, speed: 30, sight: 140, notice: 0.35, atk: { range: 30, windup: 0.4, active: 0.14, recover: 0.7, reach: 34, dmg: 1, knock: 150 } },
    chime: { w: 10, h: 10, speed: 58 },
    husk: { w: 14, h: 24, hp: 3, notice: 0.4, speed: 32, chase: 52, sight: 110, color: "#6e5a50", staggerKnock: 200,
      atk: { range: 36, windup: 0.55, active: 0.16, recover: 0.55, reach: 36, dmg: 1, knock: 150 },
      ring: { range: 95, windup: 0.75, active: 0.6, radius: 56, dmg: 1, knock: 150, cd: 5 } }   // Bell Resonance: expanding ground wave, jump or dash through it
  },
  // Level: sizes are in tiles (1 tile = 16 pixels). Platform = [x, y, width, height optional]
  level: {
    areas: [{ id: "gate", name: "Gate Courtyard", c: [0, 19], type: "courtyard" }, { id: "yard", name: "The Silent Yard", c: [19, 41], type: "courtyard" }, { id: "tower", name: "Bell Landing", c: [41, 46], type: "tower" },
      { id: "span", name: "The Hollow Span", c: [46, 60], type: "chasm" }, { id: "rise", name: "Shrine Rise", c: [60, 68], type: "chapel" }, { id: "arena", name: "The Keeper's Arena", c: [68, 80], type: "boss" }, { id: "chancel", name: "The Desecrated Chancel", c: [80, 108], type: "chancel" }],
    regions: [{ id: "gate", name: "Cathedral Gate", areas: ["gate", "yard", "tower", "span", "rise", "arena", "chancel"] }],
    cols: 108, rows: 17, ground: 15, spawn: [3, 15], pit: [46, 14], bridge: [46, 14], gate: [69, 9, 6], gate2: [80, 9, 6], gate3: [84, 9, 6], shrines: [5, 63, 82], bell: 42,
    platforms: [[12, 11, 5], [19, 9, 4], [30, 12, 6], [36, 10, 4]],
    props: [["shrine",5],["tree",1],["torch",9],["fence",11],["statue",14],["banner",17],["barrel",21],["crate",23],["lantern",27],["torch",33],["cart",35],["bell",42],["lantern",50],["banner2",55],["brazier",61],["shrine",63],["torch",66],["rubble",72],["statue2",74],["torch",77],["torch",81],["shrine",82],["brazier",86],["statue2",90],["banner2",93],["torch",97],["rubble",100],["statue",104],["torch",106]],
    enemies: [[20, "husk"], [24, "porter"], [29, "archivist"], [33, "bound"], [35, "colossus"], [39, "sentinel"], [62, "reaper"], [64, "mourner"], [67, "husk"], [76, "keeper"], [100, "bishop"]], chimes: [[50, 8], [53, 7], [56, 8]] },
  mon: {   // new monsters (js/monsters.js)
    colossus: { w: 28, h: 46, hp: 8, speed: 16, sight: 130, reach: 40 },
    reaper: { w: 14, h: 28, hp: 4, speed: 38, sight: 150, reach: 40 },
    archivist: { w: 14, h: 30, hp: 3, speed: 16, sight: 170, keep: 90 },
    porter: { w: 18, h: 30, hp: 5, speed: 18, sight: 150, keep: 80 } },
  bishop: { w: 26, h: 56, hp: 18, speed: 24, keep: 70, pulseH: 30, pulseSpeed: 150, atk: { reach: 56, dmg: 1, knock: 180 } },
  boss: { w: 24, h: 44, hp: 14, range: 58, speed: 34, windup: 0.85, active: 0.22, recover: 1.0, atk: { reach: 70, dmg: 1, knock: 170 } },
  debug: /[?&]debug/.test(location.search)
};
