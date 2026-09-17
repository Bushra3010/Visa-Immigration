-- =====================================================================
-- Visa, Immigration & Travel Platform — core schema
-- PRD refs: §6 Immigration, §7 Travel, §8 Admin, §9 Roles, §12.3 Security
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum (
  'super_admin', 'immigration_admin', 'counsellor', 'documentation',
  'travel_admin', 'finance', 'customer'
);

create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'documents_pending', 'consultation_scheduled',
  'application_in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'closed'
);

create type public.lead_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.eligibility_status as enum ('not_assessed', 'likely_eligible', 'needs_review', 'not_eligible');

create type public.application_status as enum (
  'enquiry_submitted', 'eligibility_checked', 'counsellor_assigned', 'documents_submitted',
  'application_prepared', 'application_submitted', 'under_processing',
  'approved', 'rejected', 'withdrawn'
);

create type public.document_status as enum (
  'requested', 'uploaded', 'under_review', 'approved', 'rejected', 'reupload_required'
);

create type public.consultation_type as enum ('phone', 'video', 'office');
create type public.consultation_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

create type public.booking_status as enum (
  'pending_payment', 'payment_received', 'booking_requested', 'confirmed',
  'failed', 'cancellation_requested', 'cancelled'
);
create type public.refund_status as enum ('none', 'requested', 'processing', 'refunded', 'rejected');

create type public.payment_status as enum ('created', 'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type public.payment_service as enum ('consultation', 'immigration_service', 'flight', 'hotel', 'package', 'other');

create type public.markup_type as enum ('fixed', 'percentage');
create type public.travel_product as enum ('flight', 'hotel', 'package');
create type public.supplier_environment as enum ('sandbox', 'production');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Human-readable IDs, e.g. LD-000042
create sequence public.lead_code_seq;
create sequence public.application_code_seq;
create sequence public.travel_booking_code_seq;
create sequence public.payment_code_seq;
create sequence public.consultation_code_seq;

-- ---------------------------------------------------------------------
-- Profiles & staff
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  mobile text,
  date_of_birth date,
  country_of_residence text,
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  email_verified_at timestamptz,
  mobile_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role lookup used by RLS. SECURITY DEFINER avoids recursive RLS on profiles.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = any(roles), false)
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() <> 'customer', false)
$$;

-- Create a profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, mobile)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'mobile'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only super admins may change role / active flag
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and auth.uid() is not null
     and not public.has_role(array['super_admin']::public.app_role[]) then
    raise exception 'Only a super admin can change role or account status';
  end if;
  return new;
end $$;
create trigger profiles_guard_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

