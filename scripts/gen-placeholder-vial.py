#!/usr/bin/env python3
"""
gen-placeholder-vial.py — Generate a photorealistic Merit Sciences placeholder
vial via OpenAI gpt-image-1. Replaces the schematic SVG fallback used on
catalog/PDP/cart/email for products with no real photo yet.

USAGE
-----
  # Dry-run: print prompt + size, no API call
  python3 scripts/gen-placeholder-vial.py --dry-run

  # Generate (medium quality, ~$0.04)
  python3 scripts/gen-placeholder-vial.py

  # Higher fidelity (~$0.19)
  python3 scripts/gen-placeholder-vial.py --quality high

  # Generate variants and pick the best
  python3 scripts/gen-placeholder-vial.py --n 4

OUTPUT
------
  public/products/placeholder-vial.png         — primary placeholder
  public/products/placeholder-vial-{n}.png     — when --n > 1

  After review, rename the chosen variant to placeholder-vial.png and
  update PRODUCT_PLACEHOLDER_IMAGE in lib/product-types.ts to point to
  the .png (currently /products/placeholder-vial.svg).

ENV
---
  OPENAI_API_KEY (required) — pulled from ../Merit Peptides/.env if present
"""

import os
import sys
import base64
from pathlib import Path

# ── Load OPENAI_API_KEY from the original Merit Peptides .env ──────────────
HERE = Path(__file__).parent.parent
PEPTIDES_ENV = HERE.parent / "Merit Peptides" / ".env"
LOCAL_ENV = HERE / ".env.local"
for env_path in (PEPTIDES_ENV, LOCAL_ENV):
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from openai import OpenAI  # noqa: E402

PROMPT = (
    "Photorealistic studio product photograph of a single pharmaceutical "
    "peptide vial, centered. Cobalt blue aluminum crimp cap (deep saturated "
    "blue, slight metallic sheen). Clear glass body, lyophilized white "
    "powder visible at the bottom (about one third of the vial). A clean "
    "white minimalist label is wrapped around the lower half — the label "
    "reads 'MERIT SCIENCES' in modern sans-serif. No other text. Soft warm "
    "studio lighting, gentle shadow beneath the vial, shallow depth of "
    "field. The background is a smooth warm cream / off-white seamless "
    "studio sweep (#F4F1EA). No props, no card, no documents, no extra "
    "text, no humans, no hands. Square 1:1 framing. Editorial "
    "pharma-brand quality, like an Apple product photo. Absolutely "
    "photoreal — not an illustration, not 3D render."
)

OUTPUT_DIR = HERE / "public" / "products"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    quality = "high" if ("--quality" in args and
                         args.index("--quality") + 1 < len(args) and
                         args[args.index("--quality") + 1] == "high") else "medium"
    n = 1
    if "--n" in args:
        idx = args.index("--n")
        if idx + 1 < len(args):
            try:
                n = max(1, min(8, int(args[idx + 1])))
            except ValueError:
                pass

    print("Merit placeholder vial generator")
    print(f"  quality: {quality}")
    print(f"  n:       {n}")
    print(f"  output:  {OUTPUT_DIR}")
    print()
    print("Prompt:")
    for line in [PROMPT[i:i + 78] for i in range(0, len(PROMPT), 78)]:
        print(f"  {line}")
    print()

    if dry_run:
        print("[dry-run] no API call, no files written.")
        return

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set.")
        sys.exit(1)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    print(f"Calling gpt-image-1 (n={n}, quality={quality})...")

    result = client.images.generate(
        model="gpt-image-1",
        prompt=PROMPT,
        size="1024x1024",
        quality=quality,
        n=n,
    )

    for i, item in enumerate(result.data):
        b64 = item.b64_json
        if not b64:
            print(f"  ! variant {i + 1}: no image data returned")
            continue
        name = "placeholder-vial.png" if n == 1 else f"placeholder-vial-{i + 1}.png"
        dest = OUTPUT_DIR / name
        dest.write_bytes(base64.b64decode(b64))
        print(f"  saved {dest.relative_to(HERE)}")

    print()
    if n == 1:
        print("Done. Review at public/products/placeholder-vial.png.")
        print("To wire it in, update PRODUCT_PLACEHOLDER_IMAGE in")
        print("  lib/product-types.ts → '/products/placeholder-vial.png'")
    else:
        print("Done. Compare variants in public/products/.")
        print("Rename the winner to placeholder-vial.png, delete the rest,")
        print("then point PRODUCT_PLACEHOLDER_IMAGE at the .png.")


if __name__ == "__main__":
    main()
