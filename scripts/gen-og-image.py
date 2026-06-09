#!/usr/bin/env python3
"""
Generate Merit Sciences Open Graph image via gpt-image-1.

Output: public/og-image.png (1200×630, OG/Twitter card standard).
Design intent: cobalt blue scene-pattern background with the
"Merit." wordmark overlaid — the asset that shows up when the
URL is shared on iMessage, Slack, Twitter, LinkedIn, etc.
"""
import os
import re
import sys
import base64
import urllib.request
import urllib.error
import json

# ─── Resolve API key (regex-parse the dotfile, never hardcode) ──────────
ENV_PATH = "/Users/parkerlee/Desktop/Merit Peptides/.env"
KEY_RE = re.compile(r'^\s*OPENAI_API_KEY\s*=\s*"?([^"\n\r]+)"?\s*$', re.M)
with open(ENV_PATH, "r") as f:
    m = KEY_RE.search(f.read())
if not m:
    print("Could not parse OPENAI_API_KEY", file=sys.stderr)
    sys.exit(1)
api_key = m.group(1).strip()

# ─── Build the request ─────────────────────────────────────────────────
OUT_PATH = "/Users/parkerlee/Desktop/merit-render/public/og-image.png"

prompt = (
    "An Open Graph card for Merit Sciences, a premium research-peptide brand. "
    "Background: a deep saturated cobalt blue (#2E4DDB) atmospheric scene with "
    "a soft restrained pattern of pharmaceutical vial silhouettes — abstract, "
    "subtle, like a luxury fragrance ad campaign, not a stock pharmacy graphic. "
    "Slight cinematic gradient, like studio lighting from upper-left. "
    "Centered foreground: the wordmark MERIT. in heavy display sans-serif "
    "(similar to Inter Tight Black, -0.04 em letter-spacing), in pure white, "
    "with the period in a slightly lighter cobalt accent. Below, in much "
    "smaller white tracked uppercase: RESEARCH-GRADE PEPTIDES. "
    "Composition: 1200x630, generous breathing room, no other text, no UI, "
    "no logos, no taglines, no human figures, no products in foreground. "
    "Editorial, monumental, restrained. Final output should feel like an "
    "Apple-grade share card."
)

body = json.dumps({
    "model": "gpt-image-1",
    "prompt": prompt,
    "size": "1536x1024",   # closest to 1200x630 OG ratio; we'll crop client-side later if needed
    "quality": "high",
    "n": 1,
}).encode("utf-8")

req = urllib.request.Request(
    "https://api.openai.com/v1/images/generations",
    data=body,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    method="POST",
)

print("Generating OG image (gpt-image-1, may take 30-60s)...")
try:
    with urllib.request.urlopen(req, timeout=180) as resp:
        payload = json.loads(resp.read())
except urllib.error.HTTPError as e:
    print("HTTP error:", e.code, e.read().decode(), file=sys.stderr)
    sys.exit(1)

b64 = payload["data"][0]["b64_json"]
png = base64.b64decode(b64)

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "wb") as f:
    f.write(png)

print(f"Wrote {OUT_PATH} ({len(png) // 1024} KB)")
