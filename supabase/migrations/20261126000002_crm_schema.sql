-- =====================================================================
-- Visa Consultancy CRM (/crm)
--
-- Reuses Supabase Auth + public.profiles for staff accounts, public.leads
-- (the website funnel writes here, so web leads land in the CRM pipeline),
-- public.lead_activities for notes/calls/WhatsApp logs and public.audit_logs
-- for the audit trail. Everything else is CRM-specific and prefixed crm_.
--
-- Authorization model
--   crm_roles            role + record visibility (all | team | own)
--   crm_permissions      catalogue of "<module>.<action>" keys
--   crm_role_permissions grants
--   crm_can(key)         used by every RLS policy below
--   crm_in_scope(owner)  record visibility (owner = assignee / consultant)
-- The service-role client bypasses all of this and is only used server-side
-- after the same checks (user creation, signed file URLs, audit writes).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------
create table public.crm_roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (length(name) between 2 and 60),
  description text,
  data_scope text not null default 'own' check (data_scope in ('all', 'team', 'own')),
  is_system boolean not null default false,
  is_super boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger crm_roles_updated_at before update on public.crm_roles for each row execute function public.set_updated_at();

create table public.crm_permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module text not null,
  action text not null,
  label text not null,
  sort_order int not null default 0,
  unique (module, action)
);

create table public.crm_role_permissions (
  role_id uuid not null references public.crm_roles (id) on delete cascade,
  permission text not null references public.crm_permissions (key) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (role_id, permission)
);

-- ---------------------------------------------------------------------
-- Staff fields on profiles
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists crm_role_id uuid references public.crm_roles (id) on delete set null,
  add column if not exists crm_active boolean not null default true,
  add column if not exists crm_manager_id uuid references public.profiles (id) on delete set null,
  add column if not exists employee_id text,
  add column if not exists crm_username text,
  add column if not exists designation text,
  add column if not exists department text,
  add column if not exists joining_date date,
  add column if not exists avatar_url text,
  add column if not exists crm_last_login_at timestamptz;

alter table public.profiles add constraint profiles_crm_username_format check (crm_username is null or crm_username ~ '^[a-z0-9._-]{3,40}$');
create unique index profiles_crm_username_key on public.profiles (crm_username) where crm_username is not null;
create unique index profiles_employee_id_key on public.profiles (lower(employee_id)) where employee_id is not null;
create index profiles_crm_role_idx on public.profiles (crm_role_id) where crm_role_id is not null;
create index profiles_crm_manager_idx on public.profiles (crm_manager_id) where crm_manager_id is not null;

-- ---------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER: read roles without recursive RLS)
-- ---------------------------------------------------------------------
create or replace function public.crm_current_role()
returns uuid language sql stable security definer set search_path = public as $$
  select p.crm_role_id from public.profiles p
  where p.id = auth.uid() and p.is_active and p.crm_active
$$;

create or replace function public.crm_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select public.crm_current_role() is not null
$$;

create or replace function public.crm_is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select r.is_super from public.crm_roles r where r.id = public.crm_current_role()), false)
$$;

create or replace function public.crm_can(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select r.is_super or exists (
      select 1 from public.crm_role_permissions rp where rp.role_id = r.id and rp.permission = p_permission
    )
    from public.crm_roles r where r.id = public.crm_current_role()
  ), false)
$$;

create or replace function public.crm_scope()
returns text language sql stable security definer set search_path = public as $$
  select case when r.is_super then 'all' else r.data_scope end
  from public.crm_roles r where r.id = public.crm_current_role()
$$;

-- Is a record owned by p_owner visible under the caller's data scope?
create or replace function public.crm_in_scope(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case public.crm_scope()
    when 'all' then true
    when 'team' then p_owner is not null and (
      p_owner = auth.uid()
      or exists (select 1 from public.profiles t where t.id = p_owner and t.crm_manager_id = auth.uid())
    )
    when 'own' then p_owner is not null and p_owner = auth.uid()
    else false
  end
$$;

-- ---------------------------------------------------------------------
-- Lead pipeline stages
-- ---------------------------------------------------------------------
create table public.crm_lead_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (length(name) between 1 and 60),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  is_default boolean not null default false,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  is_active boolean not null default true,
  legacy_status public.lead_status,   -- keeps leads.status (used by /admin) in sync
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (is_won and is_lost))
);
create unique index crm_lead_stages_one_default on public.crm_lead_stages ((true)) where is_default;
create trigger crm_lead_stages_updated_at before update on public.crm_lead_stages for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Leads: CRM fields on the existing table
-- ---------------------------------------------------------------------
alter table public.leads alter column email drop not null;
alter table public.leads
  add column if not exists whatsapp text,
  add column if not exists date_of_birth date,
  add column if not exists gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column if not exists nationality text,
  add column if not exists current_city text,
  add column if not exists current_country text,
  add column if not exists purpose_of_travel text,
  add column if not exists preferred_travel_date date,
  add column if not exists passport_available boolean,
  add column if not exists passport_number text,
  add column if not exists passport_expiry date,
  add column if not exists previous_visa_history text,
  add column if not exists visa_rejection_history text,
  add column if not exists education_employment text,
  add column if not exists additional_requirements text,
  add column if not exists campaign_name text,
  add column if not exists reference text,
  add column if not exists temperature text not null default 'warm' check (temperature in ('hot', 'warm', 'cold')),
  add column if not exists stage_id uuid references public.crm_lead_stages (id) on delete restrict,
  add column if not exists stage_changed_at timestamptz,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists converted_at timestamptz,
  add column if not exists lost_reason text,
  add column if not exists custom_fields jsonb not null default '{}',
  add column if not exists mobile_digits text generated always as (right(regexp_replace(mobile, '\D', '', 'g'), 10)) stored;

