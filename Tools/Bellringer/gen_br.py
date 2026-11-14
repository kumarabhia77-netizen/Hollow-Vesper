import math, random, json, numpy as np, sys, os
from PIL import Image, ImageDraw
def C(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
VOID, STONE, ASH, BONE, EMBER, BLOOD, MOSS = map(C, ["#0c0b11", "#2a2630", "#5b5560", "#d9cfbd", "#c8553d", "#6b1d24", "#2f3a2c"])
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
def RAMP(b): return [mix(b, BONE, 0.3), mix(b, BONE, 0.1), b, mix(b, VOID, 0.38), mix(b, VOID, 0.65)]
def shaded(im, polys, base, ellipses=(), top_light=0.12):
    m = Image.new("L", im.size, 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon(p, fill=255)
    for e in ellipses: d.ellipse(e, fill=255)
    mk = np.array(m) > 0; ys, xs = np.nonzero(mk)
    if not len(xs): return
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    X, Y = np.meshgrid(np.arange(im.width), np.arange(im.height)); t = ((X - x0) / max(1, x1 - x0)) * 0.7 + ((Y - y0) / max(1, y1 - y0)) * 0.3 - top_light
    cols = RAMP(base); n = len(cols) - 1; tt = np.clip(t, 0, 0.999) * n; i = np.floor(tt).astype(int); f = tt - i
    thr = np.tile(BAYER, (im.height // 4 + 1, im.width // 4 + 1))[:im.height, :im.width]; idx = np.minimum(i + (f > thr).astype(int), n)
    arr = np.array(im); col = np.array(cols, dtype=np.uint8)[idx]; arr[mk, :3] = col[mk]; arr[mk, 3] = 255; im.paste(Image.fromarray(arr, "RGBA"))
def outline(im, col=VOID):
    a = np.array(im); al = a[..., 3] > 0; edge = np.zeros_like(al)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): edge |= np.roll(np.roll(al, dx, 1), dy, 0) & ~al
    a[edge] = list(col) + [255]; return Image.fromarray(a, "RGBA")
# ---------------------------------------------------------------- geometry helpers
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def pol(c, ang, L): return (c[0] + math.sin(ang) * L, c[1] + math.cos(ang) * L)     # angle 0 = straight down, positive = forward (+x)
def rot(p, a, c=(0, 0)): x, y = p[0] - c[0], p[1] - c[1]; return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))
def ik(hip, foot, l1, l2, bend=1):
    dx, dy = foot[0] - hip[0], foot[1] - hip[1]; d = min(math.hypot(dx, dy), l1 + l2 - 0.5); d = max(d, 1.0)
    a = math.atan2(dy, dx); cosb = max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))); b = math.acos(cosb)
    k = a - bend * b; return (hip[0] + math.cos(k) * l1, hip[1] + math.sin(k) * l1)
def limb(im, a, b, wa, wb, base, joint=True):
    ang = math.atan2(b[1] - a[1], b[0] - a[0]) + math.pi / 2; dx, dy = math.cos(ang), math.sin(ang)
    q = [(a[0] + dx * wa, a[1] + dy * wa), (b[0] + dx * wb, b[1] + dy * wb), (b[0] - dx * wb, b[1] - dy * wb), (a[0] - dx * wa, a[1] - dy * wa)]
    shaded(im, [q], base, ellipses=[[a[0] - wa, a[1] - wa, a[0] + wa, a[1] + wa], [b[0] - wb, b[1] - wb, b[0] + wb, b[1] + wb]] if joint else ())
# ---------------------------------------------------------------- pose model
D = dict(hx=0, hy=88, lean=0.78, bell=(22, 14, 0.42), na=(0.35, 0.25), fa=(0.05, 0.12), fn=(16, 0), ff=(-14, 0), ember=0.55, cloak=0.0, amp=5, rot=0.0, shake=0.0, bdrop=0.0)
def lerp(a, b, u):
    if isinstance(a, tuple): return tuple(lerp(x, y, u) for x, y in zip(a, b))
    return a + (b - a) * u
def mkpose(**kw): p = dict(D); p.update(kw); return p
def interp(keys, u):
    u = max(0, min(0.9999, u)) * (len(keys) - 1); i = int(u); return {k: lerp(keys[i][k], keys[i + 1][k], u - i) for k in keys[i]}
