-- CRM reference data: permission catalogue, default roles, pipeline stages,
-- option lists and settings. Idempotent (safe to re-run). Super Admin can
-- change all of this later from CRM → Settings without code changes.

-- ---------------------------------------------------------------------
-- Permission catalogue (module × action grid + special permissions)
-- ---------------------------------------------------------------------
insert into public.crm_permissions (key, module, action, label, sort_order)
select m.key || '.' || a.action, m.key, a.action, initcap(a.action) || ' ' || m.label, m.ord * 10 + a.ord
from (values
  ('dashboard', 'Dashboard', 1), ('leads', 'Lead Management', 2), ('pipeline', 'Lead Pipeline', 3),
  ('customers', 'Converted Customers', 4), ('applications', 'Visa Applications', 5), ('documents', 'Document Management', 6),
  ('expenses', 'Expense Management', 7), ('payments', 'Payment Management', 8), ('reports', 'Reports & Analytics', 9),
  ('users', 'User Management', 10), ('settings', 'Settings', 11), ('audit', 'Activity Log & Audit', 12)
) as m(key, label, ord)
cross join (values ('view', 1), ('create', 2), ('edit', 3), ('delete', 4), ('export', 5), ('approve', 6), ('assign', 7)) as a(action, ord)
on conflict (key) do nothing;

insert into public.crm_permissions (key, module, action, label, sort_order) values
  ('leads.reassign', 'leads', 'reassign', 'Reassign leads', 900),
  ('finance.view', 'finance', 'view', 'View financial information', 901),
  ('performance.view', 'performance', 'view', 'View employee performance', 902)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Default roles
-- ---------------------------------------------------------------------
insert into public.crm_roles (key, name, description, data_scope, is_system, is_super) values
  ('super_admin', 'Super Admin', 'Unrestricted access to every module, user and setting.', 'all', true, true),
  ('admin', 'Admin', 'Runs day-to-day operations across all records.', 'all', true, false),
  ('manager', 'Manager', 'Sees and manages their team''s leads and performance.', 'team', true, false),
  ('visa_consultant', 'Visa Consultant', 'Works assigned leads, customers and their applications.', 'own', true, false),
  ('sales_executive', 'Sales Executive', 'Captures and converts assigned leads.', 'own', true, false),
  ('documentation_executive', 'Documentation Executive', 'Collects and verifies documents for all customers.', 'all', true, false),
  ('accounts_executive', 'Accounts Executive', 'Payments and expenses; no access to lead details.', 'all', true, false)
on conflict (key) do nothing;