create index if not exists leads_stage_idx on public.leads (stage_id);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_at) where next_follow_up_at is not null;
create index if not exists leads_mobile_digits_idx on public.leads (mobile_digits);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_converted_idx on public.leads (converted_at) where converted_at is not null;
create index if not exists leads_name_trgm on public.leads using gin (full_name extensions.gin_trgm_ops);
create index if not exists leads_email_trgm on public.leads using gin (email extensions.gin_trgm_ops);
create index if not exists leads_code_trgm on public.leads using gin (code extensions.gin_trgm_ops);

-- Stage <-> legacy status sync, both directions.
create or replace function public.crm_leads_sync_stage()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status public.lead_status;
  v_stage uuid;
begin
  if tg_op = 'INSERT' then
    if new.stage_id is null then
      select id into v_stage from public.crm_lead_stages where is_active and legacy_status = new.status order by sort_order limit 1;
      if v_stage is null then
        select id into v_stage from public.crm_lead_stages where is_default limit 1;
      end if;
      new.stage_id := v_stage;
    else
      select legacy_status into v_status from public.crm_lead_stages where id = new.stage_id;
      if v_status is not null then new.status := v_status; end if;
    end if;
    new.stage_changed_at := now();
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    select legacy_status into v_status from public.crm_lead_stages where id = new.stage_id;
    if v_status is not null then new.status := v_status; end if;
    new.stage_changed_at := now();
  elsif new.status is distinct from old.status then
    -- Status changed from the /admin panel: follow it in the pipeline.
    if not exists (select 1 from public.crm_lead_stages where id = new.stage_id and legacy_status = new.status) then
      select id into v_stage from public.crm_lead_stages where is_active and legacy_status = new.status order by sort_order limit 1;
      if v_stage is not null then
        new.stage_id := v_stage;
        new.stage_changed_at := now();
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger leads_crm_sync_stage before insert or update on public.leads
  for each row execute function public.crm_leads_sync_stage();

-- Assignment permissions, enforced in the database for CRM sessions.
create or replace function public.crm_leads_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null
     or public.crm_current_role() is null
     or public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.assigned_counsellor_id is not null and new.assigned_counsellor_id <> auth.uid() and not public.crm_can('leads.assign') then
      raise exception 'You do not have permission to assign leads' using errcode = '42501';
    end if;
  elsif new.assigned_counsellor_id is distinct from old.assigned_counsellor_id then
    if old.assigned_counsellor_id is null and not (public.crm_can('leads.assign') or public.crm_can('leads.reassign')) then
      raise exception 'You do not have permission to assign leads' using errcode = '42501';
    end if;
    if old.assigned_counsellor_id is not null and not public.crm_can('leads.reassign') then
      raise exception 'You do not have permission to reassign leads' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger leads_crm_guard before insert or update on public.leads
  for each row execute function public.crm_leads_guard();

-- ---------------------------------------------------------------------
-- Lead history & assignments
-- ---------------------------------------------------------------------
create table public.crm_lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event text not null check (event in ('created', 'stage_changed', 'updated', 'assigned', 'converted', 'follow_up', 'document')),
  from_stage_id uuid references public.crm_lead_stages (id) on delete set null,
  to_stage_id uuid references public.crm_lead_stages (id) on delete set null,
  changes jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index crm_lead_history_lead_idx on public.crm_lead_history (lead_id, created_at desc);
create index crm_lead_history_created_idx on public.crm_lead_history (created_at desc);