create table public.counsellors (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  countries text[] not null default '{}',        -- country slugs
  visa_categories text[] not null default '{}',  -- visa category slugs
  locations text[] not null default '{}',        -- lead locations served
  is_available boolean not null default true,
  max_active_leads int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger counsellors_updated_at before update on public.counsellors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- CMS (§8.10)
-- ---------------------------------------------------------------------
create table public.countries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text,
  summary text,
  content jsonb not null default '{}',   -- structured sections per §6.1
  seo jsonb not null default '{}',       -- title, description, keywords, og_image, canonical
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visa_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visa_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  country_id uuid not null references public.countries (id) on delete restrict,
  category_id uuid not null references public.visa_categories (id) on delete restrict,
  title text not null,
  summary text,
  content jsonb not null default '{}',   -- structured sections per §6.2
  seo jsonb not null default '{}',
  service_fee numeric(12, 2),
  currency text not null default 'INR',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  country_id uuid references public.countries (id) on delete cascade,
  visa_service_id uuid references public.visa_services (id) on delete cascade,
  topic text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_image text,
  author_id uuid references public.profiles (id) on delete set null,
  seo jsonb not null default '{}',
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  quote text not null,
  country_slug text,
  visa_type text,
  rating int check (rating between 1 and 5),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null,               -- e.g. 'home_hero', 'offers'
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create trigger countries_updated_at before update on public.countries for each row execute function public.set_updated_at();
create trigger visa_categories_updated_at before update on public.visa_categories for each row execute function public.set_updated_at();
create trigger visa_services_updated_at before update on public.visa_services for each row execute function public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();
create trigger blog_posts_updated_at before update on public.blog_posts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Leads, consultations, applications (§6.4–6.10)
-- ---------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('LD-' || lpad(nextval('public.lead_code_seq')::text, 6, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  mobile text not null,
  country_of_residence text,
  destination_country text,      -- country slug
  visa_type text,                -- visa category slug
  eligibility_status public.eligibility_status not null default 'not_assessed',
  eligibility_score int,
  source text not null default 'website',   -- eligibility_form, consultation, enquiry, ...
  assessment jsonb not null default '{}',   -- full 7-step payload
  assigned_counsellor_id uuid references public.profiles (id) on delete set null,
  status public.lead_status not null default 'new',
  priority public.lead_priority not null default 'medium',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_assigned_idx on public.leads (assigned_counsellor_id);
create index leads_status_idx on public.leads (status);
create index leads_email_idx on public.leads (lower(email));
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null,             -- note, call, email, whatsapp, status_change, assignment
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CN-' || lpad(nextval('public.consultation_code_seq')::text, 6, '0')),
  lead_id uuid references public.leads (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  counsellor_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  mobile text not null,
  destination_country text,
  visa_type text,
  preferred_at timestamptz not null,
  consultation_type public.consultation_type not null,
  status public.consultation_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger consultations_updated_at before update on public.consultations for each row execute function public.set_updated_at();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('APP-' || lpad(nextval('public.application_code_seq')::text, 6, '0')),
  user_id uuid not null references public.profiles (id) on delete restrict,
  lead_id uuid references public.leads (id) on delete set null,
  counsellor_id uuid references public.profiles (id) on delete set null,
  destination_country text not null,
  visa_service_slug text,
  status public.application_status not null default 'enquiry_submitted',
  next_action text,
  counsellor_remarks text,
  decision_at timestamptz,
  ready_to_travel boolean not null default false,   -- drives §7.4 travel prompt
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index applications_user_idx on public.applications (user_id);
create index applications_counsellor_idx on public.applications (counsellor_id);
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  status public.application_status,
  title text not null,
  body text,
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,          -- passport, photograph, education_certificate, ...
  label text,
  status public.document_status not null default 'requested',
  storage_path text,               -- path inside the private 'documents' bucket
  mime_type text,
  size_bytes bigint,
  requested_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_user_idx on public.documents (user_id);
create index documents_application_idx on public.documents (application_id);
create trigger documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

create table public.document_remarks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Travel (§7, §8.4–8.6, §8.8)
-- ---------------------------------------------------------------------
create table public.supplier_configs (
  id uuid primary key default gen_random_uuid(),
  product public.travel_product not null,
  provider text not null,               -- 'mock', 'tbo', 'amadeus', 'duffel', 'hotelbeds', ...
  environment public.supplier_environment not null default 'sandbox',
  is_active boolean not null default false,
  priority int not null default 0,
  -- Non-secret settings only. Credentials live in server env vars (§8.5, §12.1).
  settings jsonb not null default '{}',
  credentials_env_prefix text,          -- e.g. 'SUPPLIER_TBO' → SUPPLIER_TBO_API_KEY
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product, provider, environment)
);
create trigger supplier_configs_updated_at before update on public.supplier_configs for each row execute function public.set_updated_at();

create table public.markup_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product public.travel_product not null,
  markup_type public.markup_type not null,
  value numeric(12, 2) not null,         -- amount or percent; negative = promotional discount
  -- Optional scoping; null = applies to all
  destination_country text,              -- ISO country code
  airline_code text,
  hotel_star_rating int,
  supplier text,
  is_promotional boolean not null default false,
  priority int not null default 0,       -- higher wins among same scope
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger markup_rules_updated_at before update on public.markup_rules for each row execute function public.set_updated_at();

-- Groups flight + hotel under one Travel Booking ID (§7.3)
create table public.travel_bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('TRV-' || lpad(nextval('public.travel_booking_code_seq')::text, 6, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  contact_email text not null,
  contact_mobile text,
  total_amount numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  status public.booking_status not null default 'pending_payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger travel_bookings_updated_at before update on public.travel_bookings for each row execute function public.set_updated_at();

create table public.flight_bookings (
  id uuid primary key default gen_random_uuid(),
  travel_booking_id uuid not null references public.travel_bookings (id) on delete cascade,
  supplier text not null,
  supplier_booking_ref text,
  pnr text,
  ticket_status text not null default 'not_issued',
  ticket_numbers text[] not null default '{}',
  itinerary jsonb not null,            -- normalized offer snapshot at booking time
  travellers jsonb not null,           -- passport data: encrypt/limit access (§12.3)
  supplier_amount numeric(12, 2) not null,
  markup_amount numeric(12, 2) not null default 0,
  customer_amount numeric(12, 2) not null,
  currency text not null default 'INR',
  status public.booking_status not null default 'pending_payment',
  cancellation jsonb,                  -- supplier-returned eligibility/fee/refund (§8.8)
  refund_status public.refund_status not null default 'none',
  eticket_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger flight_bookings_updated_at before update on public.flight_bookings for each row execute function public.set_updated_at();

create table public.hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  travel_booking_id uuid not null references public.travel_bookings (id) on delete cascade,
  supplier text not null,
  supplier_booking_ref text,
  confirmation_number text,
  hotel jsonb not null,                -- hotel + room/rate snapshot
  guests jsonb not null,
  check_in date not null,
  check_out date not null,
  supplier_amount numeric(12, 2) not null,
  markup_amount numeric(12, 2) not null default 0,
  customer_amount numeric(12, 2) not null,
  currency text not null default 'INR',
  status public.booking_status not null default 'pending_payment',
  cancellation jsonb,
  refund_status public.refund_status not null default 'none',
  voucher_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger hotel_bookings_updated_at before update on public.hotel_bookings for each row execute function public.set_updated_at();

create table public.travel_requirements (   -- counsellor-created travel need (§7.4)
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  origin text,
  destination text,
  depart_on date,
  return_on date,
  needs_hotel boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.flight_search_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  supplier text not null,
  request jsonb not null,
  result_count int,
  duration_ms int,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Payments (§8.7)
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PAY-' || lpad(nextval('public.payment_code_seq')::text, 6, '0')),
  user_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  gateway text not null,
  gateway_order_id text,
  transaction_id text,
  status public.payment_status not null default 'created',
  service public.payment_service not null,
  travel_booking_id uuid references public.travel_bookings (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  consultation_id uuid references public.consultations (id) on delete set null,
  refund_status public.refund_status not null default 'none',
  refunded_amount numeric(12, 2) not null default 0,
  raw_gateway_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id);
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Messages, notifications, audit (§6.9, §8.9, §12.3)
-- ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_customer_idx on public.messages (customer_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'whatsapp')),
  template text not null,
  recipient text,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- =====================================================================
-- Row-Level Security (§9)
-- Server code using the service role bypasses RLS; everything a browser
-- session can reach is constrained here.
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.counsellors enable row level security;
alter table public.countries enable row level security;
alter table public.visa_categories enable row level security;
alter table public.visa_services enable row level security;
alter table public.faqs enable row level security;
alter table public.blog_posts enable row level security;
alter table public.testimonials enable row level security;
alter table public.banners enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.consultations enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.documents enable row level security;
alter table public.document_remarks enable row level security;
alter table public.supplier_configs enable row level security;
alter table public.markup_rules enable row level security;
alter table public.travel_bookings enable row level security;
alter table public.flight_bookings enable row level security;
alter table public.hotel_bookings enable row level security;
alter table public.travel_requirements enable row level security;
alter table public.flight_search_logs enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_read on public.profiles for select using (public.is_staff());
create policy profiles_admin_write on public.profiles for all
  using (public.has_role(array['super_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin']::public.app_role[]));

-- Counsellors
create policy counsellors_staff_read on public.counsellors for select using (public.is_staff());
create policy counsellors_admin_write on public.counsellors for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));

-- CMS: public reads published content; admins manage
create policy countries_public_read on public.countries for select using (is_published or public.is_staff());
create policy visa_categories_public_read on public.visa_categories for select using (is_published or public.is_staff());
create policy visa_services_public_read on public.visa_services for select using (is_published or public.is_staff());
create policy faqs_public_read on public.faqs for select using (is_published or public.is_staff());
create policy blog_posts_public_read on public.blog_posts for select using (is_published or public.is_staff());
create policy testimonials_public_read on public.testimonials for select using (is_published or public.is_staff());
create policy banners_public_read on public.banners for select using (is_published or public.is_staff());

create policy countries_cms_write on public.countries for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy visa_categories_cms_write on public.visa_categories for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy visa_services_cms_write on public.visa_services for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy faqs_cms_write on public.faqs for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy blog_posts_cms_write on public.blog_posts for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy testimonials_cms_write on public.testimonials for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy banners_cms_write on public.banners for all
  using (public.has_role(array['super_admin', 'immigration_admin', 'travel_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin', 'travel_admin']::public.app_role[]));

-- Leads: admins see all; counsellors only their assigned leads; customers their own.
-- Public lead creation goes through a validated server action (service role).
create policy leads_admin_all on public.leads for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy leads_counsellor_read on public.leads for select
  using (public.has_role(array['counsellor']::public.app_role[]) and assigned_counsellor_id = auth.uid());
create policy leads_counsellor_update on public.leads for update
  using (public.has_role(array['counsellor']::public.app_role[]) and assigned_counsellor_id = auth.uid())
  with check (assigned_counsellor_id = auth.uid());
create policy leads_customer_read on public.leads for select using (user_id = auth.uid());

create policy lead_activities_read on public.lead_activities for select using (
  public.has_role(array['super_admin', 'immigration_admin']::public.app_role[])
  or exists (select 1 from public.leads l where l.id = lead_id and l.assigned_counsellor_id = auth.uid())
);
create policy lead_activities_insert on public.lead_activities for insert with check (
  actor_id = auth.uid() and (
    public.has_role(array['super_admin', 'immigration_admin']::public.app_role[])
    or exists (select 1 from public.leads l where l.id = lead_id and l.assigned_counsellor_id = auth.uid())
  )
);

-- Consultations
create policy consultations_admin_all on public.consultations for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy consultations_counsellor on public.consultations for select using (counsellor_id = auth.uid());
create policy consultations_counsellor_update on public.consultations for update
  using (counsellor_id = auth.uid()) with check (counsellor_id = auth.uid());
create policy consultations_customer_read on public.consultations for select using (user_id = auth.uid());

-- Applications
create policy applications_admin_all on public.applications for all
  using (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy applications_documentation on public.applications for select
  using (public.has_role(array['documentation']::public.app_role[]));
create policy applications_documentation_update on public.applications for update
  using (public.has_role(array['documentation']::public.app_role[]))
  with check (public.has_role(array['documentation']::public.app_role[]));
create policy applications_counsellor on public.applications for select using (counsellor_id = auth.uid());
create policy applications_counsellor_update on public.applications for update
  using (counsellor_id = auth.uid()) with check (counsellor_id = auth.uid());
create policy applications_customer_read on public.applications for select using (user_id = auth.uid());
create policy applications_travel_read on public.applications for select
  using (public.has_role(array['travel_admin']::public.app_role[]) and ready_to_travel);

create policy application_events_read on public.application_events for select using (
  public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[])
  or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
  or (visible_to_customer and exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid()))
);
create policy application_events_insert on public.application_events for insert with check (
  actor_id = auth.uid() and (
    public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[])
    or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
  )
);

-- Documents
create policy documents_staff_all on public.documents for all
  using (public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[]));
create policy documents_counsellor on public.documents for select using (
  exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
);
create policy documents_counsellor_request on public.documents for insert with check (
  exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
);
create policy documents_customer_read on public.documents for select using (user_id = auth.uid());
create policy documents_customer_insert on public.documents for insert
  with check (user_id = auth.uid() and status = 'uploaded');
-- Customers may only (re)upload against requested / re-upload-required slots
create policy documents_customer_upload on public.documents for update
  using (user_id = auth.uid() and status in ('requested', 'reupload_required', 'rejected'))
  with check (user_id = auth.uid() and status = 'uploaded');

create policy document_remarks_read on public.document_remarks for select using (
  exists (
    select 1 from public.documents d
    left join public.applications a on a.id = d.application_id
    where d.id = document_id and (
      d.user_id = auth.uid() or a.counsellor_id = auth.uid()
      or public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[])
    )
  )
);
create policy document_remarks_insert on public.document_remarks for insert with check (
  author_id = auth.uid() and exists (
    select 1 from public.documents d
    left join public.applications a on a.id = d.application_id
    where d.id = document_id and (
      a.counsellor_id = auth.uid()
      or public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[])
    )
  )
);

