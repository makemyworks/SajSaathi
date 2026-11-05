"""Generates every Saj Saathi brand file from one geometric definition.
Run: python3 build_brand.py <outdir>"""
import sys, os, math, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from mark import ribbon
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
C = dict(teal="#183F3A", tealDeep="#102B28", ivory="#F7F5EF", gold="#B98A45", goldLight="#D9B77C", charcoal="#202725", white="#FFFFFF")

# ---------- symbol geometry ----------
def poly_path(poly, tx=0, ty=0, s=1.0):
    return "M" + " L".join(f"{(x+tx)*s:.2f},{(y+ty)*s:.2f}" for x, y in poly) + "Z"
def geom(thick=17, thin=1.2):
    w = lambda t: thin + (thick - thin) * math.sin(math.pi * t) ** 0.85
    up = ribbon(60, 40, 22, math.radians(-28), math.radians(-270), w)
    lo = ribbon(60, 84, 22, math.radians(-90), math.radians(152), w)
    xs = [p[0] for p in up + lo]; ys = [p[1] for p in up + lo]
    return up, lo, min(xs), max(xs), min(ys), max(ys)
REGULAR = geom(); HEAVY = geom(23, 5.0)   # HEAVY = small-size optical variant (favicons <= 48px)
up, lo, bx0, bx1, by0, by1 = REGULAR
bw, bh = bx1 - bx0, by1 - by0
ASPECT = bw / bh

def symbol_paths(size, pad_ratio=0.0, g=None):
    """Return (upper_d, lower_d) scaled so the mark height = size*(1-2pad) centred in a size x size box."""
    up, lo, bx0, bx1, by0, by1 = g or REGULAR
    bw, bh = bx1 - bx0, by1 - by0
    s = size * (1 - 2 * pad_ratio) / bh
    ox = (size - bw * s) / 2 - bx0 * s
    oy = (size - bh * s) / 2 - by0 * s
    f = lambda poly: "M" + " L".join(f"{x*s+ox:.2f},{y*s+oy:.2f}" for x, y in poly) + "Z"
    return f(up), f(lo)

def svg(w_, h_, body, title="Saj Saathi"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w_} {h_}" width="{w_}" height="{h_}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')

def sym_body(size, top, bottom, pad=0.04, g=None):
    u, l = symbol_paths(size, pad, g)
    return f'<path fill="{top}" d="{u}"/><path fill="{bottom}" d="{l}"/>'

def tile_body(size, radius_ratio=0.22, bg=C["teal"], top=C["ivory"], bottom=C["goldLight"], pad=0.2, g=None):
    r = size * radius_ratio
    return f'<rect width="{size}" height="{size}" rx="{r:.2f}" fill="{bg}"/>' + sym_body(size, top, bottom, pad, g)

# ---------- wordmark (Lora, SIL OFL) outlined to paths ----------
LORA = "/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf"
font = instancer.instantiateVariableFont(TTFont(LORA), {"wght": 560})
gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font["hmtx"]; upm = font["head"].unitsPerEm
kern = {}
def text_path(text, size, x0=0, baseline=0, tracking=0.0):
    scale = size / upm; x = x0; d = []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        d.append(pen.getCommands())
        x += hmtx[g][0] * scale + tracking * size
    return " ".join(d), x - x0 - tracking * size
def text_bounds(text, size, tracking=0.0):
    scale = size / upm; x = 0; bp = BoundsPen(gs)
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(bp, (scale, 0, 0, -scale, x, 0)))
        x += hmtx[g][0] * scale + tracking * size
    return bp.bounds  # xmin, ymin, xmax, ymax (y down negative = above baseline)

WORD = "Saj Saathi"; TRACK = 0.005
def wordmark_body(color, size=100, x=0, baseline=100):
    d, adv = text_path(WORD, size, x, baseline, TRACK)
    return f'<path fill="{color}" d="{d}"/>', adv

