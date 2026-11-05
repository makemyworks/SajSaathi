import math, sys
OUT=0.62
def arc_pts(cx, cy, r, a0, a1, n=140):
    return [(cx + r*math.cos(a0+(a1-a0)*i/(n-1)), cy + r*math.sin(a0+(a1-a0)*i/(n-1)), a0+(a1-a0)*i/(n-1)) for i in range(n)]
def ribbon(cx, cy, r, a0, a1, wfun, n=140):
    pts = arc_pts(cx, cy, r, a0, a1, n)
    L, R = [], []
    for i,(x,y,a) in enumerate(pts):
        t = i/(n-1); w = wfun(t)/2
        nx, ny = math.cos(a), math.sin(a)   # radial normal
        L.append((x+nx*w*2*OUT, y+ny*w*2*OUT)); R.append((x-nx*w*2*(1-OUT), y-ny*w*2*(1-OUT)))
    return L + R[::-1]
def to_path(poly):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x,y in poly) + "Z"
def to_path_old(poly):
    # Catmull-Rom -> cubic bezier, closed
    n = len(poly); d = f"M{poly[0][0]:.2f},{poly[0][1]:.2f}"
    for i in range(n):
        p0, p1, p2, p3 = poly[(i-1)%n], poly[i], poly[(i+1)%n], poly[(i+2)%n]
        c1 = (p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6)
        c2 = (p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6)
        d += f"C{c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}"
    return d + "Z"
def mark(thick=17, thin=2.2, r=22, gap=0.0):
    w = lambda t: thin + (thick-thin)*math.sin(math.pi*t)**0.85
    d2r = math.radians
    # upper: from -25deg going CCW (decreasing angle) to 90deg-360 => bottom point of upper circle
    up = ribbon(60, 40, r, d2r(-28), d2r(-270+gap), w)
    lo = ribbon(60, 84, r, d2r(-90-gap), d2r(152), w)
    return to_path(up), to_path(lo)
if __name__ == "__main__":
    u, l = mark()
    print(u); print(l)