-- Supplier configs & markup: super admin writes; travel admin reads suppliers, manages markup
create policy supplier_configs_read on public.supplier_configs for select
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));
create policy supplier_configs_write on public.supplier_configs for all
  using (public.has_role(array['super_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin']::public.app_role[]));
create policy markup_rules_manage on public.markup_rules for all
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));
create policy markup_rules_finance_read on public.markup_rules for select
  using (public.has_role(array['finance']::public.app_role[]));

-- Travel bookings
create policy travel_bookings_staff on public.travel_bookings for all
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));
create policy travel_bookings_finance_read on public.travel_bookings for select
  using (public.has_role(array['finance']::public.app_role[]));
create policy travel_bookings_customer_read on public.travel_bookings for select using (user_id = auth.uid());

create policy flight_bookings_staff on public.flight_bookings for all
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));
create policy flight_bookings_finance_read on public.flight_bookings for select
  using (public.has_role(array['finance']::public.app_role[]));
create policy flight_bookings_customer_read on public.flight_bookings for select using (
  exists (select 1 from public.travel_bookings t where t.id = travel_booking_id and t.user_id = auth.uid())
);

create policy hotel_bookings_staff on public.hotel_bookings for all
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));
create policy hotel_bookings_finance_read on public.hotel_bookings for select
  using (public.has_role(array['finance']::public.app_role[]));