create table public.crm_lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_user_id uuid references public.profiles (id) on delete set null,
  to_user_id uuid references public.profiles (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index crm_lead_assignments_lead_idx on public.crm_lead_assignments (lead_id, created_at desc);
create index crm_lead_assignments_to_idx on public.crm_lead_assignments (to_user_id, created_at desc);

create or replace function public.crm_leads_track()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_lead_history (lead_id, actor_id, event, to_stage_id, note)
    values (new.id, auth.uid(), 'created', new.stage_id, 'Lead created (' || coalesce(new.source, 'unknown') || ')');
    if new.assigned_counsellor_id is not null then
      insert into public.crm_lead_assignments (lead_id, from_user_id, to_user_id, assigned_by)
      values (new.id, null, new.assigned_counsellor_id, auth.uid());
    end if;
    return new;
  end if;
  if new.stage_id is distinct from old.stage_id then
    insert into public.crm_lead_history (lead_id, actor_id, event, from_stage_id, to_stage_id)
    values (new.id, auth.uid(), 'stage_changed', old.stage_id, new.stage_id);
  end if;
  if new.assigned_counsellor_id is distinct from old.assigned_counsellor_id then
    insert into public.crm_lead_assignments (lead_id, from_user_id, to_user_id, assigned_by)
    values (new.id, old.assigned_counsellor_id, new.assigned_counsellor_id, auth.uid());
    insert into public.crm_lead_history (lead_id, actor_id, event, changes)
    values (new.id, auth.uid(), 'assigned', jsonb_build_object('from', old.assigned_counsellor_id, 'to', new.assigned_counsellor_id));
  end if;
  return new;
end $$;

create trigger leads_crm_track after insert or update on public.leads
  for each row execute function public.crm_leads_track();

-- Lead visibility for child tables (notes, documents, follow-ups).
create or replace function public.crm_lead_visible(p_lead uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead and (public.crm_in_scope(l.assigned_counsellor_id) or l.created_by = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------
-- Converted customers
-- ---------------------------------------------------------------------
create sequence public.crm_customer_code_seq;
create table public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CUS-' || lpad(nextval('public.crm_customer_code_seq')::text, 6, '0')),
  lead_id uuid not null unique references public.leads (id) on delete restrict,
  lead_code text not null,
  full_name text not null,
  email text,
  mobile text,
  whatsapp text,
  address text,
  visa_category text,
  destination_country text,
  consultant_id uuid references public.profiles (id) on delete set null,
  application_ref text,
  converted_at timestamptz not null default now(),
  package_amount numeric(12, 2) not null default 0 check (package_amount >= 0),
  amount_received numeric(12, 2) not null default 0,
  balance numeric(12, 2) generated always as (package_amount - amount_received) stored,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'overpaid')),
  application_status text,
  notes text,
  custom_fields jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crm_customers_consultant_idx on public.crm_customers (consultant_id);
create index crm_customers_converted_idx on public.crm_customers (converted_at desc);
create index crm_customers_payment_status_idx on public.crm_customers (payment_status);
create index crm_customers_name_trgm on public.crm_customers using gin (full_name extensions.gin_trgm_ops);
create trigger crm_customers_updated_at before update on public.crm_customers for each row execute function public.set_updated_at();

create or replace function public.crm_customers_payment_status()
returns trigger language plpgsql as $$
begin
  new.payment_status := case
    when new.amount_received <= 0 then 'unpaid'
    when new.amount_received < new.package_amount then 'partial'
    when new.amount_received = new.package_amount then 'paid'
    else 'overpaid'
  end;
  return new;
end $$;
create trigger crm_customers_status before insert or update of amount_received, package_amount on public.crm_customers
  for each row execute function public.crm_customers_payment_status();

create or replace function public.crm_customer_visible(p_customer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crm_customers c
    left join public.leads l on l.id = c.lead_id
    where c.id = p_customer and (
      public.crm_in_scope(c.consultant_id)
      or c.created_by = auth.uid()
      or (l.id is not null and public.crm_in_scope(l.assigned_counsellor_id))
    )
  )
$$;

-- ---------------------------------------------------------------------
-- Visa applications
-- ---------------------------------------------------------------------
create sequence public.crm_application_code_seq;
create table public.crm_applications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('VA-' || lpad(nextval('public.crm_application_code_seq')::text, 6, '0')),
  customer_id uuid not null references public.crm_customers (id) on delete restrict,
  lead_id uuid references public.leads (id) on delete set null,
  consultant_id uuid references public.profiles (id) on delete set null,
  visa_type text,
  destination_country text,
  passport_number text,
  passport_issue_date date,
  passport_expiry_date date,
  passport_issue_place text,
  embassy_name text,
  embassy_city text,
  embassy_reference text,
  submission_date date,
  appointment_at timestamptz,
  biometrics_date date,
  interview_at timestamptz,
  decision_date date,
  visa_expiry_date date,
  status text not null default 'not_started',
  notes text,
  custom_fields jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crm_applications_customer_idx on public.crm_applications (customer_id);
create index crm_applications_status_idx on public.crm_applications (status);
create index crm_applications_consultant_idx on public.crm_applications (consultant_id);
create trigger crm_applications_updated_at before update on public.crm_applications for each row execute function public.set_updated_at();

create table public.crm_application_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.crm_applications (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index crm_application_history_app_idx on public.crm_application_history (application_id, created_at desc);

create or replace function public.crm_applications_track()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.crm_application_history (application_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), case when tg_op = 'UPDATE' then old.status end, new.status);
    -- Customer record shows the status of its most recently updated application.
    update public.crm_customers set application_status = new.status where id = new.customer_id;
  end if;
  return new;
end $$;
create trigger crm_applications_track after insert or update on public.crm_applications
  for each row execute function public.crm_applications_track();

create or replace function public.crm_application_visible(p_application uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crm_applications a
    where a.id = p_application and (
      public.crm_in_scope(a.consultant_id) or a.created_by = auth.uid() or public.crm_customer_visible(a.customer_id)
    )
  )
$$;

-- ---------------------------------------------------------------------
-- Follow-ups & tasks
-- ---------------------------------------------------------------------
create table public.crm_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  customer_id uuid references public.crm_customers (id) on delete cascade,
  assigned_to uuid not null references public.profiles (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  type text not null default 'call' check (type in ('call', 'whatsapp', 'email', 'meeting', 'task', 'other')),
  title text not null check (length(title) between 1 and 200),
  notes text,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'missed', 'cancelled')),
  outcome text,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lead_id is not null or customer_id is not null)
);
create index crm_follow_ups_assignee_idx on public.crm_follow_ups (assigned_to, status, due_at);
create index crm_follow_ups_due_idx on public.crm_follow_ups (status, due_at);
create index crm_follow_ups_lead_idx on public.crm_follow_ups (lead_id);
create index crm_follow_ups_customer_idx on public.crm_follow_ups (customer_id);
create trigger crm_follow_ups_updated_at before update on public.crm_follow_ups for each row execute function public.set_updated_at();

