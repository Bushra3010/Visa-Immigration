-- New office address for receipts; only replaces the original seeded address,
-- so an address already changed in CRM → Settings is left alone.
update public.crm_settings
set value = jsonb_set(value, '{address}', to_jsonb('B-7/172, Ground Floor, Rohini Sector 17, New Delhi 110089, India'::text))
where key = 'company'
  and value->>'address' = 'A-7/206-207, 3rd Floor, Rohini Sector 17, New Delhi 110089, India';