create policy hotel_bookings_customer_read on public.hotel_bookings for select using (
  exists (select 1 from public.travel_bookings t where t.id = travel_booking_id and t.user_id = auth.uid())
);

create policy travel_requirements_read on public.travel_requirements for select using (
  user_id = auth.uid()
  or public.has_role(array['super_admin', 'immigration_admin', 'travel_admin']::public.app_role[])
  or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
);
create policy travel_requirements_insert on public.travel_requirements for insert with check (
  created_by = auth.uid() and (
    public.has_role(array['super_admin', 'immigration_admin', 'travel_admin']::public.app_role[])
    or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
  )
);

create policy flight_search_logs_read on public.flight_search_logs for select
  using (public.has_role(array['super_admin', 'travel_admin']::public.app_role[]));

-- Payments
create policy payments_finance_all on public.payments for all
  using (public.has_role(array['super_admin', 'finance']::public.app_role[]))
  with check (public.has_role(array['super_admin', 'finance']::public.app_role[]));
create policy payments_travel_read on public.payments for select
  using (public.has_role(array['travel_admin']::public.app_role[]) and service in ('flight', 'hotel', 'package'));
create policy payments_customer_read on public.payments for select using (user_id = auth.uid());

-- Messages
create policy messages_read on public.messages for select using (
  customer_id = auth.uid()
  or public.has_role(array['super_admin', 'immigration_admin']::public.app_role[])
  or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
);
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid() and (
    customer_id = auth.uid()
    or public.has_role(array['super_admin', 'immigration_admin']::public.app_role[])
    or exists (select 1 from public.applications a where a.id = application_id and a.counsellor_id = auth.uid())
  )
);

-- Notifications
create policy notifications_self_read on public.notifications for select using (user_id = auth.uid() and channel = 'in_app');
create policy notifications_self_mark_read on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_read on public.notifications for select
  using (public.has_role(array['super_admin']::public.app_role[]));

-- Audit logs: read-only for super admins; written by server (service role)
create policy audit_logs_admin_read on public.audit_logs for select
  using (public.has_role(array['super_admin']::public.app_role[]));

-- =====================================================================
-- Storage: private bucket for customer documents (§6.8, §12.3)
-- Object path convention: <user_id>/<document_id>/<filename>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy documents_bucket_owner_read on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy documents_bucket_owner_upload on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy documents_bucket_staff_read on storage.objects for select
  using (bucket_id = 'documents' and public.has_role(array['super_admin', 'immigration_admin', 'documentation']::public.app_role[]));
create policy documents_bucket_counsellor_read on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.applications a
      where a.user_id::text = (storage.foldername(name))[1] and a.counsellor_id = auth.uid()
    )
  );
