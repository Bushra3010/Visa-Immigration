import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/forms/auth-forms";
import { Notice } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to track applications and manage bookings.</p>
      {error === "link" && <Notice tone="danger" className="mt-4">That link is invalid or has expired.</Notice>}
      {!isSupabaseConfigured() && (
        <Notice tone="brand" className="mt-4">
          Customer accounts are coming soon. Meanwhile you can <Link href="/eligibility" className="font-semibold underline">check your eligibility</Link> or <Link href="/consultation" className="font-semibold underline">book a consultation</Link>.
        </Notice>
      )}
      <div className="mt-6"><LoginForm next={nextPath} /></div>
      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href={`/register${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
    </>
  );
}
