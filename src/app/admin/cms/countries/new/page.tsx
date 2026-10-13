import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { CountryFields } from "@/components/app/cms-fields";
import { Card } from "@/components/ui/primitives";
import { saveCountry } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: "New country" };

export default async function NewCountryPage() {
  await requireSection("cms");
  return (
    <>
      <Link href="/admin/cms" className="text-sm text-brand-600">← Content</Link>
      <PageHeader title="New country" description="Creates a destination page at /countries/your-slug. It stays hidden until you tick Published." />
      <Card className="p-5 sm:p-6">
        <ActionForm action={saveCountry} submitLabel="Create country" className="space-y-6">
          <CountryFields meta={{ isPublished: false }} />
        </ActionForm>
      </Card>
    </>
  );
}
