import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrmLoginForm } from "@/components/crm/auth-forms";
import { getCrmViewer } from "@/lib/crm/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function CrmLoginPage() {
  if (await getCrmViewer()) redirect("/crm");
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Sign in to the CRM</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Use the credentials your administrator created for you.</p>
      <CrmLoginForm />
    </>
  );
}