-- Keep leads.next_follow_up_at = earliest pending follow-up.
create or replace function public.crm_follow_ups_sync_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_lead uuid := case when tg_op = 'DELETE' then old.lead_id else new.lead_id end;
begin
  if tg_op = 'UPDATE' and old.lead_id is distinct from new.lead_id and old.lead_id is not null then
    update public.leads set next_follow_up_at = (
      select min(due_at) from public.crm_follow_ups where lead_id = old.lead_id and status = 'pending'
    ) where id = old.lead_id;
  end if;
  if v_lead is not null then
    update public.leads set next_follow_up_at = (
      select min(due_at) from public.crm_follow_ups where lead_id = v_lead and status = 'pending'
    ) where id = v_lead;
  end if;
  return null;
end $$;
create trigger crm_follow_ups_sync after insert or update or delete on public.crm_follow_ups
  for each row execute function public.crm_follow_ups_sync_lead();

-- ---------------------------------------------------------------------
-- Documents (files live in the private crm-documents bucket)
-- ---------------------------------------------------------------------
create table public.crm_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  customer_id uuid references public.crm_customers (id) on delete cascade,
  application_id uuid references public.crm_applications (id) on delete set null,
  doc_type text not null,
  title text,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  remarks text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lead_id is not null or customer_id is not null)
);
create index crm_documents_lead_idx on public.crm_documents (lead_id);
create index crm_documents_customer_idx on public.crm_documents (customer_id);
create index crm_documents_application_idx on public.crm_documents (application_id);
create index crm_documents_status_idx on public.crm_documents (status, created_at desc);
create trigger crm_documents_updated_at before update on public.crm_documents for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Customer payments (separate from gateway public.payments and from expenses)
-- ---------------------------------------------------------------------
create sequence public.crm_receipt_seq;
create table public.crm_payments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('RCPT-' || lpad(nextval('public.crm_receipt_seq')::text, 6, '0')),
  customer_id uuid not null references public.crm_customers (id) on delete restrict,
  application_id uuid references public.crm_applications (id) on delete set null,
  payment_type text not null check (payment_type in ('advance', 'installment', 'final', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  payment_mode text not null,
  transaction_ref text,
  proof_path text,
  notes text,
  received_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index crm_payments_txn_unique on public.crm_payments (customer_id, lower(transaction_ref)) where transaction_ref is not null;
create index crm_payments_customer_idx on public.crm_payments (customer_id, paid_on desc);
create index crm_payments_paid_on_idx on public.crm_payments (paid_on desc);
create trigger crm_payments_updated_at before update on public.crm_payments for each row execute function public.set_updated_at();

create or replace function public.crm_payments_sync_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.crm_customers set amount_received = coalesce((select sum(amount) from public.crm_payments where customer_id = old.customer_id), 0)
    where id = old.customer_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.crm_customers set amount_received = coalesce((select sum(amount) from public.crm_payments where customer_id = new.customer_id), 0)
    where id = new.customer_id;
  end if;
  return null;
end $$;
create trigger crm_payments_sync after insert or update or delete on public.crm_payments
  for each row execute function public.crm_payments_sync_customer();

-- ---------------------------------------------------------------------
-- Expenses + approval trail
-- ---------------------------------------------------------------------
create sequence public.crm_expense_code_seq;
create table public.crm_expenses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('EXP-' || lpad(nextval('public.crm_expense_code_seq')::text, 6, '0')),
  title text not null check (length(title) between 2 and 200),
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null,
  payment_mode text,
  vendor text,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references public.crm_customers (id) on delete set null,
  application_id uuid references public.crm_applications (id) on delete set null,
  bill_path text,
  description text,
  added_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  approval_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index crm_expenses_date_idx on public.crm_expenses (expense_date desc);
create index crm_expenses_status_idx on public.crm_expenses (status);
create index crm_expenses_category_idx on public.crm_expenses (category);
create index crm_expenses_added_by_idx on public.crm_expenses (added_by);
create index crm_expenses_customer_idx on public.crm_expenses (customer_id) where customer_id is not null;
create trigger crm_expenses_updated_at before update on public.crm_expenses for each row execute function public.set_updated_at();

create table public.crm_expense_approvals (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.crm_expenses (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected', 'pending')),
  remarks text,
  created_at timestamptz not null default now()
);
create index crm_expense_approvals_expense_idx on public.crm_expense_approvals (expense_id, created_at desc);

-- Only approvers may change approval status or touch an approved expense.
create or replace function public.crm_expenses_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.crm_can('expenses.approve') then
    if tg_op = 'INSERT' and new.status <> 'pending' then
      raise exception 'New expenses start as pending' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or old.status = 'approved') then
      raise exception 'Only approvers can change an approved expense or its status' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.approved_by := case when new.status = 'pending' then null else auth.uid() end;
    new.approved_at := case when new.status = 'pending' then null else now() end;
  end if;
  return new;
end $$;
create trigger crm_expenses_guard before insert or update on public.crm_expenses
  for each row execute function public.crm_expenses_guard();

create or replace function public.crm_expenses_track()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.crm_expense_approvals (expense_id, actor_id, decision, remarks)
    values (new.id, auth.uid(), new.status, new.approval_remarks);
  end if;
  return null;
end $$;
create trigger crm_expenses_track after update on public.crm_expenses
  for each row execute function public.crm_expenses_track();

-- ---------------------------------------------------------------------
-- Settings, option lists, custom fields
-- ---------------------------------------------------------------------
create table public.crm_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger crm_settings_updated_at before update on public.crm_settings for each row execute function public.set_updated_at();

create table public.crm_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lead_source', 'visa_category', 'destination_country', 'application_status', 'expense_category', 'payment_mode', 'document_type')),
  key text not null check (key ~ '^[a-z0-9][a-z0-9_-]{0,59}$'),
  label text not null check (length(label) between 1 and 80),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, key)
);
create index crm_options_kind_idx on public.crm_options (kind, sort_order);

