import type { Metadata } from "next";
import { CrmForgotForm } from "@/components/crm/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function CrmForgotPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">We&apos;ll email a reset link to the address on your CRM account.</p>
      <CrmForgotForm />
    </>
  );
}
