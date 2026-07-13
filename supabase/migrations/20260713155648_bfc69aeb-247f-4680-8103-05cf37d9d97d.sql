
-- ============================================================
-- Stage 1d: Idempotent development seed data
-- ============================================================

-- Fixed UUIDs so the seed is deterministic and re-runs are safe.
-- Organisation + store
INSERT INTO public.organisations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Pharmacy Group', 'demo-pharmacy-group', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (id, organisation_id, name, store_code, address, timezone, status)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Demo High Street Pharmacy',
  'DEMO-001',
  '1 High Street, Anywhere',
  'Europe/London',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Symptoms
INSERT INTO public.symptoms (id, code, name, customer_description, icon, display_order, active) VALUES
  ('00000000-0000-0000-0000-000000000201', 'sneezing',     'Sneezing',     'Frequent, repeated sneezes',       'Wind',         1, true),
  ('00000000-0000-0000-0000-000000000202', 'runny-nose',   'Runny nose',   'Clear nasal discharge',            'Droplet',      2, true),
  ('00000000-0000-0000-0000-000000000203', 'blocked-nose', 'Blocked nose', 'Congestion, hard to breathe',      'Ban',          3, true),
  ('00000000-0000-0000-0000-000000000204', 'itchy-nose',   'Itchy nose',   'Tickly, irritated nose',           'Sparkles',     4, true),
  ('00000000-0000-0000-0000-000000000205', 'itchy-eyes',   'Itchy eyes',   'Rubbing, gritty feeling',          'Eye',          5, true),
  ('00000000-0000-0000-0000-000000000206', 'watery-eyes',  'Watery eyes',  'Excess tears, streaming',          'CloudDrizzle', 6, true)
ON CONFLICT (id) DO NOTHING;

-- Customer display groups
INSERT INTO public.customer_display_groups (id, code, name, customer_description, icon, display_order, active) VALUES
  ('00000000-0000-0000-0000-000000000301', 'tablets',      'Tablets',      'Whole-body antihistamines that help calm sneezing, itching and runny nose.', 'Pill',     1, true),
  ('00000000-0000-0000-0000-000000000302', 'nasal-sprays', 'Nasal sprays', 'Targeted relief for congestion, itching and a runny nose.',                  'SprayCan', 2, true),
  ('00000000-0000-0000-0000-000000000303', 'eye-drops',    'Eye drops',    'Soothe itchy, watery and irritated eyes at the source.',                     'Eye',      3, true)
ON CONFLICT (id) DO NOTHING;

-- Treatment groups
INSERT INTO public.treatment_groups (id, code, name, description, active) VALUES
  ('00000000-0000-0000-0000-000000000401', 'oral-antihistamine',      'Oral antihistamine',       'Systemic H1 antagonist taken by mouth', true),
  ('00000000-0000-0000-0000-000000000402', 'intranasal-corticosteroid','Intranasal corticosteroid','Anti-inflammatory nasal spray',        true),
  ('00000000-0000-0000-0000-000000000403', 'topical-decongestant',    'Topical decongestant',     'Short-term nasal decongestant',         true),
  ('00000000-0000-0000-0000-000000000404', 'ocular-mast-cell',        'Ocular mast-cell stabiliser / antihistamine', 'Eye drops targeting ocular allergy', true),
  ('00000000-0000-0000-0000-000000000405', 'saline-irrigation',       'Saline nasal irrigation',   'Drug-free saline rinse',               true)
ON CONFLICT (id) DO NOTHING;

