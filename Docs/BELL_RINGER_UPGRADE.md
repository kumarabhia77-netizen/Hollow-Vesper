# Bell-Ringer upgrade - what was done, and why the art was NOT replaced

## Inspection of the existing Bell-Ringer
- Enemy: the base "husk" (class Enemy, `canRing` true). Body box 14 x 24, hp 3, chain attack windup 0.55 s / active 0.16 s / recover 0.55 s, reach 36, Bell Resonance windup 0.75 s / wave 0.6 s / radius 56.
- Sheet: assets/husk.png, 786 x 1136, hand-painted, packed (frames are not a grid). The two recoloured sheets (husk_b, husk_m) share the SAME frame data, so that data must not be edited.
- Animations in the existing data (frames, fps, draw scale): idle 4 (scale 0.1037), walk 6, notice 3, windup 3, attack 2, recover 4, hurt 2, death 7 (the rest use scale 0.2252). Frames are 70-235 px wide and 102-241 px tall, so the creature is about 25 game pixels tall.
- Pivot: horizontal anchor stored per frame; the bottom edge of the frame rectangle is the feet line. Ember position inside the bell is stored per frame (found automatically) and drives the glow.
- Code: render.js `enemy()` picks the strip from the enemy state; `Bellfx` (js/whip.js) adds sway, ember glow, the resonance wave and the chain impact effect.

## Decision
I built a rigged, procedurally drawn replacement for all ten requested animations (53 frames, with simulated chain physics) and compared it with your painted sheet. It was clearly worse (stick limbs, a plain cone-shaped bell). Shipping it would be a downgrade, so the original art stays. The comparison is in docs/bellringer_before_after_standin.png (left: original; right: the rig stand-in). A premium upgrade needs real painted frames.

## What was delivered
1. js/bellringer.js
   - `BR.fx`: small ember specks around the bell (more during windup and resonance) and dust at the feet while walking. Capped, off in light mode and reduced-motion. Drawing only; no damage events.
   - A loader and state mapper for new strips. OFF by default (`enabled: false`), so nothing changes visually until real art is added. With it off, the game runs exactly as before.
2. render.js: 3 small edits in `enemy()` so the strip can come from either sheet (falls back to the original automatically).
3. tools/bellringer/make_manifest.py builds the manifest from a folder of strips; gen_br.py is the stand-in rig used for testing.
4. assets/bellringer/README.txt describing the drop-in format.

## How to use new art (when you have it)
1. Make ten strips: br_idle (6 frames), br_walk (8), br_notice (4), br_windup (4), br_attack (6), br_recover (4), br_hurt (3), br_stagger (4), br_resonance (6), br_death (8). Equal cells side by side, transparent background, facing right, feet on the bottom edge of the cell, character centred on the pivot. Cell sizes may differ per strip (the attack strips may be wider). 512 x 480 cells with the creature about 330 px tall match the game scale 0.08.
2. Put them in assets/bellringer/ and run `python3 tools/bellringer/make_manifest.py assets/bellringer 0.08`.
3. In js/bellringer.js set `enabled: true`. Upload. If anything is missing the game quietly keeps the original art.
Or send the strips to Claude, who will clean, align, build the manifest and test them.
The ChatGPT pack (Hollow_Vesper_Asset_Request_Pack.pdf) already lists these ten animations with beats and the original sheet as reference.

## State mapping (gameplay is untouched; the art follows it)
idle/patrol -> idle or walk (by speed); notice -> notice; windup -> windup; attack -> attack (progress over the existing 0.16 s active window); recover -> recover; hurt -> hurt; stagger -> stagger; ringup -> resonance first half; ring -> resonance second half; dead -> death.

## Tests (headless Chromium)
Passed: shipped build runs with no errors and still draws the original art; ember/dust particles stay capped (30 seen, cap 170); loader test in a throwaway copy with the stand-in strips: all ten strips load, every state picks the right strip, feet sit on the ground line, pivot and ember glow line up, resonance ring still aligns, no errors; gameplay files byte-identical to the previous build except render.js (3 edits), main.js (loader list), index.html (script tag).
Not tested: Android hardware, long-play memory, hitbox alignment with real new art (needs the art).

## Known issues
- No new painted frames exist yet, so the creature looks the same as before apart from the ember specks and dust.
- The stand-in rig frames are for testing only and are deliberately not in the shipped assets.
