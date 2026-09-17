import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { DataTable, Td } from "@/components/app/table";
import { Notice } from "@/components/ui/primitives";
import { requireSection } from "@/lib/auth";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";
import { VISA_SERVICES } from "@/lib/content/visa-services";

export const metadata: Metadata = { title: "Content (CMS)" };

export default async function CmsPage() {
  await requireSection("cms");
  return (
    <>
      <PageHeader title="Content (CMS)" description="Countries, visa categories, service pages, FAQs, blog, testimonials, banners, offers and SEO metadata." />
      <Notice tone="warning" className="mb-6">
        Phase 1: site content is served from placeholder files in <code>src/lib/content</code> while the business supplies final copy (PRD §15).
        The CMS tables already exist in the database; editing screens will switch the public pages to read from them in the CMS milestone.
      </Notice>
      <h2 className="mb-3 font-semibold">Countries ({COUNTRIES.length})</h2>
      <DataTable head={["Country", "URL", "Pathways", "FAQs"]} className="mb-8">
        {COUNTRIES.map((c) => (
          <tr key={c.slug}><Td>{c.name}</Td><Td><Link className="text-brand-600" href={`/countries/${c.slug}`}>/countries/{c.slug}</Link></Td><Td>{c.immigrationOptions.length}</Td><Td>{c.faqs.length}</Td></tr>
        ))}
      </DataTable>
      <h2 className="mb-3 font-semibold">Visa service pages ({VISA_SERVICES.length})</h2>
      <DataTable head={["Service", "URL", "Country", "Category"]} className="mb-8">
        {VISA_SERVICES.map((s) => (
          <tr key={s.slug}><Td>{s.title}</Td><Td><Link className="text-brand-600" href={`/visa/${s.slug}`}>/visa/{s.slug}</Link></Td><Td>{s.countrySlug}</Td><Td>{s.categorySlug}</Td></tr>
        ))}
      </DataTable>
      <h2 className="mb-3 font-semibold">Visa categories ({VISA_CATEGORIES.length})</h2>
      <p className="text-sm text-ink-soft">{VISA_CATEGORIES.map((c) => c.name).join(" · ")}</p>
    </>
  );
}
