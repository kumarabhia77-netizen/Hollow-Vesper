# Gilded Thorn whip + Bell-Ringer update (what changed, real numbers)

## New / changed files
New: `js/whip.js`. Changed: `index.html`, `README.md`, `js/config.js`, `js/anims.js`, `js/entities.js`, `js/render.js`, `js/main.js`, `js/input.js`, `js/touch.js`.
Upload ALL of these. The page checks every file version and shows "Please upload the newest: ..." if one is old or missing.

## Gilded Thorn (first weapon, key J / square / X)
Drawn in code (links, bone studs, blade-tip thorn, trail, ember glow). Damage is done by the hitbox in `entities.js`, not by the visuals.
| Move | Dur s | Active s (from-to) | Reach px | Damage (base 1.2 x) | Knock |
|---|---|---|---|---|---|
| Lash 1 | 0.38 | 0.09-0.20 | 44 | x1.0 = 1.20 | 120 |
| Lash 2 | 0.38 | 0.09-0.20 | 48 | x0.9 = 1.08 | 130 |
| Lash 3 | 0.50 | 0.15-0.30 | 56 | x0.8 = 0.96 | 170 |
| Rupture Lash | 0.62 | 0.20-0.38 | 76 | x2.0 = 2.40 | 240 (staggers Bell-Ringer) |
Press J again after the active window to chain. One hit per target per lash.
Resonance gauge (HUD, under the portrait): +12 per hit, tiers at 30 and 60 (stronger ember glow on the whip), decays 5/s after 2.2 s without hitting, -25 when you are hurt. At 60+ the third lash becomes the Rupture Lash and spends 60.
All numbers are in `CFG.player.whip` in `js/config.js`.
Assumptions (the weapon sheet was a small screenshot): the 100/90/80/200 percent scaling and the 0-30/31-60/61-100 tiers come from it; the Rupture Lash trigger, gain, decay and loss values are my choices - tune them.

## Bell-Ringer (the "husk" enemy in the game)
Existing hand-painted frames are kept unchanged: idle 4 @6fps, walk 6 @8, notice 3 @8, windup 3, attack 2, recover 4, hurt 2, death 7 @8. Frames are packed in `assets/husk.png` (786x1136), not 512x512 cells; they are drawn at scale 0.2252.
Added in code (no new painted frames): cloak sway, breathing, bell vibration, hit recoil, bell-ember glow that follows the real ember position in each frame, separate chain-impact effect, stagger state, Bell Resonance ability.
- Body box 14x24. Chain attack: windup 0.55, active 0.16, recover 0.55, reach 36.
- Bell Resonance (new): used when the player is 40-95 px away, every 5 s at most. Wind-up 0.75 s (bell shakes, glow rises, dashed ring shows the reach), wave 0.6 s expanding to radius 56, then recover 0.55. Hits once, only a grounded player inside the ring edge; jumping or dashing avoids it. Nearby particles are pushed outward.
- Stagger: 0.55 s, only from the Rupture Lash.
Debug: add `?debug` to the address to see the whip hitbox and the resonance ring box.

## Still needs an artist (I cannot paint these)
New painted frames to reach the requested counts (idle 6, walk 8, notice 4, windup 4, chain attack 6, hurt 3, stagger 4, resonance 6, death 8) and a Warden sprite that actually holds the whip. Until then the Warden uses calm stance frames during lashes and keeps the sword at the hip.

## Round 2: review, background/render, menu and in-game UI, stable controls
New file: `js/menufx.js`. Also changed: `css/style.css`, `js/input.js`, `js/spells.js`, `js/entities.js`, `js/render.js`, `js/main.js`, `index.html`.
- Controls: an action now stays held while ANY of its keys is down (before, releasing A while holding the left arrow stopped you). All held input is cleared when the window loses focus, the tab is hidden, or the game resumes from a menu/death/load.
- Magic: a spell pressed during a whip lash or a jump is remembered for 0.45 s and fires as soon as it can (no silent ignore). No-echo and no-spell messages still show once, without spam.
- HUD: spell slots K, I and B (Bell Resonance, once unlocked) with radial cooldown, countdown number, ready glow, echo-cost pips and key badge; heartbeat vignette at 1 HP.
- Background/render: per-area colour mood (courtyard, tower, chasm, chapel, boss) that fades between areas, falling ash and rising embers, dark foreground silhouettes (chains, cloth, broken stone, rubble) only along the top and bottom edges so fights and attack warnings stay visible.
- Menus: animated canvas behind the main and pause menus (fog, light shafts, embers, a hanging bell that rings with expanding waves), button sweep/glow, pause menu slide-in, glowing rule line. Turned off by the device "reduce motion" setting.

