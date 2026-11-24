import Link from "next/link";
import { cn } from "@/lib/utils";

export const OPTION_KINDS = [
  { kind: "lead_source", label: "Lead sources", single: "Lead source", color: false },
  { kind: "visa_category", label: "Visa categories", single: "Visa category", color: false },
  { kind: "destination_country", label: "Destination countries", single: "Country", color: false },
  { kind: "application_status", label: "Application statuses", single: "Status", color: true },
  { kind: "expense_category", label: "Expense categories", single: "Category", color: false },
  { kind: "payment_mode", label: "Payment modes", single: "Payment mode", color: false },
  { kind: "document_type", label: "Document types", single: "Document type", color: false },
] as const;

export function SettingsNav({ active }: { active: string }) {
  const items = [
    { href: "/crm/settings", key: "general", label: "Company & preferences" },
    { href: "/crm/settings/stages", key: "stages", label: "Lead stages" },
    ...OPTION_KINDS.map((o) => ({ href: `/crm/settings/options?kind=${o.kind}`, key: o.kind, label: o.label })),
    { href: "/crm/settings/custom-fields", key: "custom-fields", label: "Custom fields" },
    { href: "/crm/roles", key: "roles", label: "User roles & permissions" },
  ];
  return (
    <nav aria-label="Settings" className="lg:sticky lg:top-20">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {items.map((i) => (
          <li key={i.key}>
            <Link href={i.href} aria-current={active === i.key ? "page" : undefined}
              className={cn("block whitespace-nowrap rounded-lg px-3 py-2 text-sm", active === i.key ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-soft hover:bg-white")}>{i.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
