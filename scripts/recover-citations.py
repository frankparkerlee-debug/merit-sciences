#!/usr/bin/env python3
"""
Recover correct citation IDs for entries still flagged `verify: true`
in lib/research-data.ts by searching multiple sources.

Strategy per citation:
  1. PubMed esearch    — biomedical primary, ~30M papers
  2. Crossref          — DOI registry, ~140M works globally
  3. Europe PMC        — PMC mirror + better non-English coverage

For each source we issue a title-based query, fetch the top candidate's
metadata, and compare against the local citation (title fuzzy + first-
author last name + year + journal). If a candidate scores >=3/4 we
update the local record with the verified IDs and flip verify:false.

What stays at verify: true after this script runs is unrecoverable from
public sources — those entries are deleted in a separate cleanup pass.
"""
import re
import json
import time
import ssl
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

ROOT = Path("/Users/parkerlee/Desktop/merit-render")
DATA_FILE = ROOT / "lib" / "research-data.ts"

src = DATA_FILE.read_text()

# ─── Parse citations still flagged verify:true ────────────────────────
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
        'title':       m.group(1),
        'authors':     m.group(2),
        'journal':     m.group(3),
        'year':        int(m.group(4)),
        'pmid_wrong':  m.group(5),
        'block_span':  m.span(),
        'block_text':  m.group(0),
    })

print(f"Found {len(citations)} citations still flagged verify:true to recover\n")

if not citations:
    print("Nothing to recover.")
    raise SystemExit(0)

# ─── HTTP helpers ─────────────────────────────────────────────────────
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE
USER_AGENT = 'merit-sciences-citation-recovery/1.0 (research, mailto:rx@meritsciences.com)'

def http_get(url: str, timeout: int = 25) -> dict:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read())

def norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def first_author_last(authors_str: str) -> str:
    """Extract first author's last name from our 'Last F, Last F, ...' format."""
    return authors_str.split(',')[0].split(' ')[0]

# ─── Candidate scoring ────────────────────────────────────────────────
def score_candidate(cit: dict, cand: dict) -> tuple[int, dict]:
    """Score a candidate paper against the local citation. Returns (score 0-4, checks)."""
    title_norm_pm   = norm(cand.get('title', ''))
    title_norm_ours = norm(cit['title'])
    short = title_norm_ours if len(title_norm_ours) < len(title_norm_pm) else title_norm_pm
    long  = title_norm_pm if short is title_norm_ours else title_norm_ours
    title_match = len(short) > 20 and short[:int(len(short) * 0.7)] in long

    cand_first_last = norm(cand.get('first_author_last', ''))
    author_match = cand_first_last == norm(first_author_last(cit['authors']))

    year_match = str(cit['year']) == str(cand.get('year', ''))

    journal_match = (
        norm(cit['journal']) in norm(cand.get('journal', ''))
        or norm(cand.get('journal', '')) in norm(cit['journal'])
    )

    checks = {'title': title_match, 'author': author_match, 'year': year_match, 'journal': journal_match}
    return sum(checks.values()), checks

# ─── Source 1: PubMed esearch + esummary ──────────────────────────────
def pubmed_search(cit: dict) -> list[dict]:
    query = f"{cit['title']} {first_author_last(cit['authors'])} {cit['year']}"
    esearch_url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        f"?db=pubmed&term={urllib.parse.quote(query)}&retmode=json&retmax=5"
    )
    try:
        data = http_get(esearch_url)
        pmids = data.get('esearchresult', {}).get('idlist', [])
    except Exception:
        return []
    time.sleep(0.35)
    if not pmids:
        return []

    summary_url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        f"?db=pubmed&id={','.join(pmids)}&retmode=json"
    )
    try:
        data = http_get(summary_url)
    except Exception:
        return []
    time.sleep(0.35)

    results = []
    for pmid in pmids:
        rec = data.get('result', {}).get(pmid)
        if not rec or rec.get('error'):
            continue
        authors_list = rec.get('authors', [])
        first_author_full = (authors_list[0].get('name') if authors_list else '') or ''
        results.append({
            'source': 'pubmed',
            'pmid': pmid,
            'doi': next((aid['value'] for aid in rec.get('articleids', []) if aid.get('idtype') == 'doi'), None),
            'title': (rec.get('title') or '').rstrip('.'),
            'first_author_last': first_author_full.split(' ')[0] if first_author_full else '',
            'year': (rec.get('pubdate') or '').split(' ')[0][:4],
            'journal': rec.get('fulljournalname') or rec.get('source') or '',
        })
    return results