create table public.crm_custom_fields (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('lead', 'customer', 'application')),
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (length(label) between 1 and 80),
  field_type text not null check (field_type in ('text', 'textarea', 'number', 'date', 'select', 'checkbox')),
  options text[] not null default '{}',
  is_required boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entity, key)
);

-- ---------------------------------------------------------------------
-- Audit trail: reuse public.audit_logs
-- ---------------------------------------------------------------------
alter table public.audit_logs
  add column if not exists module text,
  add column if not exists user_agent text;
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_module_idx on public.audit_logs (module, created_at desc);

-- ---------------------------------------------------------------------
-- Profile privilege guard: CRM staff fields can't be self-edited
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;   -- service role (validated server code)
  end if;
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.has_role(array['super_admin']::public.app_role[]) then
    raise exception 'Only a super admin can change role or account status';
  end if;
  if (new.crm_role_id is distinct from old.crm_role_id
      or new.crm_active is distinct from old.crm_active
      or new.crm_manager_id is distinct from old.crm_manager_id
      or new.employee_id is distinct from old.employee_id
      or new.crm_username is distinct from old.crm_username
      or new.designation is distinct from old.designation
      or new.department is distinct from old.department
      or new.joining_date is distinct from old.joining_date)
     and not public.crm_can('users.edit') then
    raise exception 'Only CRM administrators can change staff details' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Lead conversion (atomic)
-- ---------------------------------------------------------------------
create or replace function public.crm_convert_lead(
  p_lead_id uuid,
  p_package_amount numeric,
  p_consultant_id uuid default null,
  p_visa_category text default null,
  p_destination_country text default null,
  p_application_ref text default null,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  l public.leads%rowtype;
  v_stage uuid;
  v_customer uuid;
begin
  if not (public.crm_can('customers.create') and public.crm_can('leads.edit') and public.crm_can('leads.view')) then
    raise exception 'You do not have permission to convert leads' using errcode = '42501';
  end if;
  if p_package_amount is null or p_package_amount < 0 then
    raise exception 'Package amount must be zero or more' using errcode = '22023';
  end if;
  select * into l from public.leads where id = p_lead_id for update;
  if not found or not (public.crm_in_scope(l.assigned_counsellor_id) or l.created_by = auth.uid()) then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.crm_customers where lead_id = p_lead_id) then
    raise exception 'This lead has already been converted' using errcode = '23505';
  end if;

  select id into v_stage from public.crm_lead_stages where is_won and is_active order by sort_order limit 1;

  insert into public.crm_customers (
    lead_id, lead_code, full_name, email, mobile, whatsapp, visa_category, destination_country,
    consultant_id, application_ref, package_amount, notes, created_by
  ) values (
    l.id, l.code, l.full_name, l.email, l.mobile, l.whatsapp,
    coalesce(p_visa_category, l.visa_type), coalesce(p_destination_country, l.destination_country),
    coalesce(p_consultant_id, l.assigned_counsellor_id, auth.uid()), nullif(trim(p_application_ref), ''),
    p_package_amount, nullif(trim(p_notes), ''), auth.uid()
  ) returning id into v_customer;

  update public.leads set stage_id = coalesce(v_stage, stage_id), converted_at = now() where id = l.id;
  update public.crm_documents set customer_id = v_customer where lead_id = l.id and customer_id is null;
  update public.crm_follow_ups set customer_id = v_customer where lead_id = l.id and customer_id is null;
  insert into public.crm_lead_history (lead_id, actor_id, event, note, changes)
  values (l.id, auth.uid(), 'converted', 'Converted to customer', jsonb_build_object('customer_id', v_customer, 'package_amount', p_package_amount));
  return v_customer;
end $$;

