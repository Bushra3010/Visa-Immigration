-- Automatic counsellor assignment (PRD §6.6)
-- Picks an available counsellor, preferring specialization matches on
-- country, then visa category, then lead location, breaking ties by the
-- lightest open-lead load. Manual assignment (non-null on insert) is kept.

create or replace function public.pick_counsellor_for_lead(
  p_country text, p_visa_type text, p_location text
)
returns uuid
language sql stable security definer set search_path = public as $$
  with load as (
    select assigned_counsellor_id as id, count(*) as open_leads
    from public.leads
    where status not in ('approved', 'rejected', 'closed')
      and assigned_counsellor_id is not null
    group by assigned_counsellor_id
  )
  select c.profile_id
  from public.counsellors c
  join public.profiles p on p.id = c.profile_id and p.is_active and p.role = 'counsellor'
  left join load on load.id = c.profile_id
  where c.is_available
    and coalesce(load.open_leads, 0) < c.max_active_leads
  order by
    (p_country is not null and p_country = any(c.countries)) desc,
    (p_visa_type is not null and p_visa_type = any(c.visa_categories)) desc,
    (p_location is not null and p_location = any(c.locations)) desc,
    coalesce(load.open_leads, 0) asc,
    c.created_at asc
  limit 1
$$;

create or replace function public.auto_assign_lead()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_counsellor_id is null then
    new.assigned_counsellor_id := public.pick_counsellor_for_lead(
      new.destination_country, new.visa_type, new.country_of_residence
    );
  end if;
  return new;
end $$;

create trigger leads_auto_assign before insert on public.leads
  for each row execute function public.auto_assign_lead();

create or replace function public.log_lead_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_counsellor_id is not null
     and (tg_op = 'INSERT' or new.assigned_counsellor_id is distinct from old.assigned_counsellor_id) then
    insert into public.lead_activities (lead_id, actor_id, kind, body, metadata)
    values (
      new.id, auth.uid(), 'assignment',
      case when tg_op = 'INSERT' and auth.uid() is null then 'Auto-assigned on submission' else 'Counsellor reassigned' end,
      jsonb_build_object('counsellor_id', new.assigned_counsellor_id)
    );
  end if;
  return new;
end $$;

create trigger leads_log_assignment after insert or update of assigned_counsellor_id on public.leads
  for each row execute function public.log_lead_assignment();
