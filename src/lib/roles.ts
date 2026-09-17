export const ROLES = [
  "super_admin",
  "immigration_admin",
  "counsellor",
  "documentation",
  "travel_admin",
  "finance",
  "customer",
] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  immigration_admin: "Immigration Admin",
  counsellor: "Counsellor",
  documentation: "Documentation Team",
  travel_admin: "Travel Admin",
  finance: "Finance",
  customer: "Customer",
};

/** Admin Panel sections and the roles allowed into each (PRD §9). */
export const ADMIN_SECTIONS = {
  dashboard: ["super_admin", "immigration_admin", "counsellor", "documentation", "travel_admin", "finance"],
  leads: ["super_admin", "immigration_admin", "counsellor"],
  applications: ["super_admin", "immigration_admin", "counsellor", "documentation"],
  documents: ["super_admin", "immigration_admin", "documentation"],
  consultations: ["super_admin", "immigration_admin", "counsellor"],
  users: ["super_admin"],
  counsellors: ["super_admin", "immigration_admin"],
  travel: ["super_admin", "travel_admin"],
  suppliers: ["super_admin", "travel_admin"],
  markup: ["super_admin", "travel_admin"],
  payments: ["super_admin", "finance"],
  cms: ["super_admin", "immigration_admin"],
  reports: ["super_admin", "immigration_admin", "travel_admin", "finance"],
} as const satisfies Record<string, readonly AppRole[]>;

export type AdminSection = keyof typeof ADMIN_SECTIONS;

export function canAccess(role: AppRole | null | undefined, section: AdminSection) {
  return !!role && (ADMIN_SECTIONS[section] as readonly AppRole[]).includes(role);
}
