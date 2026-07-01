-- Merit Sciences — full lab-results library for /coa (lot-lookup)
-- Data OCR-extracted from the third-party (Chromate/APC) COAs in the Drive
-- "APC COA Folder"; lab + manufacturer identifiers omitted (the /coa page
-- redacts them by design). Lots synthesized as MRT-YYMM-NN by batch month
-- (the COAs carry no Merit bottle lot). Run in the Supabase SQL editor.
--
-- HELD BACK (not in this insert — decide separately):
--   * Semax 10mg (May '26) — FAILED identity: came back as Hydroxyacetophenone. DO NOT publish.
--   * Somatropin 10iu (Mar '26) — 88.451% purity, below >90% spec (5.7% dimer).
--   * NAD+ 500mg + SLU-PP-332 5mg — COAs show identity+content only, no HPLC purity %.
--   * Bacteriostatic Water — sterility/benzyl-alcohol assay, not an HPLC purity.
--
insert into coas (id, compound, "lotId", purity, identity, appearance, "testedDate", "createdAt") values
  ('coa_mrt_2503_01','Tirzepatide 30mg','MRT-2503-01','99.812%','Tirzepatide','Lyophilized powder','2025-03-16',now()),
  ('coa_mrt_2503_02','Semaglutide 10mg','MRT-2503-02','99.592%','Semaglutide','Lyophilized powder','2025-03-16',now()),
  ('coa_mrt_2503_03','Retatrutide 30mg','MRT-2503-03','99.989%','Retatrutide','Lyophilized powder','2025-03-16',now()),
  ('coa_mrt_2503_04','GHK-Cu 100mg','MRT-2503-04','99.935%','GHK-Cu','Lyophilized powder','2025-03-19',now()),
  ('coa_mrt_2503_05','BPC-157 10mg','MRT-2503-05','98.858%','BPC-157','Lyophilized powder','2025-03-19',now()),
  ('coa_mrt_2508_01','CJC-1295 / Ipamorelin','MRT-2508-01','98.823%','CJC-1295, Ipamorelin','Lyophilized powder','2025-08-04',now()),
  ('coa_mrt_2508_02','PT-141 10mg','MRT-2508-02','98.035%','PT-141','Lyophilized powder','2025-08-04',now()),
  ('coa_mrt_2508_03','AOD-9604 5mg','MRT-2508-03','99.049%','AOD-9604','Lyophilized powder','2025-08-04',now()),
  ('coa_mrt_2508_04','GLOW','MRT-2508-04','99.867%','GHK-Cu, BPC-157, TB-500','Lyophilized powder','2025-08-08',now()),
  ('coa_mrt_2508_05','Thymosin Alpha-1 10mg','MRT-2508-05','99.694%','Thymosin Alpha-1','Lyophilized powder','2025-08-14',now()),
  ('coa_mrt_2511_01','GLOW','MRT-2511-01','99.913%','GHK-Cu, BPC-157, TB-500','Lyophilized powder','2025-11-21',now()),
  ('coa_mrt_2511_02','BPC-157 10mg','MRT-2511-02','99.156%','BPC-157','Lyophilized powder','2025-11-23',now()),
  ('coa_mrt_2511_03','CJC-1295 / Ipamorelin','MRT-2511-03','99.222%','CJC-1295, Ipamorelin','Lyophilized powder','2025-11-25',now()),
  ('coa_mrt_2511_04','Tirzepatide 100mg','MRT-2511-04','99.921%','Tirzepatide','Lyophilized powder','2025-11-26',now()),
  ('coa_mrt_2511_05','Wolverine','MRT-2511-05','98.485%','BPC-157, TB-500','Lyophilized powder','2025-11-26',now()),
  ('coa_mrt_2512_01','AOD-9604 5mg','MRT-2512-01','99.897%','AOD-9604','Lyophilized powder','2025-12-08',now()),
  ('coa_mrt_2601_01','CJC-1295 / Ipamorelin','MRT-2601-01','99.631%','CJC-1295, Ipamorelin','Lyophilized powder','2026-01-25',now()),
  ('coa_mrt_2601_02','CJC-1295 / Ipamorelin','MRT-2601-02','99.652%','CJC-1295, Ipamorelin','Lyophilized powder','2026-01-25',now()),
  ('coa_mrt_2601_03','GLOW','MRT-2601-03','99.805%','GHK-Cu, BPC-157, TB-500','Lyophilized powder','2026-01-27',now()),
  ('coa_mrt_2601_04','TB-500 10mg','MRT-2601-04','99.653%','TB-500','Lyophilized powder','2026-01-27',now()),
  ('coa_mrt_2601_05','BPC-157 10mg','MRT-2601-05','98.878%','BPC-157','Lyophilized powder','2026-01-27',now()),
  ('coa_mrt_2603_01','Retatrutide 30mg','MRT-2603-01','99.936%','Retatrutide','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_02','Thymosin Alpha-1 10mg','MRT-2603-02','99.618%','Thymosin Alpha-1','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_03','Tirzepatide 30mg','MRT-2603-03','99.827%','Tirzepatide','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_04','Semaglutide 10mg','MRT-2603-04','99.788%','Semaglutide','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_05','PE-22-28 10mg','MRT-2603-05','99.305%','PE-22-28','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_06','CJC-1295 / Ipamorelin','MRT-2603-06','99.573%','CJC-1295, Ipamorelin','Lyophilized powder','2026-03-08',now()),
  ('coa_mrt_2603_07','MOTS-c 40mg','MRT-2603-07','99.506%','MOTS-c','Lyophilized powder','2026-03-16',now()),
  ('coa_mrt_2603_08','KPV 10mg','MRT-2603-08','99.850%','KPV','Lyophilized powder','2026-03-16',now()),
  ('coa_mrt_2603_09','KLOW','MRT-2603-09','99.591%','GHK-Cu, BPC-157, TB-500, KPV','Lyophilized powder','2026-03-16',now()),
  ('coa_mrt_2603_10','Glutathione 1500mg','MRT-2603-10','98.815%','L-Glutathione','Lyophilized powder','2026-03-22',now()),
  ('coa_mrt_2605_01','Oxytocin 5mg','MRT-2605-01','99.161%','Oxytocin','Lyophilized powder','2026-05-03',now()),
  ('coa_mrt_2605_02','Retatrutide 10mg','MRT-2605-02','99.191%','Retatrutide','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_03','Retatrutide 20mg','MRT-2605-03','99.964%','Retatrutide','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_04','Retatrutide 30mg','MRT-2605-04','99.681%','Retatrutide','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_05','SS-31 50mg','MRT-2605-05','99.653%','SS-31','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_06','GLOW','MRT-2605-06','99.593%','GHK-Cu, BPC-157, TB-500','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_07','Melanotan II 10mg','MRT-2605-07','99.017%','Melanotan II','Lyophilized powder','2026-05-04',now()),
  ('coa_mrt_2605_08','PT-141 10mg','MRT-2605-08','99.741%','PT-141','Lyophilized powder','2026-05-04',now())
on conflict (id) do update set compound=excluded.compound,"lotId"=excluded."lotId",purity=excluded.purity,identity=excluded.identity,"testedDate"=excluded."testedDate";

-- Bacteriostatic Water — only lot on file is Aug 2025. USP sterility + preservative
-- assay (not HPLC); the /coa card special-cases the name to show a sterility panel.
insert into coas (id, compound, "lotId", purity, identity, appearance, "testedDate", "createdAt") values
  ('coa_mrt_2508_06','Bacteriostatic Water','MRT-2508-06','Sterile','No microbial growth · 0.954% benzyl alcohol · pH 5.82','Clear sterile solution','2025-08-08',now())
on conflict (id) do update set compound=excluded.compound,"lotId"=excluded."lotId",purity=excluded.purity,identity=excluded.identity,"testedDate"=excluded."testedDate";

-- PUBLISHABLE: 39 lots + Bacteriostatic Water
-- HELD BACK:
--   NAD+ 500mg               2025-08-01  [no HPLC purity on COA (identity+content only)]
--   Somatropin 10iu          2026-03-11  [SUB-SPEC (>90% req; 5.7% dimer)]
--   SLU-PP-332 5mg           2026-03-28  [no HPLC purity on COA (identity+content only)]
--   Semax 10mg               2026-05-04  [FAILED IDENTITY -> Hydroxyacetophenone. DO NOT PUBLISH]
