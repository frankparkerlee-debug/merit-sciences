import { PolicyLayout } from '@/components/PolicyLayout';

export const metadata = {
  title: 'Research Disclosure',
  description:
    'Merit Sciences research disclosure. All compounds are for research use only — not FDA-approved, not for human or veterinary use. Researcher acknowledgment, regulated substance status, and limitation of liability.',
};

export default function ResearchDisclosurePage() {
  return (
    <PolicyLayout
      title="Research Disclosure"
      subtitle="Required acknowledgment for every Merit Sciences purchase. Read in full before placing an order."
      lastUpdated="Jun 2026"
    >
      <p>
        Merit Sciences supplies compounds and chemical reagents exclusively
        for <strong>in-vitro research, laboratory experimentation, and
        preclinical investigation</strong>. The following terms apply to
        every product offered through this site and govern the legal basis
        on which Merit Sciences sells to qualified researchers.
      </p>

      <h2>Not for human or veterinary use</h2>
      <p>
        No product sold by Merit Sciences is intended, designed, or
        manufactured for human or veterinary administration. All compounds
        are provided as analytical reference standards or research reagents
        only. Merit Sciences products must not be ingested, injected,
        inhaled, applied topically, or otherwise introduced into the body
        of any human or animal subject. Purchase, possession, or use of
        any compound for non-research purposes is at the purchaser&apos;s
        sole risk and may violate federal, state, or local law.
      </p>

      <h2>Not FDA-approved</h2>
      <p>
        Merit Sciences products have not been evaluated, reviewed, or
        approved by the U.S. Food and Drug Administration (FDA) for any
        therapeutic, diagnostic, prophylactic, or cosmetic indication.
        They are not drugs, dietary supplements, cosmetics, or food. No
        representation is made that any compound has any clinical effect.
      </p>

      <h2>Researcher acknowledgment</h2>
      <p>By placing an order with Merit Sciences, the purchaser certifies that:</p>
      <ul>
        <li>They are <strong>21 years of age or older</strong>.</li>
        <li>
          They are a <strong>qualified research professional</strong>, academic
          institution, commercial research laboratory, or other entity
          engaged in legitimate scientific research.
        </li>
        <li>
          They have the appropriate <strong>facilities, training, and
          licensure</strong> required to handle research-grade compounds safely
          and lawfully.
        </li>
        <li>
          They will use Merit Sciences products only for their stated
          research applications and in compliance with all applicable
          federal, state, and local laws.
        </li>
        <li>
          They will not <strong>redistribute or resell</strong> any compound
          purchased from Merit Sciences for any non-research purpose.
        </li>
      </ul>

      <h2>Regulated substances</h2>
      <p>
        Certain compounds offered by Merit Sciences may be subject to
        control under U.S. federal regulation (including but not limited
        to the Federal Food, Drug, and Cosmetic Act and the Controlled
        Substances Act), state regulation, or international regulation
        in the purchaser&apos;s jurisdiction. The purchaser is solely
        responsible for verifying the legal status of any compound in
        their jurisdiction and for obtaining any required permits,
        licenses, or registrations <em>prior to procurement</em>. Merit
        Sciences reserves the right to refuse or cancel any order that
        appears inconsistent with this responsibility.
      </p>

      <h2>No clinical claims</h2>
      <p>
        Merit Sciences makes <strong>no representations, warranties, or
        guarantees</strong> regarding the safety, efficacy, or suitability
        of any compound for any specific research application or biological
        endpoint. Lot information, certificates of analysis, mechanism
        summaries, half-life and solubility figures, citation references,
        and other technical material on this site are provided strictly
        to support quality verification in research contexts and do not
        constitute medical, therapeutic, diagnostic, scientific, or
        professional advice.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Merit Sciences disclaims any and all liability arising from the
        misuse, improper handling, improper storage, unauthorized
        application, or unlawful possession of any compound sold. The
        purchaser assumes full responsibility for the proper storage,
        handling, reconstitution, dispensing, and disposition of all
        compounds in accordance with established laboratory practices,
        institutional policies, and applicable law.
      </p>
      <p>
        In no event shall Merit Sciences, its officers, employees,
        agents, suppliers, or partners be liable for any indirect,
        incidental, special, consequential, or punitive damages
        arising from the purchase, handling, or use of any Merit
        Sciences product, even if advised of the possibility of such
        damages.
      </p>

      <h2>Quality commitment</h2>
      <p>
        Every Merit Sciences lot is independently HPLC-tested to a
        ≥99% purity floor before release and signed off by a US-licensed
        pharmacist. A certificate of analysis (COA) is available for
        any specific lot upon request. These quality measures support
        research integrity; they are not, and should not be construed
        as, clinical safety endorsements.
      </p>

      <h2>Questions</h2>
      <p>
        For questions regarding this disclosure, the regulatory status
        of a specific compound, or COA access for any lot, contact our
        pharmacy team at{' '}
        <a href="mailto:rx@meritsciences.com">rx@meritsciences.com</a>.
      </p>

      <p style={{ marginTop: '2rem', fontSize: '12px', color: 'rgb(11 15 25 / 0.55)' }}>
        Effective Jun 2026 · Merit Sciences LLC · Dallas, TX, USA
      </p>
    </PolicyLayout>
  );
}
