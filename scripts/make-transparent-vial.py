#!/usr/bin/env python3
"""
make-transparent-vial.py — Convert the canonical base vial PNG to a
transparent-background WebP for use as a floating hero element.

The base from gen-sku-vials-edit.py --base sits on a solid cream studio
sweep (~#F4F1EA). We threshold out cream pixels (color distance + edge
feathering) to produce a vial cutout that floats over any background.

Output: public/brand/merit-vial-canonical-transparent.webp
"""
from pathlib import Path
from PIL import Image, ImageFilter

HERE = Path(__file__).parent.parent
SRC = HERE / "public" / "products" / "_base-vial.png"
DEST = HERE / "public" / "brand" / "merit-vial-canonical-transparent.webp"

# Actual cream BG of the rendered canonical base, averaged from corners.
# AI rendered a slightly warmer/darker cream than the brand spec #F4F1EA.
BG = (238, 225, 210)
# Pixels within HARD_DIST of BG → fully transparent.
# Pixels beyond SOFT_DIST → fully opaque.
# In-between band gets proportional alpha so edges feather naturally.
HARD_DIST = 16
SOFT_DIST = 38


def color_distance(p, ref):
    return max(abs(p[0] - ref[0]), abs(p[1] - ref[1]), abs(p[2] - ref[2]))


def main():
    img = Image.open(SRC).convert("RGB")
    w, h = img.size
    rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    src = img.load()
    dst = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            d = color_distance((r, g, b), BG)
            if d <= HARD_DIST:
                a = 0
            elif d >= SOFT_DIST:
                a = 255
            else:
                a = int(((d - HARD_DIST) / (SOFT_DIST - HARD_DIST)) * 255)
            dst[x, y] = (r, g, b, a)

    # Optional: feather the alpha edge slightly to kill jaggies
    alpha = rgba.split()[-1]
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.6))
    rgba.putalpha(alpha)

    DEST.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(DEST, "WebP", quality=92, method=6)
    print(f"✓ {DEST.relative_to(HERE)}  ({DEST.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
