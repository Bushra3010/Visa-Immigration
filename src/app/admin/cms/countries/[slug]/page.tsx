import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { CountryFields, DeleteCard } from "@/components/app/cms-fields";
import { Badge, Card, Notice } from "@/components/ui/primitives";
import { deleteCountry, saveCountry } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";
import { COUNTRY_COLUMNS, toCountry, type CountryRow } from "@/lib/content/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit country" };

export default async function EditCountryPage({ params, searchParams }: PageProps<"/admin/cms/countries/[slug]">) {
  await requireSection("cms");
  const [{ slug }, { created }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("countries")
    .select(`id, sort_order, is_published, updated_at, ${COUNTRY_COLUMNS}, visa_services(slug, title)`)
    .eq("slug", slug)
    .maybeSingle();
  if (!row) notFound();
  const country = toCountry(row as unknown as CountryRow);
  const services = (row.visa_services ?? []) as { slug: string; title: string }[];

  return (
    <>
      <Link href="/admin/cms" className="text-sm text-brand-600">← Content</Link>
      <PageHeader
        title={country.name}
        description={<>
          <Link href={`/countries/${country.slug}`} target="_blank" className="text-brand-600">/countries/{country.slug}</Link>
          {" · "}{row.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
        </>}
      />
      {created && <Notice tone="success" className="mb-6">Country created.</Notice>}
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveCountry} submitLabel="Save changes" className="space-y-6">
          <CountryFields country={country} meta={{ id: row.id, sortOrder: row.sort_order, isPublished: row.is_published }} />
        </ActionForm>
      </Card>
      {services.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="font-semibold">Visa pages for {country.name}</h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {services.map((s) => <li key={s.slug}><Link href={`/admin/cms/services/${s.slug}`} className="text-brand-600">{s.title}</Link></li>)}
          </ul>
        </Card>
      )}
      <DeleteCard
        action={deleteCountry}
        id={row.id}
        what="country"
        warning={services.length ? `This country has ${services.length} visa page(s); delete or move them first.` : "The page is removed from the website. Existing leads keep the country's slug but lose its name."}
      />
    </>
  );
}
