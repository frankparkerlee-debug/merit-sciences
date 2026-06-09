#!/usr/bin/env python3
"""
Composite the OG image from the real brand asset:
  - Background: public/brand/scene-pattern-cobalt.webp (the same cobalt
    vial pattern used as the "Top-shelf molecules" homepage background)
  - Overlay: MERIT. wordmark + RESEARCH-GRADE PEPTIDES subtitle
  - Output: public/og-image.jpg, 1200×630 OG/Twitter card standard

Uses Pillow only — no network calls, deterministic, fast.
"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_PATH  = os.path.join(ROOT, "public", "brand", "scene-pattern-cobalt.webp")
OUT_PATH = os.path.join(ROOT, "public", "og-image.jpg")
OG_W, OG_H = 1200, 630

# ─── Load + cover-fit the brand pattern to 1200×630 ────────────────────
bg = Image.open(BG_PATH).convert("RGB")
bw, bh = bg.size
src_ratio  = bw / bh
target_ratio = OG_W / OG_H

if src_ratio > target_ratio:
    # source wider than target → scale by height, center-crop horizontally
    new_h = OG_H
    new_w = int(bw * (OG_H / bh))
    bg = bg.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - OG_W) // 2
    bg = bg.crop((left, 0, left + OG_W, OG_H))
else:
    # source taller than target → scale by width, center-crop vertically
    new_w = OG_W
    new_h = int(bh * (OG_W / bw))
    bg = bg.resize((new_w, new_h), Image.LANCZOS)
    top = (new_h - OG_H) // 2
    bg = bg.crop((0, top, OG_W, top + OG_H))

# ─── Apply a darkening + cobalt-wash overlay so white text reads ───────
# Slight diagonal gradient (upper-left brighter, lower-right deeper)
# matches the homepage section overlay treatment.
overlay = Image.new("RGB", (OG_W, OG_H), (11, 15, 25))      # ink/charcoal
darken = Image.blend(bg, overlay, 0.32)                      # 32% darken — let pattern read
# Subtle cobalt push for brand consistency
cobalt = Image.new("RGB", (OG_W, OG_H), (46, 77, 219))       # #2E4DDB
canvas = Image.blend(darken, cobalt, 0.16)

draw = ImageDraw.Draw(canvas)

# ─── Fonts ─────────────────────────────────────────────────────────────
# HelveticaNeue Black for the wordmark, Helvetica Bold for the subtitle.
# HelveticaNeue.ttc is a font collection — index 8 is typically the Black weight.
def load_font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.truetype(path, size)

# HelveticaNeue collection: index 9 is "Condensed Black" — the heaviest
# weight available in macOS system fonts. Renders as a strong editorial
# wordmark with magazine-style presence.
try:
    wordmark_font = load_font("/System/Library/Fonts/HelveticaNeue.ttc", 260, index=9)
except Exception:
    try:
        wordmark_font = load_font("/System/Library/Fonts/Helvetica.ttc", 220, index=1)  # Helvetica Bold fallback
    except Exception:
        wordmark_font = ImageFont.load_default()

try:
    subtitle_font = load_font("/System/Library/Fonts/HelveticaNeue.ttc", 28, index=1)  # Bold
except Exception:
    subtitle_font = load_font("/System/Library/Fonts/Helvetica.ttc", 28, index=1)

# ─── Draw "MERIT." centered using PIL's anchor="mm" (middle-middle) ────
# anchor="mm" anchors the text at the given (x,y) point at its
# horizontal+vertical visual center. Far more reliable than bbox math
# for condensed-Black faces with non-standard metrics.
wordmark = "MERIT."

wordmark_cx = OG_W // 2
wordmark_cy = int(OG_H * 0.44)   # slightly above visual center

# Soft drop-shadow for depth over the busy vial pattern
shadow_offset = 5
draw.text((wordmark_cx + shadow_offset, wordmark_cy + shadow_offset),
          wordmark, font=wordmark_font, fill=(11, 15, 25),
          anchor="mm")
draw.text((wordmark_cx, wordmark_cy),
          wordmark, font=wordmark_font, fill=(255, 255, 255),
          anchor="mm")

# ─── Draw "RESEARCH-GRADE PEPTIDES" tracked-uppercase below ────────────
# Loose letter-spacing emulated by interleaving each character with spaces.
# Sits at 78% of canvas height — well clear of the wordmark's descenders.
subtitle = "R E S E A R C H - G R A D E   P E P T I D E S"
sub_cx = OG_W // 2
sub_cy = int(OG_H * 0.78)

draw.text((sub_cx, sub_cy),
          subtitle, font=subtitle_font, fill=(255, 255, 255),
          anchor="mm")

# ─── Save as JPEG q88 ──────────────────────────────────────────────────
canvas.save(OUT_PATH, "JPEG", quality=88, optimize=True, progressive=True)
print(f"Wrote {OUT_PATH} — {os.path.getsize(OUT_PATH) // 1024} KB")
