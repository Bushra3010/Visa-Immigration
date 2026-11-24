"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { crmLogin, crmRequestReset, crmResetPassword } from "@/lib/crm/actions/auth";
import { idleState, type FormState } from "@/lib/forms";

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <Notice tone={state.status === "success" ? "success" : "danger"}>{state.message}</Notice>;
}

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="pr-10" aria-invalid={invalid || undefined} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function CrmLoginForm() {
  const [state, action, pending] = useActionState(crmLogin, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message state={state} />
      <Field label="Username or email" htmlFor="identifier" error={err("identifier")}>
        <Input id="identifier" name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus aria-invalid={err("identifier") ? true : undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={err("password")}>
        <PasswordInput id="password" name="password" autoComplete="current-password" invalid={!!err("password")} />
      </Field>
      <div className="text-right text-sm"><Link href="/crm/forgot-password" className="font-medium text-brand-600 hover:underline">Forgot password?</Link></div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function CrmForgotForm() {
  const [state, action, pending] = useActionState(crmRequestReset, idleState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message state={state} />
      <Field label="Username or email" htmlFor="identifier" error={state.fieldErrors?.identifier}>
        <Input id="identifier" name="identifier" autoComplete="username" autoCapitalize="none" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
      <p className="text-center text-sm"><Link href="/crm/login" className="text-brand-600 hover:underline">Back to sign in</Link></p>
    </form>
  );
}

export function CrmResetForm() {
  const [state, action, pending] = useActionState(crmResetPassword, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message state={state} />
      <Field label="New password" htmlFor="password" error={err("password")} hint="At least 10 characters, with letters and numbers">
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!err("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={err("confirmPassword")}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" invalid={!!err("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving…" : "Set new password"}</Button>
    </form>
  );
}