# ---------- primary horizontal lockup ----------
def lockup(fg_text, top, bottom, bg=None):
    H = 200; symbol = 200; sw = symbol * (1 - 0.12) * ASPECT
    fs = 112
    b = text_bounds(WORD, fs, TRACK)
    cap_h = -b[1]; desc = b[3]
    baseline = H / 2 + (cap_h - desc) / 2 + 2
    gap = 46; margin = 24 if bg else 0
    wm, adv = wordmark_body(fg_text, fs, margin + sw + gap, baseline)
    W = math.ceil(margin * 2 + sw + gap + adv + 4)
    bgr = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    shift = margin - (symbol - sw) / 2
    return W, H, bgr + f'<g transform="translate({shift:.2f},0)">' + sym_body(symbol, top, bottom, 0.06) + "</g>" + wm

def stacked(fg_text, top, bottom, tagline=True):
    sym = 260; fs = 96
    b = text_bounds(WORD, fs, TRACK); tw = b[2] - b[0]
    W = math.ceil(max(sym, tw) + 40); y = sym + 30 - b[1]
    _, adv = text_path(WORD, fs, 0, 0, TRACK)
    wm, _ = wordmark_body(fg_text, fs, (W - adv) / 2, y)
    body = f'<g transform="translate({(W-sym)/2:.2f},0)">' + sym_body(sym, top, bottom, 0.04) + "</g>" + wm
    H = y + 30
    return W, math.ceil(H), body

files = {}
W, H, body = lockup(C["teal"], C["teal"], C["gold"]); files["logo.svg"] = svg(W, H, body)
W2, H2, body2 = lockup(C["teal"], C["teal"], C["gold"], C["ivory"]); files["logo-light-background.svg"] = svg(W2, H2, body2)
W3, H3, body3 = lockup(C["ivory"], C["ivory"], C["goldLight"], C["teal"]); files["logo-dark-background.svg"] = svg(W3, H3, body3)
W4, H4, body4 = lockup(C["charcoal"], C["charcoal"], C["charcoal"]); files["monochrome-logo.svg"] = svg(W4, H4, body4)
files["logo-on-dark-transparent.svg"] = svg(W3, H3, lockup(C["ivory"], C["ivory"], C["goldLight"])[2])
files["logo-symbol.svg"] = svg(200, 200, sym_body(200, C["teal"], C["gold"], 0.04))
files["logo-symbol-tile.svg"] = svg(512, 512, tile_body(512))
files["favicon.svg"] = svg(64, 64, tile_body(64, 0.22, pad=0.13, g=HEAVY))
fs = 112; b = text_bounds(WORD, fs, TRACK)
wm, adv = wordmark_body(C["teal"], fs, 4, -b[1] + 4)
files["logo-wordmark.svg"] = svg(math.ceil(adv + 8), math.ceil(b[3] - b[1] + 8), wm)
Ws, Hs, bs = stacked(C["teal"], C["teal"], C["gold"]); files["logo-stacked.svg"] = svg(Ws, Hs, bs)
files["maskable-icon.svg"] = svg(512, 512, f'<rect width="512" height="512" fill="{C["teal"]}"/>' + sym_body(512, C["ivory"], C["goldLight"], 0.27))

for name, content in files.items():
    open(os.path.join(OUT, name), "w").write(content)

def r(src, dst, w=None, h=None, bg=None):
    cmd = ["rsvg-convert", os.path.join(OUT, src), "-o", os.path.join(OUT, dst)]
    if w: cmd += ["-w", str(w)]
    if h: cmd += ["-h", str(h)]
    if bg: cmd += ["-b", bg]
    subprocess.run(cmd, check=True)
r("logo.svg", "logo-transparent.png", w=1600)
r("logo-light-background.svg", "logo.png", w=1600)
r("logo-symbol-tile.svg", "icon-512.png", 512, 512)
r("logo-symbol-tile.svg", "icon-192.png", 192, 192)
r("maskable-icon.svg", "maskable-icon-512.png", 512, 512)
r("maskable-icon.svg", "apple-touch-icon.png", 180, 180)   # iOS applies its own rounding
r("logo-symbol.svg", "logo-symbol.png", 1024, 1024)
for s in (16, 32, 48):
    r("favicon.svg", f"_fav{s}.png", s, s)
subprocess.run(["convert"] + [os.path.join(OUT, f"_fav{s}.png") for s in (16, 32, 48)] + [os.path.join(OUT, "favicon.ico")], check=True)
for s in (16, 32, 48): os.remove(os.path.join(OUT, f"_fav{s}.png"))
print("wrote", sorted(os.listdir(OUT)))