-- ---------------------------------------------------------------------
-- Lead (re)assignment. A plain UPDATE can't hand a lead to someone outside
-- the caller's own visibility (Postgres re-checks the SELECT policy on the
-- new row), so assignment goes through this function with explicit checks.
-- ---------------------------------------------------------------------
create or replace function public.crm_assign_leads(p_lead_ids uuid[], p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not (public.crm_can('leads.assign') or public.crm_can('leads.reassign')) then
    raise exception 'You do not have permission to assign leads' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user and crm_role_id is not null and crm_active and is_active) then
    raise exception 'That employee is not active in the CRM' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.leads l where l.id = any(p_lead_ids)
    and not (public.crm_can('leads.view') and (public.crm_in_scope(l.assigned_counsellor_id) or l.created_by = auth.uid()))
  ) or (select count(*) from public.leads where id = any(p_lead_ids)) <> cardinality(p_lead_ids) then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  if not public.crm_can('leads.reassign') and exists (
    select 1 from public.leads where id = any(p_lead_ids) and assigned_counsellor_id is not null and assigned_counsellor_id <> p_user
  ) then
    raise exception 'You can assign unassigned leads only. Reassigning needs the Reassign permission.' using errcode = '42501';
  end if;
  update public.leads set assigned_counsellor_id = p_user
  where id = any(p_lead_ids) and assigned_counsellor_id is distinct from p_user;
  get diagnostics v_count = row_count;
  -- Pending follow-ups move with the lead.
  update public.crm_follow_ups set assigned_to = p_user where lead_id = any(p_lead_ids) and status = 'pending';
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Dashboard aggregation. SECURITY INVOKER: every count respects the
-- caller's RLS scope (a consultant's dashboard only counts their records).
-- ---------------------------------------------------------------------
create or replace function public.crm_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_fin boolean := public.crm_can('finance.view');
  v_perf boolean := public.crm_can('performance.view');
  v_from date := (p_from at time zone 'Asia/Kolkata')::date;
  v_to date := ((p_to - interval '1 microsecond') at time zone 'Asia/Kolkata')::date;
  result jsonb;
