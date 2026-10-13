-- CMS editing (PRD §8.10): columns the public pages need that the core schema
-- left out. Page copy itself lives in the existing `content` / `seo` jsonb.

alter table public.countries add column if not exists iso_code text check (iso_code ~ '^[A-Z]{2}$');
alter table public.visa_categories add column if not exists short_name text;
alter table public.visa_services add column if not exists sort_order int not null default 0;
