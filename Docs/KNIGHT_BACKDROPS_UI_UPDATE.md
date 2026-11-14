# Update notes: Cursed Knight, dash fix, vibrant whip, colourful menus, area backdrops

## Cursed Knight (new elite enemy) - assets/cursed_knight/ck_atlas.png, js/knight.js
- All 59 frames were cut from your Monster Pack sheet (its transparent background was kept): idle 5, walk 8, run 8, attack 6, attack combo 8, hurt 3, stagger 4, die 7, bell ring 5, soul absorb 5. The sheet captions say 6 / 8 / 6 / 6 for idle, die, bell and soul, but only 5 / 7 / 5 / 5 frames are drawn, so those are what exist.
- Stats (CFG.mon.knight): 12 HP, walk 24, run 66, sight 150, slash reach 44. One knight stands at column 43 (after the Sentinel, before the pit).
- Attacks: Slash (wind-up 0.5 s, hit, recover 0.5 s); Combo (wind-up 0.45 s, two quick hits); Bell Ring special (raises bells 0.9 s, then a ground wave of radius 62: jump it or dash through it); Soul Absorb special (once, below 50 percent HP: channels 1.8 s, heals about 3 HP, takes 30 percent more damage, a heavy hit interrupts it).
- Super armour: light hits do not interrupt its attacks; heavy hits (Heavy Cleave, Rapture Lash, blasts) stagger it.
- Damage is done only by hitboxes and the wave in code. Drawing is the painted frames plus a red soul aura and run dust.

## Dash
- Cooldown added (CFG.player.dodge.cd 0.85 s from the start of a dash), so it cannot be chained continuously. Tested: dash, immediate second dash blocked, dash after 0.9 s works.
- Shadow afterimages are stronger: more opaque dark copy, brighter rim and a faint crimson glow, spawned every 0.025 s and lasting 0.55 s.

## Gilded Thorn
- More vibrant: brighter crimson and amber, thicker glow, brighter crescents, always-glowing blade tip, more spark particles.

## Menus
- Map: every section has its own colour (gate gold, yard orange, tower violet, chasm cyan, rise green, arena red, Chancel magenta); the current section glows and pulses; ground lines, platforms and labels use the section colour.
- Spell menu: every spell tile has its own colour and glow (Ember Fireball orange, Wind Slash teal, Lightning yellow, Bell gold, and more for the planned spells).

## Area backdrops (js/environment.js, assets/environment/backdrops/)
- Two of your pictures are used: the bell and sundial hall for the Keeper's arena, the bone-throne cathedral for the Desecrated Chancel. They fade in when you enter the area and fade out when you leave, pan slowly, and the old arch layers are dimmed while they show. The floor strip was cropped off (the game draws its own floor).
- To add more: put a 16:9 picture in assets/environment/backdrops/ and add one line to `Env.BACKDROPS` (area ids: gate, yard, tower, span, rise, arena, chancel).
- Not used: the other six pictures. They look like screenshots or art from commercial games (two are phone screenshots), and your own bibles require original art. Only add pictures you made or have the rights to.

## Tests (headless)
Passed: no errors; every Cursed Knight state draws; a real fight hurts the player; death removes the knight; dash cooldown; arena and Chancel backdrops load and fade; map and spell menus open and show the colours. Not tested: Android, balance of the knight (it is tough: a standing player lost 5 HP in about six seconds).
Changed files: js/knight.js (new), js/monsters.js, js/environment.js, js/render.js, js/whip.js, js/entities.js, js/config.js, js/ui.js, js/main.js, index.html, css/style.css, assets/cursed_knight/, assets/environment/backdrops/.
