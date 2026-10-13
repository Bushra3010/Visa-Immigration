import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { Field, Input } from "@/components/ui/fields";
import { Badge, Card } from "@/components/ui/primitives";
import { deleteCategory, saveCategory } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visa categories" };

type Category = { id?: string; slug?: string; name?: string; short_name?: string | null; summary?: string | null; sort_order?: number; is_published?: boolean };

function CategoryFields({ c }: { c: Category }) {
  const id = (k: string) => `${c.id ?? "new"}-${k}`;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" htmlFor={id("name")} required><Input id={id("name")} name="name" required defaultValue={c.name} placeholder="e.g. Student Visa" /></Field>
      {c.id ? (
        <Field label="Slug" htmlFor={id("slug")} hint="Fixed once created"><Input id={id("slug")} value={c.slug} readOnly disabled /></Field>
      ) : (
        <Field label="Slug" htmlFor={id("slug")} required><Input id={id("slug")} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="e.g. student" /></Field>
      )}
      <Field label="Short label" htmlFor={id("short")} hint="Used on compact chips"><Input id={id("short")} name="shortName" maxLength={30} defaultValue={c.short_name ?? ""} placeholder="e.g. Study" /></Field>
      <Field label="Sort order" htmlFor={id("sort")}><Input id={id("sort")} name="sortOrder" type="number" min={0} defaultValue={c.sort_order ?? 0} /></Field>
      <Field label="Description" htmlFor={id("desc")} className="sm:col-span-3"><Input id={id("desc")} name="description" maxLength={500} defaultValue={c.summary ?? ""} /></Field>
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm"><input type="checkbox" name="isPublished" defaultChecked={c.is_published ?? true} className="accent-brand-600" /> Published</label>
    </div>
  );
}

export default async function CategoriesPage() {
  await requireSection("cms");
  const supabase = await createClient();
  const { data } = await supabase.from("visa_categories").select("id, slug, name, short_name, summary, sort_order, is_published, visa_services(count)").order("sort_order").order("name");

  return (
    <>
      <Link href="/admin/cms" className="text-sm text-brand-600">← Content</Link>
      <PageHeader title="Visa categories" description="Used for “Visa by type” navigation, visa page filters and the consultation form." />
      <Card className="mb-8 p-5">
        <h2 className="mb-3 font-semibold">New category</h2>
        <ActionForm action={saveCategory} submitLabel="Create category"><CategoryFields c={{}} /></ActionForm>
      </Card>
      <div className="space-y-4">
        {(data ?? []).map((c) => {
          const pages = (c.visa_services as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <details key={c.id} className="rounded-xl border border-line bg-white p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <Badge>{c.slug}</Badge>
                <Badge tone="brand">{pages} visa page{pages === 1 ? "" : "s"}</Badge>
                {!c.is_published && <Badge tone="warning">Draft</Badge>}
              </summary>
              <div className="mt-4 space-y-4">
                <ActionForm action={saveCategory} submitLabel="Save category"><CategoryFields c={c} /></ActionForm>
                <ActionForm action={deleteCategory} submitLabel="Delete" variant="danger" className="flex flex-wrap items-center gap-3 space-y-0 border-t border-line pt-4">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required className="accent-danger" /> Permanently delete this category</label>
                </ActionForm>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
