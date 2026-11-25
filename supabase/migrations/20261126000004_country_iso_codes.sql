-- The seed created countries without flag codes; fill them in where still empty.
update public.countries c
set iso_code = v.iso_code
from (values
  ('canada', 'CA'),
  ('australia', 'AU'),
  ('uk', 'GB'),
  ('usa', 'US'),
  ('germany', 'DE'),
  ('new-zealand', 'NZ'),
  ('uae', 'AE'),
  ('europe', 'EU')
) as v(slug, iso_code)
where c.slug = v.slug and c.iso_code is null;
