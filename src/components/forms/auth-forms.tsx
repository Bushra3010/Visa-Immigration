"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { login, register, requestPasswordReset, updatePassword } from "@/lib/auth-actions/actions";
import { idleState, type FormState } from "@/lib/forms";

function Messages({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <Notice tone={state.status === "success" ? "success" : "danger"}>{state.message}</Notice>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Messages state={state} />
      <Field label="Email" htmlFor="email" error={err("email")}><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password" error={err("password")}><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <div className="text-right text-sm"><Link href="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link></div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Logging in…" : "Log in"}</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(register, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  if (state.status === "success") return <Messages state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Messages state={state} />
      <Field label="Full name" htmlFor="fullName" error={err("fullName")}><Input id="fullName" name="fullName" autoComplete="name" /></Field>
      <Field label="Email" htmlFor="email" error={err("email")}><Input id="email" name="email" type="email" autoComplete="email" /></Field>
      <Field label="Mobile" htmlFor="mobile" error={err("mobile")}><Input id="mobile" name="mobile" type="tel" autoComplete="tel" /></Field>
      <Field label="Password" htmlFor="password" error={err("password")} hint="At least 10 characters"><Input id="password" name="password" type="password" autoComplete="new-password" /></Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={err("confirmPassword")}><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" /></Field>
      <label className="flex gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-brand-600" />
        <span>I agree to the Terms of Service and Privacy Policy.</span>
      </label>
      {err("terms") && <p className="text-xs text-danger">{err("terms")}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, idleState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}><Input id="email" name="email" type="email" autoComplete="email" /></Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="space-y-4" noValidate>
      <Messages state={state} />
      <Field label="New password" htmlFor="password" error={err("password")} hint="At least 10 characters"><Input id="password" name="password" type="password" autoComplete="new-password" /></Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={err("confirmPassword")}><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" /></Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Saving…" : "Update password"}</Button>
    </form>
  );
}
