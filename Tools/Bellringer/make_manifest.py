"""Builds assets/bellringer/manifest.json from the strips in a folder.
usage: python3 make_manifest.py <folder with br_<name>.png strips> [scale]
Each strip is one animation: equal cells side by side, transparent background, feet on the bottom edge of the cell, character centred on the pivot x (ax).
Cell sizes may differ per strip. Ember coordinates (the bell mouth, in cell pixels) are read from manifest_partial.json if present, else guessed."""
import json, sys, os
from PIL import Image
folder = sys.argv[1]; scale = float(sys.argv[2]) if len(sys.argv) > 2 else 0.08
FR = dict(idle=6, walk=8, notice=4, windup=4, attack=6, recover=4, hurt=3, stagger=4, resonance=6, death=8)
FPS = dict(idle=6, walk=10, notice=8, windup=8, attack=14, recover=8, hurt=10, stagger=8, resonance=8, death=8); LOOP = dict(idle=1, walk=1)
part = json.load(open(os.path.join(folder, "manifest_partial.json"))) if os.path.exists(os.path.join(folder, "manifest_partial.json")) else {}
m = dict(scale=scale, anims={})
for name, n in FR.items():
    p = os.path.join(folder, f"br_{name}.png"); im = Image.open(p); cw, ch = im.width // n, im.height
    em = part.get(name, {}).get("ember") or [[int(cw * 0.7), int(ch * 0.3)]] * n
    m["anims"][name] = dict(image=f"br_{name}.png", frames=n, fps=FPS[name], loop=LOOP.get(name, 0), cell=[cw, ch], ax=cw // 2 if cw < 700 else 256, ember=em)
json.dump(m, open(os.path.join(folder, "manifest.json"), "w")); print("manifest written", {k: v["cell"] for k, v in m["anims"].items()})
