#!/usr/bin/env python3
"""
Verify every `verify: true` citation in lib/research-data.ts against
the NCBI PubMed E-utilities API.

Workflow:
  1. Parse the data file for every citation block carrying verify: true.
  2. Hit https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi
     for each PMID. NCBI permits 3 req/s without an API key.
  3. Compare the local citation (title, first-author last name, year,
     journal) against PubMed's record.
  4. Score 4/4 = MATCH — auto-flip verify: true → false for that block.
  5. Score 2-3 = PARTIAL — report for human review.
  6. Score 0-1 = MISMATCH — report; almost certainly wrong PMID.

Output goes to stdout. The data file is rewritten in place with the
auto-flipped matches; mismatches are left as verify: true so they
keep appearing in subsequent runs.
"""
import re
import json
import time
import ssl
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path("/Users/parkerlee/Desktop/merit-render")
DATA_FILE = ROOT / "lib" / "research-data.ts"

src = DATA_FILE.read_text()

# ─── Parse citation blocks ────────────────────────────────────────────
# Each citation is a JS object literal. We look for blocks containing
# pubmedId AND verify: true. Use [^{}] (no nested braces inside one
# citation) to keep the regex non-greedy and not bleed across blocks.
CITATION_RE = re.compile(
    r"\{[^{}]*?"
    r"title:\s*'([^']+)'[^{}]*?"
    r"authors:\s*'([^']+)'[^{}]*?"
    r"journal:\s*'([^']+)'[^{}]*?"
    r"year:\s*(\d+)"
    r"[^{}]*?"
    r"pubmedId:\s*'(\d+)'"
    r"[^{}]*?"
    r"verify:\s*true[^{}]*?\}",
    re.DOTALL,
)

citations = []
for m in CITATION_RE.finditer(src):
    citations.append({
        'title':   m.group(1),
        'authors': m.group(2),
        'journal': m.group(3),
        'year':    int(m.group(4)),
        'pmid':    m.group(5),
    })

print(f"Parsed {len(citations)} citations with verify:true\n")

if not citations:
    print("Nothing to verify.")
    raise SystemExit(0)

# ─── NCBI lookup ──────────────────────────────────────────────────────
# Python 3.14 ships without macOS system cert chain hooked up. Build an
# unverified SSL context for NCBI specifically — the public esummary
# endpoint doesn't carry sensitive data.
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

def fetch_pubmed(pmid: str) -> dict | None:
    url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        f"?db=pubmed&id={pmid}&retmode=json"
    )
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'merit-sciences-citation-verifier/1.0 (research, mailto:rx@meritsciences.com)'},
    )
    with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as resp:
        data = json.loads(resp.read())
    rec = data.get('result', {}).get(pmid)
    if not rec or rec.get('error'):
        return None
    return rec

def norm(s: str) -> str:
    """Normalize for fuzzy compare — strip punctuation + lowercase."""
    return re.sub(r'[^a-z0-9]', '', s.lower())

# ─── Run the verification ─────────────────────────────────────────────
results = []
for i, cit in enumerate(citations, 1):
    print(f"[{i}/{len(citations)}] PMID {cit['pmid']}: {cit['title'][:64]}...", end=' ', flush=True)
    try:
        rec = fetch_pubmed(cit['pmid'])
        time.sleep(0.35)
    except urllib.error.HTTPError as e:
        results.append({'cit': cit, 'status': 'ERROR', 'error': f"HTTP {e.code}", 'meta': None})
        print(f"HTTP {e.code}")
        continue
    except Exception as e:
        results.append({'cit': cit, 'status': 'ERROR', 'error': str(e)[:80], 'meta': None})
        print(f"ERROR: {str(e)[:60]}")
        continue

    if not rec:
        results.append({'cit': cit, 'status': 'NOT_FOUND', 'meta': None})
        print("NOT FOUND")
        continue

    pm_title  = (rec.get('title') or '').rstrip('.')
    pm_year   = (rec.get('pubdate') or '').split(' ')[0][:4]
    pm_journal_full = rec.get('fulljournalname') or ''
    pm_journal_abbr = rec.get('source') or ''
    authors_list = rec.get('authors', [])
    pm_first_author_full = (authors_list[0].get('name') if authors_list else '') or ''
    pm_first_author_last = pm_first_author_full.split(' ')[0] if pm_first_author_full else ''

    our_first_author_last = cit['authors'].split(',')[0].split(' ')[0]

    title_norm_pm  = norm(pm_title)
    title_norm_ours = norm(cit['title'])
    # Match if 80%+ of the shorter title is contained in the longer one
    short = title_norm_ours if len(title_norm_ours) < len(title_norm_pm) else title_norm_pm
    long  = title_norm_pm if short is title_norm_ours else title_norm_ours
    title_match = len(short) > 20 and short[:int(len(short)*0.8)] in long

    author_match = norm(our_first_author_last) == norm(pm_first_author_last)
    year_match = str(cit['year']) == pm_year
    journal_match = (
        norm(cit['journal']) in norm(pm_journal_full)
        or norm(cit['journal']) in norm(pm_journal_abbr)
        or norm(pm_journal_full) in norm(cit['journal'])
        or norm(pm_journal_abbr) in norm(cit['journal'])
    )

    score = sum([title_match, author_match, year_match, journal_match])
    status = 'MATCH' if score == 4 else ('PARTIAL' if score >= 2 else 'MISMATCH')

    results.append({
        'cit': cit,
        'status': status,
        'score': score,
        'meta': {
            'title': pm_title,
            'first_author': pm_first_author_full,
            'year': pm_year,
            'journal_full': pm_journal_full,
            'journal_abbr': pm_journal_abbr,
        },
        'checks': {
            'title': title_match,
            'author': author_match,
            'year': year_match,
            'journal': journal_match,
        },
    })
    print(f"[{status} {score}/4]")