-- Grants only on first seed of each role (doesn't overwrite later edits).
with grants(role_key, perms) as (values
  ('admin', array[
    'dashboard.view',
    'leads.view','leads.create','leads.edit','leads.delete','leads.export','leads.assign','leads.reassign',
    'pipeline.view','pipeline.edit',
    'customers.view','customers.create','customers.edit','customers.delete','customers.export',
    'applications.view','applications.create','applications.edit','applications.delete','applications.export',
    'documents.view','documents.create','documents.edit','documents.delete','documents.approve',
    'expenses.view','expenses.create','expenses.edit','expenses.delete','expenses.export','expenses.approve',
    'payments.view','payments.create','payments.edit','payments.delete','payments.export',
    'reports.view','reports.export',
    'users.view','users.create','users.edit',
    'settings.view','settings.edit',
    'audit.view',
    'finance.view','performance.view']),
  ('manager', array[
    'dashboard.view',
    'leads.view','leads.create','leads.edit','leads.export','leads.assign','leads.reassign',
    'pipeline.view','pipeline.edit',
    'customers.view','customers.create','customers.edit',
    'applications.view','applications.create','applications.edit',
    'documents.view','documents.create','documents.edit','documents.approve',
    'expenses.view','expenses.create',
    'payments.view',
    'reports.view','reports.export',
    'users.view',
    'performance.view']),
  ('visa_consultant', array[
    'dashboard.view',
    'leads.view','leads.create','leads.edit',
    'pipeline.view','pipeline.edit',
    'customers.view','customers.create','customers.edit',
    'applications.view','applications.create','applications.edit',
    'documents.view','documents.create','documents.edit',
    'payments.view',
    'expenses.view','expenses.create']),
  ('sales_executive', array[
    'dashboard.view',
    'leads.view','leads.create','leads.edit',
    'pipeline.view','pipeline.edit',
    'customers.view','customers.create',
    'documents.view','documents.create']),
  ('documentation_executive', array[
    'dashboard.view',
    'leads.view',
    'customers.view',
    'applications.view','applications.edit',
    'documents.view','documents.create','documents.edit','documents.approve']),
  ('accounts_executive', array[
    'dashboard.view',
    'customers.view',
    'payments.view','payments.create','payments.edit','payments.export',
    'expenses.view','expenses.create','expenses.edit','expenses.export','expenses.approve',
    'reports.view','reports.export',
    'finance.view'])
)
insert into public.crm_role_permissions (role_id, permission)
select r.id, p
from grants g
join public.crm_roles r on r.key = g.role_key
cross join lateral unnest(g.perms) as p
where not exists (select 1 from public.crm_role_permissions x where x.role_id = r.id)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Pipeline stages
-- ---------------------------------------------------------------------
insert into public.crm_lead_stages (key, name, color, sort_order, is_default, is_won, is_lost, legacy_status) values
  ('new_lead', 'New Lead', '#3b82f6', 10, true, false, false, 'new'),
  ('attempted_contact', 'Attempted Contact', '#6366f1', 20, false, false, false, null),
  ('contacted', 'Contacted', '#0ea5e9', 30, false, false, false, 'contacted'),
  ('interested', 'Interested', '#14b8a6', 40, false, false, false, 'qualified'),
  ('consultation_scheduled', 'Consultation Scheduled', '#8b5cf6', 50, false, false, false, 'consultation_scheduled'),
  ('consultation_completed', 'Consultation Completed', '#a855f7', 60, false, false, false, null),
  ('documents_pending', 'Documents Pending', '#f59e0b', 70, false, false, false, 'documents_pending'),
  ('documents_received', 'Documents Received', '#ca8a04', 80, false, false, false, null),
  ('application_in_progress', 'Application In Progress', '#f97316', 90, false, false, false, 'application_in_progress'),
  ('application_submitted', 'Application Submitted', '#ea580c', 100, false, false, false, 'submitted'),
  ('under_embassy_review', 'Under Embassy Review', '#d946ef', 110, false, false, false, 'under_review'),
  ('visa_approved', 'Visa Approved', '#22c55e', 120, false, false, false, 'approved'),
  ('visa_rejected', 'Visa Rejected', '#ef4444', 130, false, false, false, 'rejected'),
  ('converted_won', 'Converted / Won', '#15803d', 140, false, true, false, null),
  ('not_interested', 'Not Interested', '#94a3b8', 150, false, false, true, 'closed'),
  ('lost_lead', 'Lost Lead', '#64748b', 160, false, false, true, null),
  ('on_hold', 'On Hold', '#a8a29e', 170, false, false, false, null)
on conflict (key) do nothing;

-- Existing website leads join the pipeline at the stage matching their status.
update public.leads l
set stage_id = coalesce(
  (select s.id from public.crm_lead_stages s where s.legacy_status = l.status order by s.sort_order limit 1),
  (select s.id from public.crm_lead_stages s where s.is_default limit 1)
)
where l.stage_id is null;

-- ---------------------------------------------------------------------
-- Option lists
-- ---------------------------------------------------------------------
insert into public.crm_options (kind, key, label, sort_order, color) values
  -- Lead sources (the first four are written by the website forms)
  ('lead_source', 'website', 'Website', 1, null),
  ('lead_source', 'eligibility_form', 'Website – Eligibility Check', 2, null),
  ('lead_source', 'consultation', 'Website – Consultation Booking', 3, null),
  ('lead_source', 'enquiry', 'Website – Contact Enquiry', 4, null),
  ('lead_source', 'walk_in', 'Walk-in', 5, null),
  ('lead_source', 'phone_call', 'Phone Call', 6, null),
  ('lead_source', 'whatsapp', 'WhatsApp', 7, null),
  ('lead_source', 'referral', 'Referral', 8, null),
  ('lead_source', 'google_ads', 'Google Ads', 9, null),
  ('lead_source', 'meta_ads', 'Meta Ads (Facebook / Instagram)', 10, null),
  ('lead_source', 'instagram', 'Instagram (organic)', 11, null),
  ('lead_source', 'partner_agent', 'Partner / Agent', 12, null),
  ('lead_source', 'event', 'Event / Seminar', 13, null),
  ('lead_source', 'other', 'Other', 99, null),
  -- Visa categories (keys match the website's visa category slugs)
  ('visa_category', 'student', 'Student Visa', 1, null),
  ('visa_category', 'work', 'Work Visa', 2, null),
  ('visa_category', 'skilled', 'Skilled Immigration', 3, null),
  ('visa_category', 'visitor', 'Visitor / Tourist Visa', 4, null),
  ('visa_category', 'business', 'Business Visa', 5, null),
  ('visa_category', 'family', 'Family / Spouse Visa', 6, null),
  ('visa_category', 'permanent-residency', 'Permanent Residency', 7, null),
  ('visa_category', 'citizenship', 'Citizenship', 8, null),
  ('visa_category', 'dependent', 'Dependent Visa', 9, null),
  ('visa_category', 'job-seeker', 'Job Seeker Visa', 10, null),
  ('visa_category', 'transit', 'Transit Visa', 11, null),
  -- Destination countries (keys match the website's country slugs)
  ('destination_country', 'canada', 'Canada', 1, null),
  ('destination_country', 'australia', 'Australia', 2, null),
  ('destination_country', 'uk', 'United Kingdom', 3, null),
  ('destination_country', 'usa', 'United States', 4, null),
  ('destination_country', 'germany', 'Germany', 5, null),
  ('destination_country', 'new-zealand', 'New Zealand', 6, null),
  ('destination_country', 'uae', 'Dubai / UAE', 7, null),
  ('destination_country', 'europe', 'Europe (Schengen)', 8, null),
  ('destination_country', 'ireland', 'Ireland', 9, null),
  ('destination_country', 'singapore', 'Singapore', 10, null),
  ('destination_country', 'japan', 'Japan', 11, null),
  ('destination_country', 'other', 'Other', 99, null),
  -- Application statuses
  ('application_status', 'not_started', 'Not Started', 1, '#94a3b8'),
  ('application_status', 'document_collection', 'Document Collection', 2, '#f59e0b'),
  ('application_status', 'document_verification', 'Document Verification', 3, '#eab308'),
  ('application_status', 'application_preparation', 'Application Preparation', 4, '#0ea5e9'),
  ('application_status', 'application_submitted', 'Application Submitted', 5, '#3b82f6'),
  ('application_status', 'appointment_scheduled', 'Appointment Scheduled', 6, '#6366f1'),
  ('application_status', 'biometrics_completed', 'Biometrics Completed', 7, '#8b5cf6'),
  ('application_status', 'embassy_processing', 'Embassy Processing', 8, '#d946ef'),
  ('application_status', 'additional_documents_required', 'Additional Documents Required', 9, '#f97316'),
  ('application_status', 'approved', 'Approved', 10, '#22c55e'),
  ('application_status', 'rejected', 'Rejected', 11, '#ef4444'),
  ('application_status', 'withdrawn', 'Withdrawn', 12, '#64748b'),
  -- Expense categories
  ('expense_category', 'marketing', 'Marketing & Advertising', 1, null),
  ('expense_category', 'google_ads', 'Google Ads', 2, null),
  ('expense_category', 'meta_ads', 'Meta Ads', 3, null),
  ('expense_category', 'office_rent', 'Office Rent', 4, null),
  ('expense_category', 'salaries', 'Employee Salaries', 5, null),
  ('expense_category', 'travel', 'Travel Expenses', 6, null),
  ('expense_category', 'visa_processing_fees', 'Visa Processing Fees', 7, null),
  ('expense_category', 'embassy_fees', 'Embassy Fees', 8, null),
  ('expense_category', 'documentation_charges', 'Documentation Charges', 9, null),
  ('expense_category', 'commission', 'Agent/Partner Commission', 10, null),
  ('expense_category', 'software', 'Software & Subscriptions', 11, null),
  ('expense_category', 'office_expenses', 'Office Expenses', 12, null),
  ('expense_category', 'miscellaneous', 'Miscellaneous', 13, null),
  -- Payment modes
  ('payment_mode', 'cash', 'Cash', 1, null),
  ('payment_mode', 'upi', 'UPI', 2, null),
  ('payment_mode', 'bank_transfer', 'Bank Transfer (NEFT / RTGS / IMPS)', 3, null),
  ('payment_mode', 'card', 'Debit / Credit Card', 4, null),
  ('payment_mode', 'cheque', 'Cheque', 5, null),
  ('payment_mode', 'online_gateway', 'Online Payment Gateway', 6, null),
  ('payment_mode', 'other', 'Other', 99, null),
  -- Document types
  ('document_type', 'passport', 'Passport', 1, null),
  ('document_type', 'photograph', 'Passport Size Photograph', 2, null),
  ('document_type', 'aadhaar', 'Aadhaar Card', 3, null),
  ('document_type', 'pan', 'PAN Card', 4, null),
  ('document_type', 'bank_statement', 'Bank Statement', 5, null),
  ('document_type', 'bank_balance_certificate', 'Bank Balance Certificate', 6, null),
  ('document_type', 'educational_certificates', 'Educational Certificates', 7, null),
  ('document_type', 'experience_letters', 'Experience Letters', 8, null),
  ('document_type', 'invitation_letter', 'Invitation Letter', 9, null),
  ('document_type', 'travel_insurance', 'Travel Insurance', 10, null),
  ('document_type', 'visa_application_form', 'Visa Application Form', 11, null),
  ('document_type', 'embassy_documents', 'Embassy Documents', 12, null),
  ('document_type', 'other', 'Other Documents', 99, null)
on conflict (kind, key) do nothing;

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
insert into public.crm_settings (key, value) values
  ('company', jsonb_build_object(
    'name', 'New Visa Global Odyssey',
    'email', 'newvisallp@gmail.com',
    'phone', '+91 81300 91200',
    'address', 'A-7/206-207, 3rd Floor, Rohini Sector 17, New Delhi 110089, India',
    'gstin', '07AQUPG7824J1Z9',
    'website', 'https://newvisa.io',
    'logo_url', null
  )),
  ('currency', '"INR"'::jsonb),
  ('notifications', jsonb_build_object(
    'lead_assigned', true,
    'follow_up_reminders', true,
    'expense_submitted', true,
    'expense_decided', true,
    'document_rejected', true
  ))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Initial Super Admin: existing platform super admins get full CRM access.
-- (A brand-new one can be created with `node scripts/crm-create-super-admin.mjs`.)
-- ---------------------------------------------------------------------
update public.profiles p
set crm_role_id = (select id from public.crm_roles where key = 'super_admin')
where p.role = 'super_admin' and p.crm_role_id is null;
