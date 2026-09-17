import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui/primitives";
import { isSupabaseConfigured } from "@/lib/env";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Track your application, upload documents and book travel.</p>
      {!isSupabaseConfigured() && (
        <Notice tone="brand" className="mt-4">
          Customer accounts are coming soon. Meanwhile you can <Link href="/eligibility" className="font-semibold underline">check your eligibility</Link> or <Link href="/consultation" className="font-semibold underline">book a consultation</Link>.
        </Notice>
      )}
      <div className="mt-6"><RegisterForm next={typeof next === "string" ? next : undefined} /></div>
      <p className="mt-6 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-medium text-brand-600 hover:underline">Log in</Link></p>
    </>
  );
}
