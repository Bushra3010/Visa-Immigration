import type { Metadata } from "next";
import { connection } from "next/server";
import { CrmResetForm } from "@/components/crm/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function CrmResetPage() {
  await connection();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Set a new password for your CRM account.</p>
      <CrmResetForm />
    </>
  );
}