-- Symptom → display-group mappings
INSERT INTO public.symptom_display_group_mappings (id, symptom_id, display_group_id, relevance_weight, active) VALUES
  -- Tablets (systemic, help sneezing/runny/itchy nose/itchy eyes)
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', 4, true),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000301', 3, true),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000301', 3, true),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000301', 2, true),
  -- Nasal sprays
  ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000302', 5, true),
  ('00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000302', 4, true),
  ('00000000-0000-0000-0000-000000000507', '00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000302', 3, true),
  ('00000000-0000-0000-0000-000000000508', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000302', 2, true),
  -- Eye drops
  ('00000000-0000-0000-0000-000000000509', '00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000303', 5, true),
  ('00000000-0000-0000-0000-000000000510', '00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000303', 5, true)
ON CONFLICT (symptom_id, display_group_id) DO NOTHING;

-- Products (12)
INSERT INTO public.products
(id, gtin, product_name, brand_name, active_ingredient, strength, formulation, pack_size, customer_summary, treatment_group_id, drowsiness_level, requires_staff_help, warning_text, image_url, active) VALUES
  ('00000000-0000-0000-0000-000000000601','5000000000011','Cetirizine 10 mg Tablets',            NULL,'Cetirizine hydrochloride','10 mg','tablet',      '30 tablets',                    'Once daily, non-drowsy for most',        '00000000-0000-0000-0000-000000000401','low',     false,'Adults and children 6+. Read the label before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000602','5000000000028','Loratadine 10 mg Tablets',             NULL,'Loratadine','10 mg','tablet',      '30 tablets',                    'Once daily, non-drowsy',                  '00000000-0000-0000-0000-000000000401','none',    false,'Adults and children 2+. Read the label before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000603','5000000000035','Chlorphenamine 4 mg Tablets',          NULL,'Chlorphenamine maleate','4 mg','tablet',      '28 tablets',                    'Fast acting; may cause drowsiness',       '00000000-0000-0000-0000-000000000401','high',    false,'Do not drive after taking. Adults and children 6+.', NULL, true),
  ('00000000-0000-0000-0000-000000000604','5000000000042','Fexofenadine 120 mg Tablets',          NULL,'Fexofenadine hydrochloride','120 mg','tablet',      '30 tablets',                    'Once daily, non-drowsy',                  '00000000-0000-0000-0000-000000000401','none',    false,'Adults and children 12+. Read the label before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000605','5000000000059','Beclometasone Nasal Spray 50 mcg',     NULL,'Beclometasone dipropionate','50 mcg/dose','nasal_spray','180 doses (200 sprays)',    'Targets nasal symptoms; takes days for full effect', '00000000-0000-0000-0000-000000000402','none', true, 'Adults 18+. Ask pharmacist before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000606','5000000000066','Fluticasone Nasal Spray 50 mcg',       NULL,'Fluticasone propionate','50 mcg/dose','nasal_spray','150 doses',                  'Once daily nasal spray',                 '00000000-0000-0000-0000-000000000402','none', true, 'Adults 18+. Ask pharmacist before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000607','5000000000073','Saline Nasal Spray',                    NULL,'Sodium chloride','0.9% w/v','nasal_spray','100 ml',                     'Drug-free, suitable in pregnancy',        '00000000-0000-0000-0000-000000000405','none', false,'Suitable for adults and children. Preservative-free.', NULL, true),
  ('00000000-0000-0000-0000-000000000608','5000000000080','Xylometazoline Decongestant Spray',    NULL,'Xylometazoline hydrochloride','0.1%','nasal_spray','10 ml',                       'Fast decongestant; max 7 days use',       '00000000-0000-0000-0000-000000000403','none', true, 'Do not use for more than 7 days. Adults and children 12+.', NULL, true),
  ('00000000-0000-0000-0000-000000000609','5000000000097','Sodium Cromoglicate Eye Drops',         NULL,'Sodium cromoglicate','2% w/v','eye_drops',   '10 ml',                       'For itchy and watery eyes',              '00000000-0000-0000-0000-000000000404','none', false,'Use 4 times a day. Read the label before use.', NULL, true),
  ('00000000-0000-0000-0000-000000000610','5000000000103','Preservative-Free Allergy Eye Drops',   NULL,'Sodium cromoglicate','2% (preservative-free)','eye_drops','20 x 0.35 ml vials',          'Preservative-free, suitable for contact lens wearers', '00000000-0000-0000-0000-000000000404','none',false,'Discard vial after single use.', NULL, true),
  ('00000000-0000-0000-0000-000000000611','5000000000110','Azelastine Eye Drops',                  NULL,'Azelastine hydrochloride','0.05%','eye_drops',    '8 ml',                        'Fast-acting eye drops, twice daily',      '00000000-0000-0000-0000-000000000404','none', true, 'Adults and children 12+. Ask pharmacy team.', NULL, true),
  ('00000000-0000-0000-0000-000000000612','5000000000127','Children''s Cetirizine Oral Solution', NULL,'Cetirizine hydrochloride','1 mg/ml','oral_liquid', '200 ml with dosing syringe',  'Banana-flavoured oral solution for children', '00000000-0000-0000-0000-000000000401','low', true, 'For children aged 2-12. Ask pharmacy team about dosing.', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Product → display-group mappings
-- NOTE: the children's cetirizine oral liquid (p12) is a systemic antihistamine
-- so it maps to the "Tablets" display bucket for customers, but its formulation
-- is 'oral_liquid' on the canonical product.
INSERT INTO public.product_display_group_mappings (id, product_id, display_group_id, active) VALUES
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000301', true),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000301', true),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000301', true),
  ('00000000-0000-0000-0000-000000000704', '00000000-0000-0000-0000-000000000604', '00000000-0000-0000-0000-000000000301', true),
  ('00000000-0000-0000-0000-000000000705', '00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000302', true),
  ('00000000-0000-0000-0000-000000000706', '00000000-0000-0000-0000-000000000606', '00000000-0000-0000-0000-000000000302', true),
  ('00000000-0000-0000-0000-000000000707', '00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000302', true),
  ('00000000-0000-0000-0000-000000000708', '00000000-0000-0000-0000-000000000608', '00000000-0000-0000-0000-000000000302', true),
  ('00000000-0000-0000-0000-000000000709', '00000000-0000-0000-0000-000000000609', '00000000-0000-0000-0000-000000000303', true),
  ('00000000-0000-0000-0000-000000000710', '00000000-0000-0000-0000-000000000610', '00000000-0000-0000-0000-000000000303', true),
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000303', true),
  ('00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000612', '00000000-0000-0000-0000-000000000301', true)
ON CONFLICT (product_id, display_group_id) DO NOTHING;

-- Store products (per-store price / stock / shelf) for the demo store
INSERT INTO public.store_products (
  id, store_id, product_id, retailer_sku, retailer_product_name,
  price, currency, stock_quantity, stock_status,
  aisle, bay, shelf, available_for_display, data_last_updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000601','TAB-CET-10',    'Cetirizine 10 mg Tablets',            3.49,'GBP',42,'in_stock',    '4','2','3', true, now()),
  ('00000000-0000-0000-0000-000000000802','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000602','TAB-LOR-10',    'Loratadine 10 mg Tablets',            2.99,'GBP',51,'in_stock',    '4','2','3', true, now()),
  ('00000000-0000-0000-0000-000000000803','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000603','TAB-CHL-4',     'Chlorphenamine 4 mg Tablets',         2.19,'GBP',22,'in_stock',    '4','2','2', true, now()),
  ('00000000-0000-0000-0000-000000000804','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000604','TAB-FEX-120',   'Fexofenadine 120 mg Tablets',         6.99,'GBP', 4,'low_stock',   '4','2','3', true, now()),
  ('00000000-0000-0000-0000-000000000805','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000605','NSP-BEC-50',    'Beclometasone Nasal Spray 50 mcg',    5.49,'GBP',18,'in_stock',    '4','3','1', true, now()),
  ('00000000-0000-0000-0000-000000000806','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000606','NSP-FLU-50',    'Fluticasone Nasal Spray 50 mcg',      6.29,'GBP',15,'in_stock',    '4','3','1', true, now()),
  ('00000000-0000-0000-0000-000000000807','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000607','NSP-SAL-100',   'Saline Nasal Spray',                  3.99,'GBP',30,'in_stock',    '4','3','2', true, now()),
  ('00000000-0000-0000-0000-000000000808','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000608','NSP-XYL-10',    'Xylometazoline Decongestant Spray',   3.29,'GBP',12,'in_stock',    '4','3','2', true, now()),
  ('00000000-0000-0000-0000-000000000809','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000609','EYE-SCG-2',     'Sodium Cromoglicate Eye Drops',       4.49,'GBP',24,'in_stock',    '5','1','2', true, now()),
  ('00000000-0000-0000-0000-000000000810','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000610','EYE-PF-10',     'Preservative-Free Allergy Eye Drops', 7.99,'GBP', 3,'low_stock',   '5','1','2', true, now()),
  ('00000000-0000-0000-0000-000000000811','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000611','EYE-AZE-5',     'Azelastine Eye Drops',                8.49,'GBP', 0,'ask_staff',   '5','1','3', true, now()),
  ('00000000-0000-0000-0000-000000000812','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000612','LIQ-CHILD-CET', 'Children''s Cetirizine Oral Solution', 5.99,'GBP',14,'in_stock',    '4','2','1', true, now())
ON CONFLICT (store_id, retailer_sku) DO NOTHING;

-- Initial approved catalogue version + snapshot + publication
INSERT INTO public.catalogue_versions (id, organisation_id, version_number, label, status, approved_at, frozen_at, notes)
VALUES (
  '00000000-0000-0000-0000-000000000901',
  '00000000-0000-0000-0000-000000000001',
  1,
  'Development seed v1',
  'approved',
  now(),
  now(),
  'Initial development catalogue seeded from finder-data.ts'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catalogue_version_items (
  catalogue_version_id, store_id, product_id, retailer_sku, retailer_product_name,
  price, currency, stock_quantity, stock_status, aisle, bay, shelf, available_for_display, snapshot_data
)
SELECT
  '00000000-0000-0000-0000-000000000901',
  sp.store_id, sp.product_id, sp.retailer_sku, sp.retailer_product_name,
  sp.price, sp.currency, sp.stock_quantity, sp.stock_status,
  sp.aisle, sp.bay, sp.shelf, sp.available_for_display,
  jsonb_build_object('seed', true, 'source', 'finder-data.ts')
FROM public.store_products sp
WHERE sp.store_id = '00000000-0000-0000-0000-000000000101'
ON CONFLICT (catalogue_version_id, store_id, product_id) DO NOTHING;

INSERT INTO public.catalogue_publications (id, store_id, catalogue_version_id, published_at, is_rollback, notes)
VALUES (
  '00000000-0000-0000-0000-000000000A01',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000901',
  now(),
  false,
  'Initial development publication'
) ON CONFLICT (id) DO NOTHING;

-- Seed audit event
INSERT INTO public.audit_events (organisation_id, store_id, event_type, entity_type, entity_id, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'catalogue.published',
  'catalogue_publication',
  '00000000-0000-0000-0000-000000000A01',
  jsonb_build_object('seed', true, 'version_number', 1)
);
