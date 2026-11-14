# Hollow Vesper - Gothic Cosmic Horror environment pass (environment only)

Baseline: Hollow-Vesper-update-5.zip. Reference mood: The Last Faith trailer (very dark, desaturated, deep layered architecture, fog, shafts of light, red only for danger). Nothing was copied from it.

## What the project actually is (found by inspection)
- Canvas is 960 x 540 pixels; the renderer draws in 320 x 180 logical units at 3x. Tiles are 16 logical px. The level is 108 columns wide with the Keeper arena and the Chancel at the end.
- The renderer already had: a painted far skyline (bg_far.png), procedural gothic nave layers, shafts, fog blobs, ash, foreground silhouettes, props, lights and per-area grading. These were kept.
- The existing "Music quality" setting (Light / Full, automatic on phones) is the only quality switch. It now also lowers the environment effects. No new setting was added (settings and HUD are protected).

## Modified files (3, small)
- js/render.js: 15 changed lines. New layers and effects are called through `envOn()`; if the new art fails to load, the original background is drawn instead.
- js/main.js: 2 changed lines (the self-repair loader now also knows js/environment.js).
- index.html: 4 changed lines (script tag and version key for environment.js).
Not touched (byte-identical to update-5): entities, world, spells, config, monsters, bishop, slayer, whip, save, input, touch, ui, sfx, music, anims, spellfx, menufx, intro, css.

## New files
- js/environment.js (all new environment drawing, lighting, particles, layout)
- assets/environment/backgrounds/env_sky.png, env_city.png, env_towers.png (1920 x 540, seamless)
- assets/environment/foregrounds/env_fg_top.png, env_fg_bottom.png (1920 wide strips)
- assets/environment/props/env_props.png (12 props)
- tools/environment_generator/ (the scripts that made the art, so it can be edited and regenerated; not loaded by the game)

## Visual improvements
- Sky with moon, clouds and a dithered haze; distant gothic city with spires, buttresses and a few faint lit windows; giant towers with lancet windows, a silent bell, a broken rose window with one surviving red section, ember hairline cracks.
- Parallax speeds: sky 0.03, painted skyline 0.1 (faded to 35 percent), city 0.16, towers 0.24, original nave 0.3, original near arches 0.55, foreground 1.35 and 1.6.
- Scenery (decorative only, never over the pit): candelabras, hanging chandeliers, headless statue, fallen columns, altar with torn cloth and a broken bell, crypt gate, cracked bell, dead tree, torn banner pole, corruption growth with an ember seam, coffin, glowing floor cracks.
- Lighting: flickering local light for every candle, chandelier, bell, growth, torch and brazier; warm light pools beside fires; area-tinted window shafts with drifting specks; additive only, no dark overlay.
- Atmosphere: low drifting mist banks, ash (capped), embers near fires, rare falling stone chips with a dust puff, gently pulsing ember cracks, swaying banners and chandeliers, foreground chains, torn dried-blood banners, broken stone lip, dead branches and rubble kept to the top and bottom edges so fights stay readable.

## Performance
- Everything static is a pre-made PNG drawn with drawImage; mist uses one cached sprite; no blur filters; no per-frame canvases.
- Particle pool capped at 48 (20 in light mode); falling stone max 4 and off in light mode; ash 34 (16 in light mode); mist banks 4 (2 in light mode); shaft specks off in light mode.
- Reduced-motion (device setting): no sway, no flicker, no falling stone, no embers.
- Headless test (software rendering, relative only): about 21 fps full, 21 light, 19 original art, so the new art is not slower than the old.

## Tests
Passed (headless Chromium): all new images load; no console or page errors in five places along the level including the Chancel; seams of sky, city, towers and foreground checked by joining the tile ends; particle cap holds (300 requests, 48 kept); light mode switches without errors; movement, jump, whip, greatsword, spell cast, Bishop waking and pause still work; gameplay files are byte-identical.
Not tested (needs live testing): a real Android phone, touch controls on a phone, long play for memory use, different phone aspect ratios, frame rate on real hardware.

## Known issues
- The art is procedurally generated pixel art, a solid first pass but not hand-painted. A pixel artist can repaint any layer: keep the same file names and sizes.
- The original nave arches cover much of the towers layer; the towers show through the bays. Lower the nave alpha in render.js (the 0.95 on the `this.mid` line) to show more.
- The foreground top strip has a tiny stray mark at the tile join.
- The Chancel keeps its earlier stained-glass windows; only the layers behind it are new.
- The planned regions below are direction only; nothing playable was added.

## Deploy to GitHub Pages
1. Unzip. 2. In your repository upload everything, keeping folders (index.html, js/, css/, assets/ including the new assets/environment/ folder, docs/, tools/). 3. Commit. 4. Wait one or two minutes, then hard-refresh the page (on a phone, close the tab and reopen it). If a file is missing, the page names it.

## Planned regions: visual direction (not built)
All regions reuse the same layers (sky, city, towers, nave, props, foreground) with different art and `Env.MOOD` values (fog amount and shaft tint).
| Region | Identity | Palette lean | Key components |
|---|---|---|---|
| Forsaken Belfry | silent bell structures, broken entrances, rusted chains | stone, ember lights | bell frames, chain foreground, corridor arches |
| Sunken Cathedral | flooded nave, dark reflective water, drowned statues | cold ash, little ember | water band with mirrored silhouettes, broken bridges, crypts |
| Ashen Cloister | burned monastery, ash-covered stone, dead trees | ash and dried blood | scorched columns, heavy ash particles, dead trees |
| Hollow Gardens | dead stone gardens, twisted roots, corrupted statues | moss lean | root foreground, statue props, faint growth glow |
| Veiled Archives | collapsed libraries, dusty manuscripts | bone and dark stone | shelves, loose pages, inscription walls |
| Crimson Reliquary | dark red stone, sealed chambers | dried blood | sealed doors, restrained ember lighting |
| Last Choir | enormous ruined sacred architecture, monumental bells | everything darker | giant bell structures, cosmic corruption cracks |
