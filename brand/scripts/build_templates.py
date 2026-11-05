"""Editable marketing templates (SVG) + PNG previews. Placeholders in [brackets] are replaced with genuine details."""
import os, re, subprocess
A = "/home/claude/brand/assets"; OUT = "/home/claude/brand/templates"
os.makedirs(OUT, exist_ok=True)
def inner(name):
    s = open(f"{A}/{name}").read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = re.sub(r"^.*?<title>.*?</title>", "", s, flags=re.S).rsplit("</svg>", 1)[0]
    return vb, body
LOGO_DARK = inner("logo-on-dark-transparent.svg"); LOGO_LIGHT = inner("logo.svg"); SYMBOL = inner("logo-symbol.svg")
def logo(kind, x, y, w):
    vb, body = {"dark": LOGO_DARK, "light": LOGO_LIGHT, "symbol": SYMBOL}[kind]
    vw, vh = [float(v) for v in vb.split()[2:]]
    return f'<svg x="{x}" y="{y}" width="{w}" height="{w*vh/vw:.1f}" viewBox="{vb}">{body}</svg>'
SERIF = "Lora, Georgia, 'Noto Serif Devanagari', serif"; SANS = "Mukta, Inter, Arial, 'Noto Sans Devanagari', sans-serif"
T, TD, IV, GL, G = "#183F3A", "#102B28", "#F7F5EF", "#D9B77C", "#B98A45"
def qr_box(x, y, s):
    return (f'<g id="qr-code"><rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{s*0.06:.0f}" fill="#fff"/>'
            f'<rect x="{x+s*0.08:.0f}" y="{y+s*0.08:.0f}" width="{s*0.84:.0f}" height="{s*0.84:.0f}" fill="none" stroke="{T}" stroke-dasharray="8 8" stroke-width="3"/>'
            f'<text x="{x+s/2:.0f}" y="{y+s/2:.0f}" font-family="{SANS}" font-size="{s*0.06:.0f}" text-anchor="middle" fill="{T}">[Place QR code here]</text></g>')
def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{title}</title>{body}</svg>\n'
def promo(w, h, title):
    u = w / 1080
    b = [f'<rect width="{w}" height="{h}" fill="{T}"/>', logo("dark", 80*u, 80*u, 380*u),
         f'<text x="{80*u}" y="{h*0.42:.0f}" font-family="{SERIF}" font-size="{76*u:.0f}" font-weight="600" fill="{IV}">[Headline line one]</text>',
         f'<text x="{80*u}" y="{h*0.42+90*u:.0f}" font-family="{SERIF}" font-size="{76*u:.0f}" font-weight="600" fill="{IV}">[Headline line two]</text>',
         f'<text x="{80*u}" y="{h*0.42+170*u:.0f}" font-family="{SANS}" font-size="{40*u:.0f}" fill="{GL}">[Supporting line — genuine offer or service only]</text>',
         f'<rect x="{80*u}" y="{h-260*u:.0f}" width="{420*u:.0f}" height="{100*u:.0f}" rx="{14*u:.0f}" fill="{GL}"/>',
         f'<text x="{290*u:.0f}" y="{h-195*u:.0f}" font-family="{SANS}" font-size="{40*u:.0f}" font-weight="700" text-anchor="middle" fill="{TD}">[Book now]</text>',
         f'<text x="{w-80*u:.0f}" y="{h-190*u:.0f}" font-family="{SANS}" font-size="{30*u:.0f}" text-anchor="end" fill="{GL}">sajsaathi.in</text>']
    return svg(w, h, "".join(b), title)
def poster(w, h, title, partner=False):
    u = w / 2480
    b = [f'<rect width="{w}" height="{h}" fill="{T}"/>', f'<rect x="{90*u}" y="{90*u}" width="{w-180*u}" height="{h-180*u}" rx="{60*u}" fill="none" stroke="{GL}" stroke-width="{6*u}"/>',
         logo("dark", (w-1300*u)/2, 220*u, 1300*u),
         f'<text x="{w/2}" y="{900*u}" font-family="{SERIF}" font-size="{150*u:.0f}" font-weight="600" text-anchor="middle" fill="{IV}">{"[Partner business name]" if partner else "[Headline]"}</text>',
         f'<text x="{w/2}" y="{1040*u}" font-family="{SANS}" font-size="{80*u:.0f}" text-anchor="middle" fill="{GL}">{"[Locality, City]" if partner else "[Supporting line]"}</text>']
    if partner:
        for i in range(5):
            y = 1300*u + i*130*u
            b += [f'<text x="{300*u}" y="{y}" font-family="{SANS}" font-size="{72*u:.0f}" fill="{IV}">[Service {i+1}]</text>', f'<text x="{w-300*u}" y="{y}" font-family="{SANS}" font-size="{72*u:.0f}" font-weight="700" text-anchor="end" fill="{IV}">[₹ price]</text>']
    b += [qr_box((w-900*u)/2, h-1450*u, 900*u), f'<text x="{w/2}" y="{h-430*u}" font-family="{SERIF}" font-size="{110*u:.0f}" text-anchor="middle" fill="{IV}">Scan to book · बुक करने के लिए स्कैन करें</text>',
          f'<text x="{w/2}" y="{h-250*u}" font-family="{SANS}" font-size="{64*u:.0f}" text-anchor="middle" fill="{GL}">sajsaathi.in</text>']
    return svg(w, h, "".join(b), title)
