-- Merit Sciences — June/July 2026 lab-results (Chromate/APC COA drop).
-- Data OCR-extracted from the third-party COAs in the Drive "APC COA Folder"
-- (June + July 2026 jobs 35662–36733); lab + manufacturer identifiers omitted
-- (the /coa page redacts them by design — data-only cards, never the APC image).
-- Lots synthesized MRT-YYMM-NN by analysis month (the COAs carry no Merit lot).
-- testedDate = "analysis conducted" date on each COA. Run in Supabase SQL editor.
--
-- HELD BACK (sub-spec purity — do NOT publish without Parker's sign-off):
--   * ARA-290 (#36423)            — 88.226% vs >98% spec. Hard fail.
--   * L-Glutathione 1500mg (#36704) — 96.832% vs >98% (-1.17%).
--   * AOD-9604 5mg (#36380)       — 97.850% vs >98% (-0.150%).
--   * AOD-9604 10mg (#36381)      — 97.508% vs >98% (-0.492%).
-- NOTE: NAD+ 500mg (#36529) is 92.781% but its spec is >90% → CONFORMS, published.

insert into coas (id, compound, "lotId", purity, identity, appearance, "testedDate", "createdAt") values
  ('coa_mrt_2605_09','Tirzepatide 30mg','MRT-2605-09','99.657%','Tirzepatide','Lyophilized powder','2026-05-31',now()),
  ('coa_mrt_2605_10','Retatrutide 60mg','MRT-2605-10','99.597%','Retatrutide','Lyophilized powder','2026-05-31',now()),
  ('coa_mrt_2605_11','Tesamorelin 10mg','MRT-2605-11','99.379%','Tesamorelin','Lyophilized powder','2026-05-31',now()),
  ('coa_mrt_2605_12','5-Amino-1MQ 50mg','MRT-2605-12','99.429%','5-Amino-1MQ','Lyophilized powder','2026-05-31',now()),
  ('coa_mrt_2605_13','KLOW 80mg','MRT-2605-13','99.270%','KPV, GHK-Cu, BPC-157, TB-500','Lyophilized powder','2026-05-31',now()),
  ('coa_mrt_2606_01','MOTS-c 40mg','MRT-2606-01','99.015%','MOTS-c','Lyophilized powder','2026-06-14',now()),
  ('coa_mrt_2606_02','CJC-1295 / Ipamorelin','MRT-2606-02','99.671%','CJC-1295, Ipamorelin','Lyophilized powder','2026-06-14',now()),
  ('coa_mrt_2606_03','TB-500 10mg','MRT-2606-03','99.343%','TB-500','Lyophilized powder','2026-06-13',now()),
  ('coa_mrt_2606_04','BPC-157 10mg','MRT-2606-04','98.992%','BPC-157','Lyophilized powder','2026-06-13',now()),
  ('coa_mrt_2606_05','Retatrutide 30mg','MRT-2606-05','99.861%','Retatrutide','Lyophilized powder','2026-06-17',now()),
  ('coa_mrt_2606_06','Melanotan II 10mg','MRT-2606-06','99.617%','Melanotan II','Lyophilized powder','2026-06-17',now()),
  ('coa_mrt_2606_07','Ipamorelin 10mg','MRT-2606-07','99.590%','Ipamorelin','Lyophilized powder','2026-06-17',now()),
  ('coa_mrt_2606_08','BPC-157 10mg','MRT-2606-08','99.511%','BPC-157','Lyophilized powder','2026-06-20',now()),
  ('coa_mrt_2606_09','KPV 10mg','MRT-2606-09','98.037%','KPV','Lyophilized powder','2026-06-20',now()),
  ('coa_mrt_2606_10','KLOW','MRT-2606-10','99.823%','GHK-Cu, KPV, BPC-157, TB-500','Lyophilized powder','2026-06-16',now()),
  ('coa_mrt_2606_11','NAD+ 500mg','MRT-2606-11','92.781%','NAD+','Lyophilized powder','2026-06-27',now()),
  ('coa_mrt_2606_12','Tesamorelin 20mg','MRT-2606-12','99.195%','Tesamorelin','Lyophilized powder','2026-06-27',now()),
  ('coa_mrt_2606_13','Tesamorelin / Ipamorelin','MRT-2606-13','99.270%','Tesamorelin, Ipamorelin','Lyophilized powder','2026-06-27',now()),
  ('coa_mrt_2606_14','Retatrutide 10mg','MRT-2606-14','98.422%','Retatrutide','Lyophilized powder','2026-06-27',now()),
  ('coa_mrt_2606_15','Retatrutide 30mg','MRT-2606-15','99.083%','Retatrutide','Lyophilized powder','2026-06-27',now()),
  ('coa_mrt_2607_01','CJC-1295 / Ipamorelin','MRT-2607-01','99.714%','CJC-1295, Ipamorelin','Lyophilized powder','2026-06-30',now()),
  ('coa_mrt_2607_02','BPC-157 + TB-500 (Wolverine)','MRT-2607-02','98.993%','BPC-157, TB-500','Lyophilized powder','2026-06-30',now()),
  ('coa_mrt_2607_03','Retatrutide 10mg','MRT-2607-03','98.567%','Retatrutide','Lyophilized powder','2026-07-03',now()),
  ('coa_mrt_2607_04','Semax 10mg','MRT-2607-04','99.754%','Semax','Lyophilized powder','2026-07-03',now()),
  ('coa_mrt_2607_05','Semax 30mg','MRT-2607-05','99.317%','Semax','Lyophilized powder','2026-07-03',now());