def anim_idle(i, n):
    u = i / n; s = math.sin(2 * math.pi * u); return mkpose(hy=88 + 1.6 * s, lean=0.78 + 0.03 * s, bell=(22, 14 + 1.2 * s, 0.42 + 0.05 * math.sin(2 * math.pi * u + 1)), na=(0.35 + 0.05 * s, 0.25), fa=(0.05 - 0.04 * s, 0.12), ember=0.5 + 0.3 * (0.5 + 0.5 * math.sin(2 * math.pi * u * 1)), cloak=2 * math.pi * u, amp=4)
def anim_walk(i, n):
    u = i / n; s = math.sin(2 * math.pi * u); c = math.cos(2 * math.pi * u)
    return mkpose(hy=88 - 2.5 * abs(s), hx=1.5 * s, lean=0.80 + 0.05 * c, bell=(22, 14 + 2 * abs(s), 0.42 + 0.12 * math.sin(2 * math.pi * u + 1.2)), fn=(16 + 17 * s, max(0, -c) * 11), ff=(-14 - 17 * s, max(0, c) * 11), na=(0.45 - 0.2 * s, 0.25), fa=(0.1 + 0.25 * s, 0.15), ember=0.55 + 0.15 * s, cloak=2 * math.pi * u, amp=7)
KN = {
 "notice": [mkpose(), mkpose(lean=0.55, bell=(22, 8, 0.1), ember=0.8, na=(0.55, 0.35), fa=(-0.2, 0.2)), mkpose(lean=0.3, bell=(20, 2, -0.25), ember=1.0, na=(0.8, 0.5), fa=(-0.5, 0.3), hx=-3), mkpose(lean=0.32, bell=(20, 2, -0.3), ember=0.95, na=(0.8, 0.5), fa=(-0.5, 0.3), hx=-3)],
 "windup": [mkpose(lean=0.6, na=(0.9, 0.4)), mkpose(lean=0.35, na=(2.0, 0.3), bell=(20, 8, 0.6), ember=0.8, hx=-5), mkpose(lean=0.2, na=(2.7, 0.2), bell=(18, 8, 0.85), ember=1.0, hx=-9, fa=(0.4, 0.2)), mkpose(lean=0.16, na=(2.85, 0.15), bell=(18, 8, 0.9), ember=1.0, hx=-11, fa=(0.5, 0.2))],
 "attack": [mkpose(lean=0.2, na=(2.8, 0.2), hx=-10, ember=1.0, bell=(18, 8, 0.9)), mkpose(lean=0.4, na=(2.2, 0.1), hx=-4, ember=1, bell=(20, 10, 0.7)), mkpose(lean=0.7, na=(1.7, 0.05), hx=4, ember=0.9, bell=(24, 12, 0.5), ff=(-18, 0)), mkpose(lean=0.95, na=(1.45, 0.0), hx=14, ember=0.9, bell=(26, 16, 0.3), fn=(26, 0)), mkpose(lean=1.0, na=(1.3, 0.0), hx=18, ember=0.8, bell=(26, 16, 0.25), fn=(30, 0)), mkpose(lean=1.0, na=(1.2, 0.05), hx=20, ember=0.7, bell=(26, 16, 0.25), fn=(32, 0))],
 "recover": [mkpose(lean=1.0, na=(1.2, 0.05), hx=20, fn=(32, 0)), mkpose(lean=0.92, na=(0.85, 0.15), hx=14, fn=(26, 0)), mkpose(lean=0.85, na=(0.55, 0.2), hx=7, fn=(20, 0)), mkpose(lean=0.8, na=(0.38, 0.25), hx=2, ember=0.55)],
 "hurt": [mkpose(), mkpose(lean=0.4, hx=-8, bell=(20, 8, -0.3), ember=1.0, na=(0.9, 0.3), fa=(-0.3, 0.3)), mkpose(lean=0.5, hx=-12, bell=(21, 10, -0.05), ember=0.9, na=(0.7, 0.3), fa=(-0.1, 0.2))],
 "stagger": [mkpose(lean=0.5, hx=-8, bell=(20, 8, -0.25), ember=0.9, na=(1.0, 0.3), fa=(-0.4, 0.3)), mkpose(lean=0.95, hx=-14, bell=(24, 14, 0.7), ember=0.7, na=(0.2, 0.2), fa=(0.6, 0.3), fn=(8, 6)), mkpose(lean=0.45, hx=-18, bell=(20, 8, -0.3), ember=1.0, na=(1.1, 0.4), fa=(-0.6, 0.3), ff=(-20, 8)), mkpose(lean=0.85, hx=-10, bell=(23, 12, 0.45), ember=0.6, na=(0.5, 0.3), fa=(0.2, 0.2))],
}
def anim_res(i, n):
    u = i / (n - 1); lift = min(1, u * 2.2); sh = math.sin(i * 2.3) * (0.14 if i >= 2 else 0.05)
    return mkpose(lean=0.62 - 0.3 * lift, hx=-4 * lift, bell=(20, 6 - 8 * lift, 0.3 - 0.9 * lift + sh), ember=0.6 + 0.4 * lift, na=(0.5 + 1.6 * lift, 0.4), fa=(0.1 + 1.5 * lift, 0.4), shake=sh * 30)
