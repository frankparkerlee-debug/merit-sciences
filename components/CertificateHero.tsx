import Image from 'next/image';

/* ─────────────────────────────────────────────────────────────────────────
   THE CERTIFICATE — Merit's real signed COA as the homepage image.

   The page argues "the receipt is the product", so the receipt is the
   picture. This is not a rendering or a mockup: it is page 1 of
   public/coa/reports/merit-coa-retatrutide-10mg-lot2026-06-0001.pdf, the
   actual ILS Laboratories certificate for lot LOT2026-06-0001 — accredited
   third-party letterhead, ISO/IEC 17025 mark, lab director's signature.

   Why it beats an object photograph: every competitor can license the same
   dark stock vial, and none of them can show this. The persuasion is being
   done by an accredited lab's paperwork rather than by adjectives.

   ── THE LEGIBILITY PROBLEM, AND THE FIX ──────────────────────────────────
   A full letter-size page shrunk into a hero reads as grey texture, and on
   a phone it crops to nothing. So the document is served at two crops:

     desktop  coa-document.webp         full sheet, angled — reads as an
                                        OBJECT laid on the page. Detail is
                                        texture here, and that is fine: the
                                        job is "this is a real lab report".
     mobile   coa-document-detail.webp  the persuasive band only — compound,
                                        COA number, lot number, PASS badge,
                                        99.13% purity, fentanyl-free mark.
                                        Every one of those stays READABLE at
                                        360 px wide.

   Regenerate both from the PDF at 400 dpi; see the crop fractions in the
   session notes. If the featured lot changes, change LOT below with it.
   ───────────────────────────────────────────────────────────────────────── */

export const LOT = {
  compound: 'Retatrutide 10 mg',
  lotId: 'LOT2026-06-0001',
  coaNumber: 'COA-2026-49Y4L7',
  purity: '99.13%',
  lab: 'ILS Laboratories',
  accreditation: 'ISO/IEC 17025',
};

export function CertificateHero() {
  return (
    <>
      {/* Spotlight — a single soft source behind the sheet, so the paper
          looks lit rather than pasted onto a flat black rectangle. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(58% 62% at 74% 40%, rgba(120,150,255,0.16) 0%, rgba(8,9,10,0) 70%)',
        }}
      />

      {/* ── Desktop: the full sheet as an object ───────────────────────── */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute z-[1] right-[-2%] top-[-4%] w-[43%]"
        style={{
          transform: 'perspective(1700px) rotateY(-14deg) rotateZ(-2.5deg)',
          transformOrigin: 'right center',
          filter: 'drop-shadow(-46px 54px 96px rgba(0,0,0,0.78))',
        }}
      >
        <Image
          src="/brand/coa-document.webp"
          alt=""
          width={1400}
          height={2014}
          priority
          sizes="43vw"
          className="w-full h-auto"
        />
      </div>

      {/* ── Mobile / tablet: the readable band ─────────────────────────── */}
      <div
        aria-hidden="true"
        className="lg:hidden absolute z-[1] left-[6%] right-[-14%] top-[9%]"
        style={{
          transform: 'rotate(-2deg)',
          filter: 'drop-shadow(-12px 22px 44px rgba(0,0,0,0.7))',
        }}
      >
        <Image
          src="/brand/coa-document-detail.webp"
          alt=""
          width={1800}
          height={736}
          priority
          sizes="108vw"
          className="w-full h-auto"
        />
      </div>
    </>
  );
}

/** Screen-reader + crawler text for the hero image. The certificate is the
 *  page's central evidence, so its contents must not be locked inside a
 *  decorative <img> — this puts the same facts in the DOM as real text.
 *  Answer engines quote this; assistive tech reads it. */
export function CertificateHeroCaption() {
  return (
    <p className="sr-only">
      Certificate of analysis {LOT.coaNumber} issued by {LOT.lab} ({LOT.accreditation} accredited)
      for {LOT.compound}, lot {LOT.lotId}. Identity confirmed by HPLC-RTM. Peptide purity{' '}
      {LOT.purity} by HPLC against a specification of at least 95.0%. Fentanyl screen by
      immunoassay: not detected. Heavy metals by ICP-MS: pass. Overall result: pass.
    </p>
  );
}
