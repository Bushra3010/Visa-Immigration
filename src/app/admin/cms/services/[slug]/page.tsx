import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { DeleteCard, ServiceFields } from "@/components/app/cms-fields";
import { Badge, Card, Notice } from "@/components/ui/primitives";
import { deleteService, saveService } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";
import { SERVICE_COLUMNS, toService, type ServiceRow } from "@/lib/content/store";
import { createClient } from "@/lib/supabase/server";
import { serviceOptions } from "../options";

export const metadata: Metadata = { title: "Edit visa page" };

export default async function EditServicePage({ params, searchParams }: PageProps<"/admin/cms/services/[slug]">) {
  await requireSection("cms");
  const [{ slug }, { created }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: row }, options] = await Promise.all([
    supabase.from("visa_services").select(`id, sort_order, is_published, service_fee, ${SERVICE_COLUMNS}`).eq("slug", slug).maybeSingle(),
    serviceOptions(),
  ]);
  if (!row) notFound();
  const r = row as unknown as ServiceRow & { id: string; sort_order: number; is_published: boolean; service_fee: number | null };
  // Staff can read drafts, so both joins resolve here.
  const service = toService({ ...r, country: r.country ?? { slug: "" }, category: r.category ?? { slug: "" } });

  return (
    <>
      <Link href="/admin/cms" className="text-sm text-brand-600">← Content</Link>
      <PageHeader
        title={service.title}
        description={<>
          <Link href={`/visa/${service.slug}`} target="_blank" className="text-brand-600">/visa/{service.slug}</Link>
          {" · "}{r.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
        </>}
      />
      {created && <Notice tone="success" className="mb-6">Visa page created.</Notice>}
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveService} submitLabel="Save changes" className="space-y-6">
          <ServiceFields service={service} serviceFee={r.service_fee} meta={{ id: r.id, sortOrder: r.sort_order, isPublished: r.is_published }} {...options} />
        </ActionForm>
      </Card>
      <DeleteCard
        action={deleteService}
        id={r.id}
        what="visa page"
        warning="The page is removed from the website. Applications that reference it keep the slug but lose its title."
      />
    </>
  );
}