def anim_death(i, n):
    u = i / (n - 1); e = u * u
    return mkpose(lean=0.78 + 0.5 * u, hy=88 - 55 * e, hx=8 * u, rot=1.45 * min(1, u * 1.15), ember=max(0, 0.9 - 1.1 * u), bdrop=max(0, (u - 0.45) / 0.55), na=(0.35 + 0.6 * u, 0.3), fa=(0.1 + 0.8 * u, 0.3), fn=(16 + 10 * u, 0), ff=(-14 + 6 * u, 0), amp=3)
# ---------------------------------------------------------------- the figure
SKIN = mix(ASH, MOSS, 0.5); CLOTH = mix(STONE, VOID, 0.35); BRONZE = mix(mix(ASH, EMBER, 0.38), VOID, 0.22); IRON = mix(mix(ASH, VOID, 0.35), BLOOD, 0.12)
def bell_pts(c, rot_, scale=1.0):
    prof = [(-6, -30), (-11, -22), (-17, -8), (-24, 8), (-29, 22), (-31, 28)]
    right = [(-x, y) for x, y in reversed(prof)]; pts = prof + right
    return [rot(add(c, (x * scale, y * scale)), rot_, c) for x, y in pts]
def draw_bell(im, c, rot_, ember, seed=3):
    rng = random.Random(seed); sc = 1.0; pts = bell_pts(c, rot_, sc)
    crown = rot(add(c, (0, -35)), rot_, c)
    shaded(im, [pts], BRONZE, ellipses=[[crown[0] - 5, crown[1] - 5, crown[0] + 5, crown[1] + 5]])
    mouth = rot(add(c, (0, 28)), rot_, c)
    d = ImageDraw.Draw(im)
    d.ellipse([mouth[0] - 31, mouth[1] - 8, mouth[0] + 31, mouth[1] + 8], fill=mix(BRONZE, VOID, 0.2)); d.ellipse([mouth[0] - 27, mouth[1] - 6, mouth[0] + 27, mouth[1] + 6], fill=VOID)   # rim and dark interior
    k = ember; core = mix(VOID, EMBER, 0.35 + 0.65 * k); d.ellipse([mouth[0] - 17, mouth[1] - 3, mouth[0] + 17, mouth[1] + 5], fill=mix(VOID, BLOOD, 0.5 + 0.4 * k)); d.ellipse([mouth[0] - 11, mouth[1] - 1, mouth[0] + 11, mouth[1] + 4], fill=core)
    if k > 0.35: d.ellipse([mouth[0] - 5, mouth[1], mouth[0] + 5, mouth[1] + 3], fill=mix(EMBER, BONE, 0.55 * k))
    for (px, py, r) in [(-14, 6, 5), (-9, 20, 4), (12, 14, 4), (-18, -4, 3)]:   # corrosion patches
        q = rot(add(c, (px, py)), rot_, c); d.ellipse([q[0] - r, q[1] - r * 0.7, q[0] + r, q[1] + r * 0.7], fill=mix(MOSS, VOID, 0.15))
    cr = [rot(add(c, p), rot_, c) for p in [(-3, -26), (2, -14), (-4, -2), (3, 12), (-1, 24)]]; d.line(cr, fill=VOID, width=2)
    if k > 0.3: d.line(cr[2:], fill=mix(VOID, EMBER, 0.55 * k + 0.3), width=1)
    rim = rot(add(c, (-24, 12)), rot_, c); d.line([rim, rot(add(c, (-14, -6)), rot_, c)], fill=mix(BRONZE, BONE, 0.45), width=1)   # light edge
    return mouth
