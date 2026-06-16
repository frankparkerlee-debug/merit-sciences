#!/usr/bin/env python3
"""
gen-transparent-vial.py — Generate a transparent-background canonical
Merit vial directly via gpt-image-1's background=transparent param.

Beats the alpha-cutout approach (make-transparent-vial.py) which
couldn't tell the white label from the cream studio backdrop and
ended up making the label transparent + keeping the shadow.

Output: public/brand/merit-vial-canonical-transparent.webp
Cost: $0.19 (one high-quality generation)
"""
import os, sys, base64, subprocess
from pathlib import Path

HERE = Path(__file__).parent.parent
REPO_ROOT = HERE
PEPTIDES_ENV = REPO_ROOT.parent / "Merit Peptides" / ".env"
LOCAL_ENV = REPO_ROOT / ".env.local"
DEST = REPO_ROOT / "public" / "brand" / "merit-vial-canonical-transparent.webp"

for env_path in (PEPTIDES_ENV, LOCAL_ENV):
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

PROMPT = (
    "Photorealistic studio product photograph of a single pharmaceutical "
    "peptide vial on a fully transparent background — no studio sweep, "
    "no shadow on a surface, just the vial floating in empty transparent "
    "space. Cobalt blue aluminum crimp cap (#2E4DDB) with slight metallic "
    "sheen and silver collar. Clear glass body. Lyophilized white powder "
    "fills the bottom one third of the vial. "
    "Wrapped around the lower half of the vial is a clean WHITE landscape "
    "rectangular label with THREE elements: (1) upper-left of the label: "
    "a small cobalt blue pill-shaped badge reading 'RESEARCH USE ONLY' in "
    "tiny white all-caps sans-serif. (2) RIGHT side of the label: a large "
    "pale beige-grey letter 'M' followed by a period, rendered in modern "
    "GEOMETRIC SANS-SERIF (Inter Black or Helvetica Black), clean uniform "
    "strokes, no serifs. Soft beige-grey #D8D5CD, occupying the right 30% "
    "of the label. To the right of the M's period, vertically centered, a "
    "small solid cobalt blue dot. (3) Left-center of the label: completely "
    "EMPTY white space (no text). "
    "Soft warm studio lighting on the vial itself, but absolutely NO "
    "background, NO shadow on a surface, NO floor, NO sweep — pure "
    "transparent alpha behind and around the vial. Photoreal — not an "
    "illustration."
)


def main():
    quality = "high" if "--quality=high" in sys.argv or "--high" in sys.argv else "medium"
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set"); sys.exit(1)

    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    print(f"Generating transparent canonical vial (quality={quality})...")

    result = client.images.generate(
        model="gpt-image-1",
        prompt=PROMPT,
        size="1024x1024",
        quality=quality,
        background="transparent",
        n=1,
    )
    b64 = result.data[0].b64_json
    if not b64:
        print("ERROR: no image data"); sys.exit(1)

    # Write PNG then convert to WebP preserving alpha
    tmp = DEST.with_suffix(".png")
    tmp.write_bytes(base64.b64decode(b64))
    DEST.parent.mkdir(parents=True, exist_ok=True)

    r = subprocess.run(
        ["cwebp", "-q", "92", "-alpha_q", "100", "-quiet", str(tmp), "-o", str(DEST)],
        capture_output=True,
    )
    if r.returncode == 0:
        tmp.unlink()
        print(f"✓ {DEST.relative_to(REPO_ROOT)}  ({DEST.stat().st_size // 1024} KB)")
    else:
        print(f"⚠ cwebp failed, keeping PNG at {tmp.relative_to(REPO_ROOT)}")
        print(r.stderr.decode())


if __name__ == "__main__":
    main()
