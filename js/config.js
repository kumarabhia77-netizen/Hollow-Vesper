"use strict";
// All game numbers live here. Change a number, reload, see the difference.
const CFG = {
  W: 320, H: 180, CAMY: 92, T: 16, GRAV: 1500,
  player: { w: 12, h: 26, speed: 110, jump: 480, hp: 5, inv: 0.5, coyote: 0.1, buffer: 0.12,
    dodge: { dur: 0.3, speed: 260, inv: 0.24, cd: 0 },
    atk: { dur: 0.44, from: 0.12, to: 0.22, reach: 26, h: 22, dmg: 1, knock: 130, moveMul: 0.35 } },
  enemies: {
    sentinel: { w: 14, h: 26, hp: 5, speed: 34, sight: 130, notice: 0.5, atk: { range: 34, windup: 0.7, active: 0.15, recover: 1.0, reach: 36, dmg: 1, knock: 190 } },
    bound: { w: 16, h: 28, hp: 4, speed: 26, sight: 150, notice: 0.5, keep: 60, rest: 1.1, wave: 75, atk: { windup: 0.7, recover: 0.9, reach: 0, dmg: 1, knock: 140 } },
    mourner: { w: 14, h: 24, hp: 3, speed: 30, sight: 140, notice: 0.35, atk: { range: 30, windup: 0.4, active: 0.14, recover: 0.7, reach: 34, dmg: 1, knock: 150 } },
    chime: { w: 10, h: 10, speed: 58 },
    husk: { w: 14, h: 24, hp: 3, notice: 0.4, speed: 32, chase: 52, sight: 110, color: "#6e5a50",
      atk: { range: 36, windup: 0.55, active: 0.16, recover: 0.55, reach: 36, dmg: 1, knock: 150 } }
  },
  // Level: sizes are in tiles (1 tile = 16 pixels). Platform = [x, y, width, height optional]
  level: { cols: 80, rows: 17, ground: 15, spawn: [3, 15], pit: [46, 14], bridge: [46, 14], gate: [69, 9, 6], shrines: [5, 63], bell: 42,
    platforms: [[12, 11, 5], [19, 9, 4], [30, 12, 6], [36, 10, 4]],
    props: [["shrine",5],["torch",9],["statue",14],["banner",17],["barrel",21],["lantern",27],["torch",33],["bell",42],["lantern",50],["banner",55],["shrine",63],["torch",66],["rubble",72],["cage",74],["torch",77]],
    enemies: [[20, "husk"], [27, "husk"], [33, "bound"], [39, "sentinel"], [64, "mourner"], [67, "husk"], [76, "keeper"]], chimes: [[50, 8], [53, 7], [56, 8]] },
  boss: { w: 24, h: 44, hp: 14, range: 58, speed: 34, windup: 0.85, active: 0.22, recover: 1.0, atk: { reach: 70, dmg: 1, knock: 170 } },
  debug: /[?&]debug/.test(location.search)
};
