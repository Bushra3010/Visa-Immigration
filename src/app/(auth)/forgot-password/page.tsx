import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to set a new password.</p>
      <div className="mt-6"><ForgotPasswordForm /></div>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand-600 hover:underline">Back to log in</Link></p>
    </>
  );
}