## Round 3: Eclipse Slayer, Corpse-Stitched Bishop, hero portrait
New files: `js/slayer.js`, `js/bishop.js`, `assets/hero_portrait.png`, `assets/hero_menu.png`.
Changed: `index.html`, `css/style.css`, `js/config.js`, `js/world.js`, `js/save.js`, `js/input.js`, `js/touch.js`, `js/entities.js`, `js/render.js`, `js/main.js`.
Upload ALL files (the page checks versions).
- Weapon switch: Q (or E), gamepad stick-click, or the new touch button. Gilded Thorn whip (default) and Eclipse Slayer greatsword. The choice is not saved yet.
- Eclipse Slayer (numbers in `CFG.player.slayer`): tap attack = Cleave, Cleave, Heavy Cleave (big crimson crescent, stronger knock-back, staggers); hold attack after a slash = Arcane Edge Charge, release (after 0.35 s, full at 0.95 s) fires a piercing crimson blast; dash then attack = Shadow-Step Thrust (i-frames, 58 px reach, dark afterimages and speed lines). Damage is done by hitboxes in code.
- Run and dash visuals: dark cloak smoke and ember wisps while running, speed streaks during the dash.
- Bishop (`CFG.bishop`): 18 HP, optional final boss in the new Desecrated Chancel (columns 80-108, three stained-glass windows). The Keeper arena's east door opens when the Keeper falls. A shrine sits before the Chancel door; the door closes when you step in. Phase 1: Summon (3 rune spots, hands rise after 0.95 s) and staff slam. Below 55 percent: roar, then Corpse-Pulse (low crimson crescents, jump or dash through them) and 5-hand summons. Win screen now appears when the Bishop falls (saved as `bishop` in the save file).
- Hero: the portrait is now in the HUD frame and on the main menu. He is the male Vesper Warden / Eclipse Slayer.
Honest limits: the Warden's body frames are still the old sheet (stance poses plus code-drawn weapons); the Bishop and the Slayer sword are drawn in code, not painted sprites; the Bishop is a stylised version of your mockup. A pixel artist is still needed for painted frames.

## Round 4: new monsters, fast intro with audio, loader fix
New files: `js/monsters.js`, `js/intro.js`. Changed: `index.html`, `css/style.css`, `js/config.js`, `js/main.js`, `js/render.js`.
- Monsters (`CFG.mon`): Hollow Colossus (hp 9, armoured: light hits do half damage, heavy hits stagger it and expose the ember core; slam plus two low shock waves), Veil Reaper (hp 4, vanishes and reappears behind you after a rune telegraph, then slashes), Page-Wraith (hp 3, keeps distance, fans three paper blades), Cinder Porter (hp 5, lobs a lantern; the landing spot smoulders 0.4 s then burns about 3 s). They are placed in the yard and the rise (`CFG.level.enemies`). Original code-drawn designs inspired by the mood of the reference images, not copies.
- Intro (about 22 s): tap or press a key to start (needed for sound), tap again to skip. Generated sound: bell, D-minor drone, wordless choir, sour flat-second, crescendo, hard silence, final bell and bass drop. Visuals: stars, broken throne, dark shapes, barrier cracks, flash, title. Subtitles carry the narration. Optional real voice: add `assets/intro/narr_1.mp3`, `narr_2.mp3`, `rizan.mp3` and open the game with `?narr`. Add `?nointro` to turn the intro off; it shows once per browser session.
- Loader fix: if `index.html` on the site is an older copy, `main.js` now loads the missing script files itself, or names exactly which file is missing ("Problem: Bishop is not defined" came from that).

## Round 5: spell visuals and monster tuning
New file: `js/spellfx.js`. Changed: `index.html`, `js/main.js`, `js/render.js`, `js/config.js`, `js/monsters.js`.
- Spell visuals: casting sigil on the ground with motes drawn into the casting hand (brighter as the cast finishes); Ember Fireball glow, heat trail and burst; Wind Slash wake and arcs; Lightning Strike charge in the sky, ring on the ground, forks, flare, scorch mark with cooling cracks. Damage is unchanged.
- Monster tuning: Hollow Colossus now 8 HP, light hits do 60 percent damage (was 50), stagger lasts 1.6 s (was 1.4); Page-Wraith moved one tile right (column 29) to give the yard more breathing room. All numbers are in `CFG.mon` and the top of each class in `js/monsters.js`.