begin
  with l as (
    select l.id, l.created_at, l.converted_at, l.visa_type, l.destination_country, l.source, l.assigned_counsellor_id, s.key as stage_key
    from public.leads l left join public.crm_lead_stages s on s.id = l.stage_id
    where l.created_at >= p_from and l.created_at < p_to
  )
  select jsonb_build_object(
    'total', (select count(*) from l),
    'converted', (select count(*) from l where converted_at is not null),
    'converted_in_range', (select count(*) from public.leads where converted_at >= p_from and converted_at < p_to),
    'by_stage', coalesce((select jsonb_object_agg(k, c) from (select coalesce(stage_key, 'none') k, count(*) c from l group by 1) x), '{}'::jsonb),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d) from (
      select (created_at at time zone 'Asia/Kolkata')::date d, count(*) c from l group by 1) x), '[]'::jsonb),
    'by_visa', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc) from (
      select coalesce(visa_type, 'unknown') k, count(*) c from l group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'by_country', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc) from (
      select coalesce(destination_country, 'unknown') k, count(*) c from l group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc) from (
      select coalesce(source, 'unknown') k, count(*) c from l group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'followups_pending', (select count(*) from public.crm_follow_ups where status = 'pending'),
    'followups_overdue', (select count(*) from public.crm_follow_ups where status = 'pending' and due_at < now()),
    'followups_today', (select count(*) from public.crm_follow_ups where status = 'pending'
      and (due_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date),
    'documents_pending', (select count(*) from public.crm_documents where status = 'pending'),
    'finance', case when v_fin then jsonb_build_object(
      'revenue', (select coalesce(sum(amount), 0) from public.crm_payments where paid_on between v_from and v_to),
      'expenses', (select coalesce(sum(amount), 0) from public.crm_expenses where status = 'approved' and expense_date between v_from and v_to),
      'outstanding', (select coalesce(sum(greatest(balance, 0)), 0) from public.crm_customers),
      'monthly', coalesce((select jsonb_agg(jsonb_build_object(
          'month', to_char(m, 'YYYY-MM'),
          'revenue', (select coalesce(sum(amount), 0) from public.crm_payments where date_trunc('month', paid_on::timestamp) = m),
          'expenses', (select coalesce(sum(amount), 0) from public.crm_expenses where status = 'approved' and date_trunc('month', expense_date::timestamp) = m)
        ) order by m)
        from generate_series(date_trunc('month', v_to::timestamp) - interval '11 months', date_trunc('month', v_to::timestamp), interval '1 month') m), '[]'::jsonb)
    ) end,
    'performance', case when v_perf then coalesce((select jsonb_agg(row_to_json(x) order by x.leads desc) from (
      select p.id, p.full_name,
        (select count(*) from l where l.assigned_counsellor_id = p.id) as leads,
        (select count(*) from l where l.assigned_counsellor_id = p.id and l.converted_at is not null) as converted,
        (select count(*) from public.crm_follow_ups f where f.assigned_to = p.id and f.status = 'completed' and f.completed_at >= p_from and f.completed_at < p_to) as follow_ups_done,
        (select count(*) from public.crm_follow_ups f where f.assigned_to = p.id and f.status = 'pending' and f.due_at < now()) as overdue,
        case when v_fin then (select coalesce(sum(pay.amount), 0) from public.crm_payments pay join public.crm_customers c on c.id = pay.customer_id
          where c.consultant_id = p.id and pay.paid_on between v_from and v_to) end as revenue
      from public.profiles p
      where p.crm_role_id is not null and p.crm_active and p.is_active
    ) x), '[]'::jsonb) end
  ) into result;
  return result;
end $$;

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.crm_roles enable row level security;
alter table public.crm_permissions enable row level security;
alter table public.crm_role_permissions enable row level security;
alter table public.crm_lead_stages enable row level security;
alter table public.crm_lead_history enable row level security;
alter table public.crm_lead_assignments enable row level security;
alter table public.crm_customers enable row level security;
alter table public.crm_applications enable row level security;
alter table public.crm_application_history enable row level security;
alter table public.crm_follow_ups enable row level security;
alter table public.crm_documents enable row level security;
alter table public.crm_payments enable row level security;
alter table public.crm_expenses enable row level security;
alter table public.crm_expense_approvals enable row level security;
alter table public.crm_settings enable row level security;
alter table public.crm_options enable row level security;
alter table public.crm_custom_fields enable row level security;

-- Roles & permissions: every CRM user can read (to resolve their own access); only super admins write.
create policy crm_roles_read on public.crm_roles for select using (public.crm_is_member());
create policy crm_roles_write on public.crm_roles for all using (public.crm_is_super()) with check (public.crm_is_super());
create policy crm_permissions_read on public.crm_permissions for select using (public.crm_is_member());
create policy crm_role_permissions_read on public.crm_role_permissions for select using (public.crm_is_member());
create policy crm_role_permissions_write on public.crm_role_permissions for all using (public.crm_is_super()) with check (public.crm_is_super());

-- Configuration tables
create policy crm_lead_stages_read on public.crm_lead_stages for select using (public.crm_is_member());
create policy crm_lead_stages_write on public.crm_lead_stages for all using (public.crm_can('settings.edit')) with check (public.crm_can('settings.edit'));
create policy crm_options_read on public.crm_options for select using (public.crm_is_member());
create policy crm_options_write on public.crm_options for all using (public.crm_can('settings.edit')) with check (public.crm_can('settings.edit'));
create policy crm_custom_fields_read on public.crm_custom_fields for select using (public.crm_is_member());
create policy crm_custom_fields_write on public.crm_custom_fields for all using (public.crm_can('settings.edit')) with check (public.crm_can('settings.edit'));
create policy crm_settings_read on public.crm_settings for select using (public.crm_is_member());
create policy crm_settings_write on public.crm_settings for all using (public.crm_can('settings.edit')) with check (public.crm_can('settings.edit'));

-- Staff directory
create policy profiles_crm_read on public.profiles for select using (public.crm_is_member() and crm_role_id is not null);

-- Leads (added alongside the existing /admin policies; policies are OR-ed)
create policy leads_crm_read on public.leads for select
  using (public.crm_can('leads.view') and (public.crm_in_scope(assigned_counsellor_id) or created_by = auth.uid()));
create policy leads_crm_insert on public.leads for insert
  with check (public.crm_can('leads.create'));
create policy leads_crm_update on public.leads for update
  using (public.crm_can('leads.edit') and (public.crm_in_scope(assigned_counsellor_id) or created_by = auth.uid()))
  with check (public.crm_can('leads.edit'));
create policy leads_crm_delete on public.leads for delete
  using (public.crm_can('leads.delete') and (public.crm_in_scope(assigned_counsellor_id) or created_by = auth.uid()));

create policy lead_activities_crm_read on public.lead_activities for select
  using (public.crm_can('leads.view') and public.crm_lead_visible(lead_id));
create policy lead_activities_crm_insert on public.lead_activities for insert
  with check (actor_id = auth.uid() and public.crm_can('leads.edit') and public.crm_lead_visible(lead_id));

create policy crm_lead_history_read on public.crm_lead_history for select
  using (public.crm_can('leads.view') and public.crm_lead_visible(lead_id));
create policy crm_lead_history_insert on public.crm_lead_history for insert
  with check (actor_id = auth.uid() and public.crm_can('leads.edit') and public.crm_lead_visible(lead_id));
create policy crm_lead_assignments_read on public.crm_lead_assignments for select
  using (public.crm_can('leads.view') and public.crm_lead_visible(lead_id));

-- Customers
-- Visibility is computed from the row's own columns (never by looking the row
-- up by id: a row being inserted isn't visible to that lookup yet).
create policy crm_customers_read on public.crm_customers for select
  using (public.crm_can('customers.view') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_lead_visible(lead_id)));
create policy crm_customers_insert on public.crm_customers for insert
  with check (public.crm_can('customers.create'));
create policy crm_customers_update on public.crm_customers for update
  using (public.crm_can('customers.edit') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_lead_visible(lead_id)))
  with check (public.crm_can('customers.edit'));
create policy crm_customers_delete on public.crm_customers for delete
  using (public.crm_can('customers.delete') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_lead_visible(lead_id)));

-- Applications
create policy crm_applications_read on public.crm_applications for select
  using (public.crm_can('applications.view') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_customer_visible(customer_id)));
create policy crm_applications_insert on public.crm_applications for insert
  with check (public.crm_can('applications.create') and public.crm_customer_visible(customer_id));
create policy crm_applications_update on public.crm_applications for update
  using (public.crm_can('applications.edit') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_customer_visible(customer_id)))
  with check (public.crm_can('applications.edit'));
create policy crm_applications_delete on public.crm_applications for delete
  using (public.crm_can('applications.delete') and (public.crm_in_scope(consultant_id) or created_by = auth.uid() or public.crm_customer_visible(customer_id)));