# ─── Source 2: Crossref ──────────────────────────────────────────────
def crossref_search(cit: dict) -> list[dict]:
    params = urllib.parse.urlencode({
        'query.title': cit['title'],
        'query.author': first_author_last(cit['authors']),
        'rows': 5,
    })
    url = f"https://api.crossref.org/works?{params}"
    try:
        data = http_get(url)
    except Exception:
        return []
    time.sleep(0.2)
    items = data.get('message', {}).get('items', [])
    results = []
    for item in items:
        title_list = item.get('title', [])
        title = title_list[0] if title_list else ''
        authors_list = item.get('author', [])
        # Renamed from `first_author_last` to avoid shadowing the
        # module-level function of the same name.
        fa_last = authors_list[0].get('family', '') if authors_list else ''
        # Crossref date can be in different fields
        date_parts = (item.get('published-print') or item.get('published-online') or item.get('issued') or {}).get('date-parts', [[]])
        year = str(date_parts[0][0]) if date_parts and date_parts[0] else ''
        journal_list = item.get('container-title', [])
        journal = journal_list[0] if journal_list else ''
        results.append({
            'source': 'crossref',
            'doi': item.get('DOI'),
            'pmid': None,
            'title': title,
            'first_author_last': fa_last,
            'year': year,
            'journal': journal,
        })
    return results

# ─── Source 3: Europe PMC ────────────────────────────────────────────
def europepmc_search(cit: dict) -> list[dict]:
    query = f'TITLE:"{cit["title"][:80]}" AND AUTH:"{first_author_last(cit["authors"])}"'
    params = urllib.parse.urlencode({
        'query': query,
        'format': 'json',
        'resultType': 'lite',
        'pageSize': 5,
    })
    url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?{params}"
    try:
        data = http_get(url)
    except Exception:
        return []
    time.sleep(0.2)
    items = data.get('resultList', {}).get('result', [])
    results = []
    for item in items:
        authors_str = item.get('authorString', '')
        # Renamed from `first_author_last` to avoid shadowing the
        # module-level function of the same name.
        fa_last = authors_str.split(',')[0].split(' ')[0] if authors_str else ''
        results.append({
            'source': 'europepmc',
            'pmid': item.get('pmid'),
            'doi': item.get('doi'),
            'title': item.get('title', '').rstrip('.'),
            'first_author_last': fa_last,
            'year': str(item.get('pubYear', '')),
            'journal': item.get('journalTitle', ''),
        })
    return results

# ─── Run recovery ────────────────────────────────────────────────────
SOURCES = [
    ('PubMed',     pubmed_search),
    ('Crossref',   crossref_search),
    ('EuropePMC',  europepmc_search),
]

recoveries = []
for i, cit in enumerate(citations, 1):
    print(f"[{i}/{len(citations)}] Searching for: {cit['title'][:65]}...")
    best = None
    for src_name, fn in SOURCES:
        try:
            cands = fn(cit)
        except Exception as e:
            print(f"     {src_name}: error {str(e)[:40]}")
            continue
        for cand in cands:
            score, checks = score_candidate(cit, cand)
            if best is None or score > best['score']:
                best = {'cand': cand, 'score': score, 'checks': checks, 'source': src_name}
            if score == 4:
                break  # perfect match — done
        if best and best['score'] == 4:
            break

    if best is None or best['score'] < 3:
        print(f"     ❌ No good match (best score: {best['score'] if best else 'none'}/4)")
        recoveries.append({'cit': cit, 'status': 'UNRECOVERABLE', 'best': best})
    elif best['score'] == 4:
        print(f"     ✅ {best['source']}: PMID={best['cand'].get('pmid')} DOI={best['cand'].get('doi')}")
        recoveries.append({'cit': cit, 'status': 'RECOVERED', 'best': best})
    else:  # score == 3
        print(f"     ⚠️  {best['source']} 3/4: PMID={best['cand'].get('pmid')} (verify journal name)")
        recoveries.append({'cit': cit, 'status': 'LIKELY', 'best': best})