def menu(w, h):
    u = w / 1240
    b = [f'<rect width="{w}" height="{h}" fill="{IV}"/>', f'<rect width="{w}" height="{300*u}" fill="{T}"/>', logo("dark", 70*u, 70*u, 520*u),
         f'<text x="{70*u}" y="{420*u}" font-family="{SERIF}" font-size="{64*u:.0f}" font-weight="600" fill="{TD}">[Partner business name] — Price list</text>']
    for i in range(10):
        y = 540*u + i*82*u
        b += [f'<text x="{70*u}" y="{y}" font-family="{SANS}" font-size="{36*u:.0f}" fill="#202725">[Service]</text>', f'<text x="{w-70*u}" y="{y}" font-family="{SANS}" font-size="{36*u:.0f}" font-weight="700" text-anchor="end" fill="#202725">[₹]</text>',
              f'<line x1="{70*u}" x2="{w-70*u}" y1="{y+22*u}" y2="{y+22*u}" stroke="#DCD8CC" stroke-width="2"/>']
    b += [qr_box(w-400*u, h-420*u, 330*u), f'<text x="{70*u}" y="{h-120*u}" font-family="{SANS}" font-size="{32*u:.0f}" fill="{T}">Book online: sajsaathi.in</text>']
    return svg(w, h, "".join(b), "Service price menu")
def banner(w, h, title, light=False):
    bg, fg = (IV, TD) if light else (T, IV)
    lk = "light" if light else "dark"
    if w / h < 2.2:  # near-square / OG: centred stack
        lw = w * 0.55
        b = [f'<rect width="{w}" height="{h}" fill="{bg}"/>', logo(lk, (w - lw) / 2, h * 0.28, lw),
             f'<text x="{w/2}" y="{h*0.78:.0f}" font-family="{SERIF}" font-size="{h*0.075:.0f}" text-anchor="middle" fill="{GL if not light else G}">Your everyday care companion</text>']
    else:
        lh = h * 0.34; lw = lh * 3.55
        b = [f'<rect width="{w}" height="{h}" fill="{bg}"/>', logo(lk, h * 0.25, (h - lh) / 2, lw),
             f'<text x="{w-h*0.25:.0f}" y="{h*0.55:.0f}" font-family="{SERIF}" font-size="{h*0.075:.0f}" text-anchor="end" fill="{GL if not light else G}">Your everyday care companion</text>']
    return svg(w, h, "".join(b), title)
def card(front=True):
    w, h = 1050, 600  # 3.5 x 2 in @ 300 dpi
    if front: b = [f'<rect width="{w}" height="{h}" fill="{T}"/>', logo("dark", 175, 200, 700)]
    else: b = [f'<rect width="{w}" height="{h}" fill="{IV}"/>', logo("symbol", 70, 70, 120),
               f'<text x="70" y="330" font-family="{SERIF}" font-size="52" font-weight="600" fill="{TD}">[Full name]</text>', f'<text x="70" y="385" font-family="{SANS}" font-size="32" fill="{G}">[Role]</text>',
               f'<text x="70" y="470" font-family="{SANS}" font-size="30" fill="#202725">[+91 phone] · [email@sajsaathi.in]</text>', f'<text x="70" y="520" font-family="{SANS}" font-size="30" fill="#202725">sajsaathi.in</text>']
    return svg(w, h, "".join(b), "Business card " + ("front" if front else "back"))
T_ = {
  "social-square-1080x1080.svg": promo(1080, 1080, "Square post"),
  "social-portrait-1080x1350.svg": promo(1080, 1350, "Portrait post"),
  "story-reel-1080x1920.svg": promo(1080, 1920, "Story / reel"),
  "whatsapp-1080x1080.svg": promo(1080, 1080, "WhatsApp image"),
  "poster-a4-2480x3508.svg": poster(2480, 3508, "A4 poster (300 dpi)"),
  "poster-a3-3508x4961.svg": poster(3508, 4961, "A3 poster (300 dpi)"),
  "qr-poster-a4.svg": poster(2480, 3508, "QR code poster", partner=False),
  "partner-poster-a4.svg": poster(2480, 3508, "Partner promotional poster", partner=True),
  "price-menu-a5.svg": menu(1240, 1754),
  "shop-banner-3x1.svg": banner(3600, 1200, "Shop banner (3:1)"),
  "website-banner-1920x600.svg": banner(1920, 600, "Website banner", light=True),
  "email-banner-1200x300.svg": banner(1200, 300, "Email banner"),
  "business-card-front.svg": card(True), "business-card-back.svg": card(False),
  "og-image-1200x630.svg": banner(1200, 630, "Social share image"),
}
for n, s in T_.items():
    open(f"{OUT}/{n}", "w").write(s)
os.makedirs(f"{OUT}/previews", exist_ok=True)
for n in T_:
    subprocess.run(["rsvg-convert", f"{OUT}/{n}", "-w", "600", "-o", f"{OUT}/previews/{n[:-4]}.png"], check=True)
subprocess.run(["rsvg-convert", f"{OUT}/og-image-1200x630.svg", "-w", "1200", "-o", f"{A}/og-image.png"], check=True)
print(len(T_), "templates")
