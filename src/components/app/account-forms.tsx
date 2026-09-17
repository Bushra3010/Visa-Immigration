"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { sendMessage, updateProfile } from "@/lib/account/actions";
import { idleState } from "@/lib/forms";

export function ProfileForm({ profile }: { profile: { full_name: string | null; email: string | null; mobile: string | null; date_of_birth: string | null; country_of_residence: string | null } }) {
  const [state, action, pending] = useActionState(updateProfile, idleState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded-xl border border-line bg-white p-6 sm:grid-cols-2">
      {state.message && <Notice tone={state.status === "success" ? "success" : "danger"} className="sm:col-span-2">{state.message}</Notice>}
      <Field label="Full name" htmlFor="fullName" error={err("fullName")}><Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} /></Field>
      <Field label="Email" htmlFor="email" hint="Contact support to change your email"><Input id="email" value={profile.email ?? ""} disabled /></Field>
      <Field label="Mobile" htmlFor="mobile" error={err("mobile")}><Input id="mobile" name="mobile" type="tel" defaultValue={profile.mobile ?? ""} /></Field>
      <Field label="Date of birth" htmlFor="dateOfBirth"><Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={profile.date_of_birth ?? ""} /></Field>
      <Field label="Country of residence" htmlFor="countryOfResidence"><Input id="countryOfResidence" name="countryOfResidence" defaultValue={profile.country_of_residence ?? ""} /></Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}

export function MessageForm({ applications }: { applications: { id: string; code: string }[] }) {
  const [state, action, pending] = useActionState(sendMessage, idleState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-xl border border-line bg-white p-4">
      {state.status === "error" && state.message && <Notice tone="danger">{state.message}</Notice>}
      {applications.length > 0 && (
        <Field label="About application" htmlFor="applicationId">
          <Select id="applicationId" name="applicationId" defaultValue={applications[0].id}>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.code}</option>)}
            <option value="">General enquiry</option>
          </Select>
        </Field>
      )}
      <Field label="Message" htmlFor="body" error={state.fieldErrors?.body}><Textarea id="body" name="body" rows={3} /></Field>
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
    </form>
  );
}
