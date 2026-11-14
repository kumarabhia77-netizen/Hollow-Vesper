# Gilded Thorn - match to the concept sheet

Both uploaded images show the SAME weapon (The Gilded Thorn, blade-tipped whip); the second is a larger copy of the first. No different second weapon was in them. The whip is the weapon that was restyled. If a different secondary weapon exists, send its own concept sheet.

## Matched (drawn in code, not painted frames)
- Weapon look: black-iron chain with gilded links and small thorns, torn blood-red ribbons, ornate grip, long ornate blade tip with barbs and an ember vein.
- VFX layers from the sheet: (1) whip trail with chain core, glow layer and ember particle layer; (2) blade slash, thin crimson crescents with a bright edge; (3) impact burst with star spikes, vertical streak, dust, stone debris; (4) resonance energy ring with diamond core and cross ticks; (5) ground crack with stone debris (heavy and Rapture); (6) a few dark-red drops on hits (kept small, no gore); (7) shadow afterimages on the big moves.
- Resonance tiers: 0-30 minor glow, 31-60 medium glow with ring at the feet, 61-100 full bloom. The HUD now shows a resonance emblem with a filling ring and a gauge (THORN / BLOOM / RAPTURE).
- Moves: light combo 3 lashes (100 / 90 / 80 percent); NEW Heavy Lash (hold attack after a lash, release, 150 percent, ground crack); Rapture Lash finisher (needs 60+ resonance, 200 percent, CONSUMES ALL resonance, hits and pulls nearby enemies within 80 px toward the Warden; bosses and the Colossus are hit but not pulled).

## Not done (needs painted frames or more design)
- The painted animation frames on the sheet (idle 6, walk 6, run 6, dash 6, jump, fall, air attack, dash attack, whip pull) and the Warden holding the whip: the Warden still uses the old body frames.
- Air attack, dash attack and the separate Whip Pull (L2) move are not implemented.
- Weapon, resonance, passive/active slot and finisher icons.

## Changed files
js/whip.js (visuals), js/config.js (heavy lash, pull radius, Rapture name), js/entities.js (heavy lash on hold, Rapture pull, resonance fully consumed), js/render.js (1 line: the dash pose only for the greatsword).

## Tests (headless)
Passed: no errors; whip lashes draw the new chain, tip, crescents and star-burst; heavy lash triggers on hold and release; greatsword thrust and charge still work. Not tested: Android, balance of the new moves.
