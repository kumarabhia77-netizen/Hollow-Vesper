"use strict";
// All game numbers live here. Change a number, reload, see the difference.
const CFG = {
  W: 480, H: 270, T: 16, GRAV: 1500,
  player: { w: 12, h: 26, speed: 110, jump: 480, hp: 5, inv: 0.9, coyote: 0.1, buffer: 0.12,
    atk: { dur: 0.32, from: 0.08, to: 0.18, reach: 26, h: 22, dmg: 1, knock: 130, moveMul: 0.35 } },
  enemies: {
    husk: { w: 14, h: 24, hp: 3, speed: 32, chase: 52, sight: 110, color: "#6e5a50",
      atk: { range: 22, windup: 0.5, active: 0.12, recover: 0.55, reach: 24, dmg: 1, knock: 150 } }
  },
  // Level: sizes are in tiles (1 tile = 16 pixels). Platform = [x, y, width, height optional]
  level: { cols: 80, rows: 17, ground: 15, spawn: [3, 15],
    platforms: [[12, 11, 5], [19, 9, 4], [30, 12, 6], [44, 11, 5], [56, 12, 6], [66, 11, 4]],
    props: [["shrine",5],["torch",9],["statue",15],["banner",17],["barrel",22],["lantern",29],["torch",34],["bell",38],["lantern",45],["rubble",46],["torch",50],["banner",52],["cage",61],["skull",64],["torch",68],["barrel",70]],
    enemies: [[26, "husk"], [40, "husk"], [58, "husk"], [72, "husk"]] },
  debug: /[?&]debug/.test(location.search)
};
