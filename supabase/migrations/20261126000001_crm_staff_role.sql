-- CRM (Visa Consultancy CRM at /crm): staff accounts created from CRM → Users.
-- Kept in its own migration: a new enum value can't be used in the same
-- transaction that adds it.
alter type public.app_role add value if not exists 'crm_staff';
