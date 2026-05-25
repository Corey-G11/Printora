#!/usr/bin/env python3
"""Generate PWA app icons (filament-spool motif) with a tiny pure-Python PNG writer."""
import struct, zlib, math

BG     = (15, 20, 32)      # #0F1420 deep navy
FLANGE = (255, 168, 84)    # lighter orange rim
FIL    = (255, 122, 26)    # #FF7A1A wound filament
HUB    = (28, 36, 54)      # hub hole
LIGHT  = (236, 241, 248)

def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

def make_icon(size, outer_frac=0.36, full_bleed_bg=True):
    cx = cy = (size - 1) / 2.0
    outerR  = size * outer_frac          # outer edge of flange
    filR    = outerR * 0.90              # wound filament radius
    hubR    = size * 0.135               # center hole
    hubRing = size * 0.175               # ring around hub
    holeR   = size * 0.052              # 3 spool holes
    holeOrb = size * 0.245              # orbit radius of spool holes
    ss = 3                               # supersample for anti-aliasing
    px = bytearray()
    for y in range(size):
        row = bytearray()
        for x in range(size):
            r = g = b = 0
            for sy in range(ss):
                for sx in range(ss):
                    fx = x + (sx + 0.5) / ss
                    fy = y + (sy + 0.5) / ss
                    d  = math.hypot(fx - cx, fy - cy)
                    col = BG
                    if d <= outerR:
                        col = FLANGE
                    if d <= filR:
                        # subtle radial shading on the wound filament
                        t = max(0.0, min(1.0, (filR - d) / filR))
                        col = lerp(FIL, FLANGE, t * 0.25)
                    if d <= hubRing:
                        col = FLANGE
                    if d <= hubR:
                        col = HUB
                    # three spool holes
                    for k in range(3):
                        ang = math.radians(90 + k * 120)
                        hx = cx + math.cos(ang) * holeOrb
                        hy = cy + math.sin(ang) * holeOrb
                        if math.hypot(fx - hx, fy - hy) <= holeR:
                            col = HUB
                    r += col[0]; g += col[1]; b += col[2]
            n = ss * ss
            row += bytes((r // n, g // n, b // n))
        px += b"\x00" + row
    raw = zlib.compress(bytes(px), 9)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", raw) + chunk(b"IEND", b"")

for name, size, frac in [
    ("icon-192.png", 192, 0.36),
    ("icon-512.png", 512, 0.36),
    ("icon-maskable-512.png", 512, 0.30),  # extra padding for safe zone
    ("apple-touch-icon.png", 180, 0.36),
]:
    data = make_icon(size, outer_frac=frac)
    with open(name, "wb") as f:
        f.write(data)
    print(f"wrote {name} ({len(data)} bytes)")