def render_frame(P, cw, ch, ox, gy, chain_pts=None, ball=None):
    im = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); O = (ox, gy)
    def W(p): return (O[0] + p[0], O[1] + p[1])
    hip = (P["hx"], -P["hy"]); sh = pol(hip, 0, 0); L = 60; lean = P["lean"]; shoulder = (hip[0] + math.sin(lean) * L, hip[1] - math.cos(lean) * L)
    # legs
    fn = (P["hx"] + P["fn"][0], -P["fn"][1]); ff = (P["hx"] + P["ff"][0], -P["ff"][1]); kn = ik(add(hip, (3, 0)), fn, 46, 50, 1); kf = ik(add(hip, (-3, 0)), ff, 46, 50, 1)
    parts = []
    def layer(fn_): l = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); fn_(l); return outline(l)
    # far arm
    def far_arm(l):
        s0 = add(shoulder, (-5, 2)); e = pol(s0, P["fa"][0], 50); h = pol(e, P["fa"][0] + P["fa"][1], 56); limb(l, W(s0), W(e), 5, 4, mix(SKIN, VOID, 0.35)); limb(l, W(e), W(h), 4, 3, mix(SKIN, VOID, 0.35)); l_ = ImageDraw.Draw(l)
        for k in range(3): fp = pol(h, P["fa"][0] + P["fa"][1] + (k - 1) * 0.35, 12); l_.line([W(h), W(fp)], fill=mix(SKIN, VOID, 0.5), width=2)
    parts.append(layer(far_arm))
    def far_leg(l): limb(l, W(add(hip, (-3, 0))), W(kf), 7, 5, mix(CLOTH, VOID, 0.2)); limb(l, W(kf), W(ff), 5, 4, mix(SKIN, VOID, 0.3)); shaded(l, [[W(ff), W(add(ff, (13, 0))), W(add(ff, (13, 4))), W(add(ff, (-4, 4)))]], mix(STONE, VOID, 0.4))
    parts.append(layer(far_leg))
    # cloak (behind the body): ragged hem that trails and sways
    def cloak(l):
        ph = P["cloak"]; amp = P["amp"]; top = add(shoulder, (-6, -2)); pts = [W(top), W(add(shoulder, (6, 6)))]
        n = 9; hem = []
        for i in range(n + 1):
            u = i / n; x = -52 + 62 * u + P["hx"] + math.sin(ph + i * 0.8) * amp * (0.4 + 0.6 * (1 - u)) - lean * 8; y = -(4 if i % 2 else 0) - random.Random(i).randint(0, 5) - (10 if i == 0 else 0)
            hem.append(W((x, y)))
        pts = [W(top)] + list(reversed(hem)) + [W(add(shoulder, (8, 8)))]
        shaded(l, [pts], CLOTH); d = ImageDraw.Draw(l)
        for i in range(1, n, 2): d.line([W(add(top, (i * -3, 6))), hem[n - i]], fill=mix(CLOTH, VOID, 0.55))
        d.line([hem[0], hem[1]], fill=mix(BLOOD, VOID, 0.2), width=1)
    parts.append(layer(cloak))
    # torso
    def torso(l):
        a = hip; b = shoulder; perp = (math.cos(lean), math.sin(lean)); w0, w1 = 13, 15
        q = [W((a[0] - perp[0] * w0, a[1] - perp[1] * w0 + 0)), W((a[0] + perp[0] * w0, a[1] + perp[1] * w0 + 0)), W((b[0] + perp[0] * w1 + 6, b[1] + perp[1] * w1)), W((b[0] - perp[0] * w1 - 4, b[1] - perp[1] * w1 - 2))]
        shaded(l, [q], mix(CLOTH, ASH, 0.15)); d = ImageDraw.Draw(l); sp = [W(add(a, (-2, -8))), W(add(b, (-8, 4)))]
        d.line(sp, fill=mix(SKIN, VOID, 0.2), width=2)                                  # exposed spine ridge
        for k in range(5): t = k / 5; p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); d.line([W(add(p, (-9, 0))), W(add(p, (-3, 2)))], fill=mix(SKIN, VOID, 0.35))   # ribs
        d.line([W(add(a, (-12, 2))), W(add(a, (12, 2)))], fill=mix(BLOOD, VOID, 0.2), width=2)   # belt
    parts.append(layer(torso))
    def near_leg(l): limb(l, W(add(hip, (3, 0))), W(kn), 7, 5, CLOTH); limb(l, W(kn), W(fn), 5, 4, SKIN); shaded(l, [[W(fn), W(add(fn, (14, 0))), W(add(fn, (14, 4))), W(add(fn, (-4, 4)))]], mix(STONE, VOID, 0.2)); d = ImageDraw.Draw(l); d.line([W(add(kn, (-5, 4))), W(add(kn, (4, 10)))], fill=mix(CLOTH, VOID, 0.5))
    parts.append(layer(near_leg))
    # near arm + hand position (chain attaches here)
    s0 = add(shoulder, (4, 2)); e = pol(s0, P["na"][0], 52); h = pol(e, P["na"][0] + P["na"][1], 58)
    def near_arm(l):
        limb(l, W(s0), W(e), 6, 4.5, SKIN); limb(l, W(e), W(h), 4.5, 3.5, SKIN); d = ImageDraw.Draw(l); d.line([W(add(e, (-3, 0))), W(add(e, (3, 0)))], fill=mix(SKIN, VOID, 0.55))
        fa = P["na"][0] + P["na"][1]
        for k in range(3): fp = pol(h, fa + (k - 1) * 0.4, 13); d.line([W(h), W(fp)], fill=mix(SKIN, VOID, 0.4), width=2)
        d.ellipse([W(h)[0] - 4, W(h)[1] - 4, W(h)[0] + 4, W(h)[1] + 4], outline=IRON)                                   # iron cuff
    parts.append(layer(near_arm))
    # bell head
    bc = (shoulder[0] + P["bell"][0] + P["bdrop"] * 40, shoulder[1] + P["bell"][1] + P["bdrop"] * (-shoulder[1] - 30))
    brot = P["bell"][2] + P["bdrop"] * 1.1; shk = P["shake"]; bc = (bc[0] + shk * 0.2, bc[1])
    mouth_holder = {}
    def bellp(l): mouth_holder["m"] = draw_bell(l, W(bc), brot + shk * 0.01, P["ember"])
    bl = layer(bellp); 
    # collect parts that need chain between (chain in front of legs, behind bell)
    return parts, bl, W, h, mouth_holder, im