# ─── Apply recoveries to the file ─────────────────────────────────────
print("\n" + "=" * 78)
print("RECOVERY SUMMARY")
print("=" * 78)

recovered    = [r for r in recoveries if r['status'] == 'RECOVERED']
likely       = [r for r in recoveries if r['status'] == 'LIKELY']
unrecoverable = [r for r in recoveries if r['status'] == 'UNRECOVERABLE']

print(f"\n  ✅ {len(recovered):2d}  RECOVERED      — correct IDs found, auto-applied")
print(f"  ⚠️  {len(likely):2d}  LIKELY (3/4)   — applied, but spot-check the journal name")
print(f"  ❌ {len(unrecoverable):2d}  UNRECOVERABLE  — flagged for deletion")
print(f"     {len(recoveries):2d}  TOTAL")

# Rewrite the file with corrected IDs for recovered + likely
new_src = src
for r in recovered + likely:
    cit = r['cit']
    cand = r['best']['cand']
    new_pmid = cand.get('pmid')
    new_doi  = cand.get('doi')
    new_title = cand['title']
    new_authors_first = cand['first_author_last']

    block = cit['block_text']
    # Replace pubmedId
    if new_pmid:
        block = re.sub(r"pubmedId:\s*'\d+'", f"pubmedId: '{new_pmid}'", block, count=1)
        # Update URL too
        block = re.sub(r"url:\s*'https://pubmed\.ncbi\.nlm\.nih\.gov/[^']*'", f"url: 'https://pubmed.ncbi.nlm.nih.gov/{new_pmid}/'", block, count=1)
    # Add or update DOI
    if new_doi:
        if "doi:" in block:
            block = re.sub(r"doi:\s*'[^']*'", f"doi: '{new_doi}'", block, count=1)
        else:
            # Insert doi line before pubmedId line
            block = re.sub(r"(\s+)(pubmedId:)", rf"\1doi: '{new_doi}',\1\2", block, count=1)
    # Flip verify flag
    block = re.sub(r"verify:\s*true", "verify: false", block, count=1)

    new_src = new_src.replace(cit['block_text'], block, 1)

DATA_FILE.write_text(new_src)
print(f"\nWrote {DATA_FILE}")

# ─── Detail report ────────────────────────────────────────────────────
if likely:
    print("\n" + "─" * 78)
    print("⚠️  LIKELY MATCHES — applied but worth a quick journal-name spot-check")
    print("─" * 78)
    for r in likely:
        c, b = r['cit'], r['best']
        cand = b['cand']
        chk = b['checks']
        miss = ', '.join(k for k, v in chk.items() if not v)
        print(f"  PMID {cand.get('pmid')}: {c['title'][:60]}")
        print(f"     mismatch field: {miss}")
        print(f"     PubMed journal: {cand.get('journal')}")
        print(f"     Our journal:    {c['journal']}")

if unrecoverable:
    print("\n" + "─" * 78)
    print("❌ UNRECOVERABLE — paper not found in PubMed / Crossref / Europe PMC")
    print("─" * 78)
    print("    These citations will be deleted by the cleanup pass.\n")
    for r in unrecoverable:
        c = r['cit']
        print(f"  {c['title'][:70]}")
        print(f"     by {first_author_last(c['authors'])} et al. ({c['year']}, {c['journal']})")

print(f"\nDone — {len(unrecoverable)} citation(s) still need deletion. Run cleanup pass next.")
