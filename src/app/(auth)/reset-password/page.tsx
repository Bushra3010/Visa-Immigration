import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Set new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <div className="mt-6"><ResetPasswordForm /></div>
    </>
  );
}