def chain_draw(l, pts, ball):
    d = ImageDraw.Draw(l)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; ang = math.atan2(b[1] - a[1], b[0] - a[0]); m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        w, hh = (4.2, 2.6) if i % 2 == 0 else (2.6, 3.6)
        q = [(m[0] + math.cos(ang) * 4 * 1.0 - math.sin(ang) * hh, m[1] + math.sin(ang) * 4 + math.cos(ang) * hh), (m[0] + math.cos(ang) * 4 + math.sin(ang) * hh, m[1] + math.sin(ang) * 4 - math.cos(ang) * hh), (m[0] - math.cos(ang) * 4 + math.sin(ang) * hh, m[1] - math.sin(ang) * 4 - math.cos(ang) * hh), (m[0] - math.cos(ang) * 4 - math.sin(ang) * hh, m[1] - math.sin(ang) * 4 + math.cos(ang) * hh)]
        d.polygon(q, fill=mix(IRON, BONE, 0.12 if i % 2 else 0)); d.line(q + [q[0]], fill=VOID)
    bx, by = ball; shaded(l, [], IRON, ellipses=[[bx - 10, by - 10, bx + 10, by + 10]], top_light=0.0)
    d.ellipse([bx - 10, by - 10, bx + 10, by + 10], outline=VOID); d.ellipse([bx - 6, by - 7, bx - 2, by - 3], fill=mix(IRON, BONE, 0.35))
    for a in range(0, 360, 60): px, py = bx + 11 * math.cos(math.radians(a)), by + 11 * math.sin(math.radians(a)); d.rectangle([px - 1, py - 1, px + 1, py + 1], fill=mix(IRON, VOID, 0.4))
