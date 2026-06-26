# Merit Sciences — Paid Campaign Build Plan

Consumer acquisition, recovery/performance lane. Distinct from the live **B2B practitioner** Google campaign (acct 689-500-7347). Everything below is built up to the **publish line** — the actual creation inside each Ads Manager is the operator's hands-on step (outward-facing, on your accounts).

## Creative — the contradiction lane (locked)

| # | Hook | Use | Visual |
|---|------|-----|--------|
| 01 | "You research everything. Your source is ▮▮▮▮▮." | Cold (signature) | Redaction device, dark |
| 02 | "You'd never eat gas-station sushi. So why order this from a group chat?" | Cold (shareable) | Cobalt field |
| 03 | "Reads every label twice." / "Buys it from a stranger." | Cold (split) | Calm-top / alarm-bottom |
| 04 | "Now you know exactly where it's from." | Warm / retarget | Cream, un-redacted relief |

Credential on all: **American Made · Pharmacy Grade**. Disclosure: **Research use only**.
Hard rules (every channel): no molecule names, no conditions, no before/after, no "clinically proven / purity / COA" on the hook, no "drug," no country named, no vial/needle imagery. Risk is *implied*, never stated.

## Funnel (all channels)

`Ad → /access (clean-room gate, ChromeGate strips chrome, noindex) → WELCOME10 stashed → catalog`. Crawlers/classifiers only ever see `/access`, never the compound catalog.

## UTM taxonomy (consistent — drives attribution)

```
utm_source   = meta | tiktok | google
utm_medium   = paid_social | cpc
utm_campaign = merit_contradiction_cold | merit_retarget
utm_content  = 01_redaction | 02_sushi | 03_split | 04_relief
```
All ad destination URLs → `https://meritsciences.com/access?utm_source=...&utm_medium=...&utm_campaign=...&utm_content=...`

---

## 1) Google Search — LAUNCH FIRST (text only, no creative needed)

History says Google converts for Merit; Meta paid = 0% across $450+. Lead here.

- **Account:** 689-500-7347 (new campaign, separate from the B2B practitioner one)
- **Campaign:** Search · "Merit — Sourcing (Consumer)" · Manual CPC or Max Conversions
- **Ad groups by intent:**
  - *Trusted sourcing* — kw: "research compounds usa", "american made research peptides", "third party tested peptides supplier"
  - *Recovery/performance* — kw: "recovery compounds", "performance research compounds"
  - **Do NOT bid** molecule names (forces non-compliant LPs + Google pharma policy). Clean-room handles the rest.
- **RSA headlines (≤30):** `American-Made Research` · `Third-Party Verified Lots` · `Pharmacy-Grade Sourcing` · `Ships from Dallas in 48 Hrs` · `A Source You Can Trust` · `Stop Sourcing From Strangers` · `Get 10% Off First Order` · `No Appointment Needed`
- **RSA descriptions (≤90):** `American made, pharmacy-grade. Third-party tested, shipped from Dallas. 10% off.` · `The opposite of a group chat and a Venmo. Verified every lot, out the door fast.`
- **Negatives:** "free", "jobs", "ozempic", "wegovy", molecule names, "near me"
- **Sitelinks:** How it ships · The standard · Why American made · Get access
- **Conversion action:** `/access` Enter click (Lead) + email capture. Budget: start **$20–30/day**.

## 2) Meta (Facebook/Instagram) — burner account + clean-room

> ⚠️ Compliance: the Jan-2025 health-restriction blocks **lower-funnel conversion optimization** (Purchase/AddToCart) on flagged domains. **Optimize for Landing Page Views / Leads**, never Purchase. Run on the **burner account**, route to `/access` only.

- **Campaign:** Traffic (or Leads) · optimize for **Landing Page View** (then Lead once pixel matures)
- **Ad set A — Cold prospecting:** US, 25–55, interests: longevity, biohacking, strength training, men's health, recovery; broad + interest stack. Placements: Reels + Feed + Stories. Budget **$15–20/day**.
- **Ad set B — Retarget (warm):** site visitors + `/access` non-converters + IG engagers (180d). Concept **04 (relief)**. Budget **$10/day**.
- **Creative rotation:** A = 01 (redaction) + 03 (split); test 02 (sushi). 4:5 + 1:1 + 9:16.
- **A/B the research question:** contradiction/distinctive set **vs.** a plain proof-led control → does distinctiveness actually out-convert, or just out-recall?

## 3) TikTok — burner account, native first

- **Campaign:** Traffic → `/access` · Web Conversions later once pixel has volume
- **Cold ad set:** US, 18–45, interests: fitness, wellness, biohacking; Spark/native. Budget **$15–20/day**.
- **Creative:** lead with **02 (sushi)** and **01 (redaction)** as **kinetic-type** (motion versions of the statics); the "Note" anti-ad format performs natively. Static as fallback.
- TikTok's classifier is the most aggressive — keep it strictly to `/access`, no molecule words anywhere.

---

## Pixels & measurement (wire before spend)

- **Meta Pixel** + **TikTok Pixel** on all pages; fire `PageView` site-wide and a **`Lead`** event on the `/access` Enter click and email capture (the optimization signal, since Purchase is blocked on Meta).
- Add **Conversions API (CAPI)** later for durable matching.
- Env: `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (operator supplies IDs from each Ads Manager).

## Launch checklist (operator, in each Ads Manager)

1. Create/confirm **burner** ad accounts (Meta, TikTok); Google uses 689-500-7347.
2. Install pixels → paste IDs into Render env.
3. Upload finals (full-res exports, 3 ratios each).
4. Build campaigns/ad sets per above; paste UTM'd `/access` URLs.
5. Set budgets (Google first, $20–30/day; Meta/TikTok capped $15–20/day experiments).
6. Launch Google → 1 week → layer Meta → then TikTok.

## Sequencing rationale

Google first (proven, text-only, instant). Meta/TikTok are **capped experiments** (0% history) gated behind the clean-room + burner. Scale only what the data earns.
