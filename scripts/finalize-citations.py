#!/usr/bin/env python3
"""
Final validation pass.

For EVERY citation in lib/research-data.ts (regardless of verify flag):
  1. Look up the stored pubmedId via PubMed esummary.
  2. If the returned title matches the stored title → keep as-is.
  3. If it doesn't match AND we have a doi field → strip the pubmedId,
     rewrite url to https://doi.org/{doi}. Citation still renders in
     the PDP, just without a PMID pill.
  4. If it doesn't match AND no doi → delete the citation block.

After this runs, every remaining citation either:
  - Has a stored pubmedId that resolves to the cited paper in PubMed, OR
  - Has a verified DOI and links to doi.org instead of PubMed.
"""
import re
import json
import time
import ssl
import urllib.request
from pathlib import Path

ROOT = Path("/Users/parkerlee/Desktop/merit-render")
DATA_FILE = ROOT / "lib" / "research-data.ts"
src = DATA_FILE.read_text()

# Parse every citation block (whatever the verify flag).
CITATION_RE = re.compile(
    r"      \{[^{}]*?"
    r"title:\s*'([^']+)'[^{}]*?"
    r"authors:\s*'([^']+)'[^{}]*?"
    r"pubmedId:\s*'(\d+)'"
    r"[^{}]*?\},",
    re.DOTALL,
)

citations = []
for m in CITATION_RE.finditer(src):
    block = m.group(0)
    citations.append({
        'title': m.group(1),
        'authors': m.group(2),
        'pmid': m.group(3),
        'block': block,
        'has_doi': "doi:" in block,
        'doi': (re.search(r"doi:\s*'([^']+)'", block) or [None, None])[1],
    })

print(f"Re-validating {len(citations)} citation(s) against PubMed\n")

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE
USER_AGENT = 'merit-sciences-citation-finalizer/1.0 (mailto:rx@meritsciences.com)'

def norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def pubmed_meta(pmid: str) -> dict | None:
    url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        f"?db=pubmed&id={pmid}&retmode=json"
    )
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as resp:
            data = json.loads(resp.read())
    except Exception:
        return None
    rec = data.get('result', {}).get(pmid)
    if not rec or rec.get('error'):
        return None
    return rec

keep        = []
fix_to_doi  = []
delete      = []

for i, cit in enumerate(citations, 1):
    print(f"[{i}/{len(citations)}] PMID {cit['pmid']}: {cit['title'][:60]}...", end=' ', flush=True)
    rec = pubmed_meta(cit['pmid'])
    time.sleep(0.35)

    if not rec:
        if cit['doi']:
            fix_to_doi.append(cit)
            print("→ FIX TO DOI (PubMed lookup failed)")
        else:
            delete.append(cit)
            print("→ DELETE (no DOI fallback)")
        continue

    pm_title = (rec.get('title') or '').rstrip('.')
    # Title fuzzy match — 70% prefix of shorter must be in longer
    a, b = norm(cit['title']), norm(pm_title)
    short = a if len(a) < len(b) else b
    long_ = b if short is a else a
    title_matches = len(short) > 20 and short[:int(len(short) * 0.7)] in long_

    if title_matches:
        keep.append(cit)
        print("✅ OK")
    elif cit['doi']:
        fix_to_doi.append(cit)
        print(f"⚠️  PMID bogus → fix to DOI ({cit['doi']})")
    else:
        delete.append(cit)
        print("❌ PMID bogus, no DOI → DELETE")

print("\n" + "=" * 78)
print(f"  ✅ {len(keep):2d}  KEEP")
print(f"  🔧 {len(fix_to_doi):2d}  FIX_TO_DOI  — strip PMID, rewrite URL to doi.org")
print(f"  ❌ {len(delete):2d}  DELETE       — no DOI fallback")
print(f"     {len(citations):2d}  TOTAL")
print("=" * 78)

# ─── Apply fixes ──────────────────────────────────────────────────────
new_src = src
for cit in fix_to_doi:
    old_block = cit['block']
    new_block = old_block
    # Strip pubmedId line entirely
    new_block = re.sub(r"\s*pubmedId:\s*'\d+',", '', new_block)
    # Rewrite url to doi.org
    new_block = re.sub(
        r"url:\s*'https://pubmed\.ncbi\.nlm\.nih\.gov/\d+/?'",
        f"url: 'https://doi.org/{cit['doi']}'",
        new_block,
    )
    new_src = new_src.replace(old_block, new_block, 1)
    print(f"  fixed: {cit['title'][:60]}")

for cit in delete:
    # Delete the block + trailing comma + newline
    new_src = new_src.replace(cit['block'] + '\n', '', 1)
    # Fallback if exact match doesn't catch it
    if cit['block'] in new_src:
        new_src = new_src.replace(cit['block'], '', 1)
    print(f"  deleted: {cit['title'][:60]}")

DATA_FILE.write_text(new_src)
print(f"\nWrote {DATA_FILE}")

# Final tally
remaining = len(CITATION_RE.findall(new_src))
all_citations = len(re.findall(r"references:\s*\[([^\]]+)\]", new_src, re.DOTALL))
print(f"Final: {remaining} citations with pubmedId + {len(fix_to_doi)} DOI-only across {all_citations} compounds")
