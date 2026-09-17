-- Development seed data. Launch lists of countries / visa categories are an
-- open business decision (PRD §17); these are placeholders matching §5.2.

insert into public.visa_categories (slug, name, sort_order) values
  ('student', 'Student Visa', 1),
  ('work', 'Work Visa', 2),
  ('skilled', 'Skilled Immigration', 3),
  ('visitor', 'Visitor Visa', 4),
  ('business', 'Business Immigration', 5),
  ('family', 'Family Immigration', 6),
  ('permanent-residency', 'Permanent Residency', 7),
  ('citizenship', 'Citizenship', 8),
  ('dependent', 'Dependent Visa', 9),
  ('job-seeker', 'Job Seeker Visa', 10)
on conflict (slug) do nothing;

insert into public.countries (slug, name, region, sort_order, is_published) values
  ('canada', 'Canada', 'North America', 1, true),
  ('australia', 'Australia', 'Oceania', 2, true),
  ('uk', 'United Kingdom', 'Europe', 3, true),
  ('usa', 'United States', 'North America', 4, true),
  ('germany', 'Germany', 'Europe', 5, true),
  ('new-zealand', 'New Zealand', 'Oceania', 6, true),
  ('uae', 'Dubai / UAE', 'Middle East', 7, true),
  ('europe', 'Europe (Schengen)', 'Europe', 8, true)
on conflict (slug) do nothing;

insert into public.supplier_configs (product, provider, environment, is_active, priority, settings) values
  ('flight', 'mock', 'sandbox', true, 0, '{"note": "Replace with contracted supplier in Phase 2"}'),
  ('hotel', 'mock', 'sandbox', true, 0, '{"note": "Replace with contracted supplier in Phase 2"}')
on conflict do nothing;

insert into public.markup_rules (name, product, markup_type, value, priority) values
  ('Default flight markup', 'flight', 'fixed', 1000, 0),
  ('Default hotel markup', 'hotel', 'percentage', 8, 0)
on conflict do nothing;