create policy crm_application_history_read on public.crm_application_history for select
  using (public.crm_can('applications.view') and public.crm_application_visible(application_id));

-- Follow-ups: visible to the assignee/creator, or to anyone who can see the parent record.
create policy crm_follow_ups_read on public.crm_follow_ups for select using (
  public.crm_is_member() and (
    assigned_to = auth.uid() or created_by = auth.uid()
    or (lead_id is not null and public.crm_can('leads.view') and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_can('customers.view') and public.crm_customer_visible(customer_id))
  )
);
create policy crm_follow_ups_insert on public.crm_follow_ups for insert with check (
  created_by = auth.uid()
  and (assigned_to = auth.uid() or public.crm_can('leads.assign'))
  and (
    (lead_id is not null and public.crm_can('leads.edit') and public.crm_lead_visible(lead_id))
    or (lead_id is null and customer_id is not null and public.crm_can('customers.edit') and public.crm_customer_visible(customer_id))
  )
);
create policy crm_follow_ups_update on public.crm_follow_ups for update using (
  public.crm_is_member() and (
    assigned_to = auth.uid() or created_by = auth.uid()
    or (lead_id is not null and public.crm_can('leads.edit') and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_can('customers.edit') and public.crm_customer_visible(customer_id))
  )
) with check (public.crm_is_member() and (assigned_to = auth.uid() or public.crm_can('leads.assign') or created_by = auth.uid()));
create policy crm_follow_ups_delete on public.crm_follow_ups for delete using (
  public.crm_is_member() and (
    created_by = auth.uid()
    or (lead_id is not null and public.crm_can('leads.delete') and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_can('customers.delete') and public.crm_customer_visible(customer_id))
  )
);

-- Documents
create policy crm_documents_read on public.crm_documents for select using (
  public.crm_can('documents.view') and (
    (lead_id is not null and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_customer_visible(customer_id))
  )
);
create policy crm_documents_insert on public.crm_documents for insert with check (
  uploaded_by = auth.uid() and public.crm_can('documents.create') and (
    (lead_id is not null and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_customer_visible(customer_id))
  )
);
create policy crm_documents_update on public.crm_documents for update using (
  (public.crm_can('documents.edit') or public.crm_can('documents.approve')) and (
    (lead_id is not null and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_customer_visible(customer_id))
  )
) with check (public.crm_can('documents.edit') or public.crm_can('documents.approve'));
create policy crm_documents_delete on public.crm_documents for delete using (
  public.crm_can('documents.delete') and (
    (lead_id is not null and public.crm_lead_visible(lead_id))
    or (customer_id is not null and public.crm_customer_visible(customer_id))
  )
);

-- Payments
create policy crm_payments_read on public.crm_payments for select
  using (public.crm_can('payments.view') and public.crm_customer_visible(customer_id));
create policy crm_payments_insert on public.crm_payments for insert
  with check (public.crm_can('payments.create') and public.crm_customer_visible(customer_id) and created_by = auth.uid());
create policy crm_payments_update on public.crm_payments for update
  using (public.crm_can('payments.edit') and public.crm_customer_visible(customer_id))
  with check (public.crm_can('payments.edit'));
create policy crm_payments_delete on public.crm_payments for delete
  using (public.crm_can('payments.delete') and public.crm_customer_visible(customer_id));

-- Expenses
create policy crm_expenses_read on public.crm_expenses for select
  using (public.crm_can('expenses.view') and (public.crm_in_scope(added_by) or public.crm_can('expenses.approve')));
create policy crm_expenses_insert on public.crm_expenses for insert
  with check (public.crm_can('expenses.create') and added_by = auth.uid());
create policy crm_expenses_update on public.crm_expenses for update
  using ((public.crm_can('expenses.edit') and public.crm_in_scope(added_by)) or public.crm_can('expenses.approve'))
  with check (public.crm_can('expenses.edit') or public.crm_can('expenses.approve'));
create policy crm_expenses_delete on public.crm_expenses for delete
  using (public.crm_can('expenses.delete') and (public.crm_in_scope(added_by) or public.crm_can('expenses.approve')));
create policy crm_expense_approvals_read on public.crm_expense_approvals for select
  using (public.crm_can('expenses.view'));

-- Audit trail (written by the server with the service role)
create policy audit_logs_crm_read on public.audit_logs for select using (public.crm_can('audit.view'));

-- =====================================================================
-- Storage. No storage.objects policies for these buckets: browsers never
-- touch them directly. The server checks the CRM row via RLS, then issues
-- a short-lived signed URL with the service role.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crm-documents', 'crm-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Company logo and staff profile pictures (not sensitive).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crm-public', 'crm-public', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- =====================================================================
-- Grants (RLS still decides which rows each role can reach)
-- =====================================================================
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on function public.crm_convert_lead(uuid, numeric, uuid, text, text, text, text) from anon, public;
grant execute on function public.crm_convert_lead(uuid, numeric, uuid, text, text, text, text) to authenticated;
revoke all on function public.crm_assign_leads(uuid[], uuid) from anon, public;
grant execute on function public.crm_assign_leads(uuid[], uuid) to authenticated;
revoke all on function public.crm_dashboard(timestamptz, timestamptz) from anon, public;
grant execute on function public.crm_dashboard(timestamptz, timestamptz) to authenticated;
