import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { ServiceFields } from "@/components/app/cms-fields";
import { Card } from "@/components/ui/primitives";
import { saveService } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";
import { serviceOptions } from "../options";

export const metadata: Metadata = { title: "New visa page" };

export default async function NewServicePage() {
  await requireSection("cms");
  const options = await serviceOptions();
  return (
    <>
      <Link href="/admin/cms" className="text-sm text-brand-600">← Content</Link>
      <PageHeader title="New visa service page" description="Creates a page at /visa/your-slug. It stays hidden until you tick Published." />
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveService} submitLabel="Create visa page" className="space-y-6">
          <ServiceFields meta={{ isPublished: false }} {...options} />
        </ActionForm>
      </Card>
    </>
  );
}