# ─── Report ───────────────────────────────────────────────────────────
print("\n" + "=" * 78)
print("VERIFICATION REPORT")
print("=" * 78)

matches    = [r for r in results if r['status'] == 'MATCH']
partials   = [r for r in results if r['status'] == 'PARTIAL']
mismatches = [r for r in results if r['status'] == 'MISMATCH']
not_found  = [r for r in results if r['status'] == 'NOT_FOUND']
errors     = [r for r in results if r['status'] == 'ERROR']

print(f"\n  ✅ {len(matches):2d}  MATCH      — auto-flipped to verify:false")
print(f"  ⚠️  {len(partials):2d}  PARTIAL    — needs human review (see below)")
print(f"  ❌ {len(mismatches):2d}  MISMATCH   — wrong PMID or wrong cite (see below)")
print(f"  🚫 {len(not_found):2d}  NOT_FOUND  — PMID returned no record")
print(f"  💥 {len(errors):2d}  ERROR      — network / API failure")
print(f"     {len(citations):2d}  TOTAL")

if partials:
    print("\n" + "─" * 78)
    print("⚠️  PARTIAL MATCHES — review and fix in lib/research-data.ts")
    print("─" * 78)
    for r in partials:
        c, m, chk = r['cit'], r['meta'], r['checks']
        print(f"\n  PMID {c['pmid']}  (score {r['score']}/4 — T:{chk['title']} A:{chk['author']} Y:{chk['year']} J:{chk['journal']})")
        if not chk['title']:
            print(f"    Title ours:   {c['title']}")
            print(f"    Title PubMed: {m['title']}")
        if not chk['author']:
            print(f"    Authors ours:   {c['authors'][:70]}")
            print(f"    First-author PubMed: {m['first_author']}")
        if not chk['year']:
            print(f"    Year ours/PubMed: {c['year']} / {m['year']}")
        if not chk['journal']:
            print(f"    Journal ours:   {c['journal']}")
            print(f"    Journal PubMed: {m['journal_full']} ({m['journal_abbr']})")

if mismatches:
    print("\n" + "─" * 78)
    print("❌ MISMATCHES — almost certainly wrong PMID. Fix or delete.")
    print("─" * 78)
    for r in mismatches:
        c, m = r['cit'], r['meta']
        print(f"\n  PMID {c['pmid']}  (score {r['score']}/4)")
        print(f"    Our citation: {c['title']}")
        print(f"      by {c['authors'][:60]}")
        print(f"      in {c['journal']} ({c['year']})")
        print(f"    What PubMed returns for this PMID:")
        print(f"      {m['title']}")
        print(f"      by {m['first_author']}")
        print(f"      in {m['journal_full']} ({m['year']})")

if not_found:
    print("\n" + "─" * 78)
    print("🚫 NOT FOUND — PMID does not exist in PubMed.")
    print("─" * 78)
    for r in not_found:
        c = r['cit']
        print(f"  PMID {c['pmid']}: {c['title']}")

if errors:
    print("\n" + "─" * 78)
    print("💥 NETWORK ERRORS — re-run to retry these.")
    print("─" * 78)
    for r in errors:
        c = r['cit']
        print(f"  PMID {c['pmid']}: {r['error']}")

# ─── Auto-flip matches ────────────────────────────────────────────────
if matches:
    print(f"\nAuto-flipping {len(matches)} matched citations: verify:true → verify:false")
    new_src = src
    for r in matches:
        pmid = r['cit']['pmid']
        # Match the verify:true that immediately follows the pubmedId line
        # (within the same citation block — bounded by closing brace).
        pat = re.compile(
            rf"(pubmedId:\s*'{pmid}'[^}}]*?)verify:\s*true",
            re.DOTALL,
        )
        new_src, n = pat.subn(r'\1verify: false', new_src)
        if n != 1:
            print(f"  WARN: pattern matched {n} times for PMID {pmid}")
    DATA_FILE.write_text(new_src)
    print(f"Wrote {DATA_FILE}")

# ─── Exit code ────────────────────────────────────────────────────────
# Non-zero if any verify-flagged citations remain unresolved so this
# can be wired into CI later.
remaining = len(partials) + len(mismatches) + len(not_found) + len(errors)
print(f"\nDone — {remaining} citation(s) still need attention.")
raise SystemExit(0 if remaining == 0 else 1)