def simulate_chain(hands, ground, N=11, L=7.5, loops=3):
    """verlet chain from the hand to a heavy ball that rests on the ground; returns list per frame of (points, ball)"""
    seq = hands * loops; pts = [[hands[0][0] + 6 + i * 2, hands[0][1] + i * L * 0.6] for i in range(N + 1)]; prev = [p[:] for p in pts]; out = []
    for fi, h in enumerate(seq):
        ph = seq[fi - 1] if fi else h
        for sub in range(6):
            hh = (ph[0] + (h[0] - ph[0]) * (sub + 1) / 6, ph[1] + (h[1] - ph[1]) * (sub + 1) / 6)
            for i in range(1, N + 1):
                x, y = pts[i]; px, py = prev[i]; vx, vy = (x - px) * 0.97, (y - py) * 0.97; g = 0.9 if i < N else 1.6
                prev[i] = [x, y]; pts[i] = [x + vx, y + vy + g]
            pts[0] = [hh[0], hh[1]]
            for _ in range(10):
                pts[0] = [hh[0], hh[1]]
                for i in range(N):
                    a, b = pts[i], pts[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; dist = math.hypot(dx, dy) or 1e-6; diff = (dist - L) / dist
                    if i == 0: b[0] -= dx * diff; b[1] -= dy * diff
                    else: wa, wb = (0.5, 0.5) if i + 1 < N else (0.2, 0.8); a[0] += dx * diff * wa; a[1] += dy * diff * wa; b[0] -= dx * diff * wb; b[1] -= dy * diff * wb
                for i in range(1, N + 1):
                    lim = ground - (10 if i == N else 2)
                    if pts[i][1] > lim: pts[i][1] = lim; prev[i][0] += (pts[i][0] - prev[i][0]) * 0.35           # ground friction
        if fi >= len(seq) - len(hands): out.append(([p[:] for p in pts[:N]], pts[N][:]))
    return out
def build_anim(name, n, frames_pose, cw, ch, ox, gy, loops=3, chain=True):
    # hand positions from the rig, simulate the chain, then draw
    rigs = []; hands = []
    for P in frames_pose:
        parts, bl, W, h, mh, base = render_frame(P, cw, ch, ox, gy); rigs.append((parts, bl, W, h, mh, base)); hands.append(W(h))
    # for death the whole body rotates about the feet
    sim = simulate_chain(hands, gy, loops=loops) if chain else None
    out = []
    for i, (P, (parts, bl, W, h, mh, base)) in enumerate(zip(frames_pose, rigs)):
        body = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        for p in parts: body.alpha_composite(p)
        if sim:
            cl = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); chain_draw(cl, *sim[i]); body.alpha_composite(outline(cl))
        body.alpha_composite(bl)
        if P["rot"]: body = body.rotate(-math.degrees(P["rot"]), center=(ox, gy), resample=Image.NEAREST)
        # ember position (mouth) for the game's glow, in cell pixels at 2x
        m = mh["m"]; 
        if P["rot"]: m = rot(m, P["rot"], (ox, gy))
        out.append((body, m))
    return out
def render_sheet(name, n, fn, cw=256, ch=240, ox=128, gy=238, loops=3, chain=True):
    poses = fn(n); frames = build_anim(name, n, poses, cw, ch, ox, gy, loops, chain)
    sheet = Image.new("RGBA", (cw * n, ch), (0, 0, 0, 0)); em = []
    for i, (im, m) in enumerate(frames): sheet.alpha_composite(im, (i * cw, 0)); em.append((m[0] * 2, m[1] * 2))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST); return sheet, em
ANIMS = [("idle", 6, lambda n: [anim_idle(i, n) for i in range(n)], 6, 1, 3), ("walk", 8, lambda n: [anim_walk(i, n) for i in range(n)], 10, 1, 3),
         ("notice", 4, lambda n: [interp(KN["notice"], i / (n - 1)) for i in range(n)], 8, 0, 3), ("windup", 4, lambda n: [interp(KN["windup"], i / (n - 1)) for i in range(n)], 8, 0, 3),
         ("attack", 6, lambda n: [interp(KN["attack"], i / (n - 1)) for i in range(n)], 14, 0, 2), ("recover", 4, lambda n: [interp(KN["recover"], i / (n - 1)) for i in range(n)], 8, 0, 3),
         ("hurt", 3, lambda n: [interp(KN["hurt"], i / (n - 1)) for i in range(n)], 10, 0, 3), ("stagger", 4, lambda n: [interp(KN["stagger"], i / (n - 1)) for i in range(n)], 8, 0, 3),
         ("resonance", 6, lambda n: [anim_res(i, n) for i in range(n)], 8, 0, 3), ("death", 8, lambda n: [anim_death(i, n) for i in range(n)], 8, 0, 3)]
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); man = {}; names = sys.argv[2:] or [a[0] for a in ANIMS]
    for (name, n, fn, fps, loop, lp) in ANIMS:
        if name not in names: continue
        wide = name in ("attack", "recover")                  # the chain swing needs a wider cell
        cw = 384 if wide else 256
        sheet, em = render_sheet(name, n, fn, cw=cw, loops=lp); sheet.save(f"{out}/br_{name}.png"); man[name] = dict(frames=n, fps=fps, loop=loop, cell=[cw * 2, 240 * 2], ember=[[round(a), round(b)] for a, b in em]); print(name, sheet.size)
    json.dump(man, open(f"{out}/manifest_partial.json", "w"))
