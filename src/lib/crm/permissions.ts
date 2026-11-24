/**
 * CRM permission catalogue. Mirrors public.crm_permissions (seeded by
 * supabase/migrations/20261126000003_crm_seed.sql); the database is the
 * enforcement point (RLS via crm_can()), this file drives the UI.
 */

export const CRM_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leads", label: "Lead Management" },
  { key: "pipeline", label: "Lead Pipeline" },
  { key: "customers", label: "Converted Customers" },
  { key: "applications", label: "Visa Applications" },
  { key: "documents", label: "Document Management" },
  { key: "expenses", label: "Expense Management" },
  { key: "payments", label: "Payment Management" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "users", label: "User Management" },
  { key: "settings", label: "Settings" },
  { key: "audit", label: "Activity Log & Audit" },
] as const;

export const CRM_ACTIONS = ["view", "create", "edit", "delete", "export", "approve", "assign"] as const;

export type CrmModule = (typeof CRM_MODULES)[number]["key"];
export type CrmAction = (typeof CRM_ACTIONS)[number];

/** Additional permissions outside the module × action grid. */
export const CRM_SPECIAL_PERMISSIONS = [
  { key: "leads.reassign", label: "Reassign leads", hint: "Move a lead from one employee to another" },
  { key: "finance.view", label: "View financial information", hint: "Revenue, expenses, profit and package amounts on dashboards and reports" },
  { key: "performance.view", label: "View employee performance", hint: "Employee-wise leads, conversions and follow-ups" },
] as const;

export type CrmPermission = `${CrmModule}.${CrmAction}` | (typeof CRM_SPECIAL_PERMISSIONS)[number]["key"];

/** Shortcut labels from the brief, mapped onto grid permissions. */
export const CRM_PERMISSION_ALIASES = [
  { label: "Assign leads", key: "leads.assign" },
  { label: "Manage payments", key: "payments.create" },
  { label: "Approve expenses", key: "expenses.approve" },
] as const;

export const DATA_SCOPES = [
  { value: "all", label: "View all leads & records", hint: "Every lead, customer and application" },
  { value: "team", label: "View team leads", hint: "Own records plus records of employees reporting to this user" },
  { value: "own", label: "View only assigned leads", hint: "Only records assigned to this user" },
] as const;
export type DataScope = (typeof DATA_SCOPES)[number]["value"];

export const ALL_PERMISSION_KEYS: string[] = [
  ...CRM_MODULES.flatMap((m) => CRM_ACTIONS.map((a) => `${m.key}.${a}`)),
  ...CRM_SPECIAL_PERMISSIONS.map((p) => p.key),
];
