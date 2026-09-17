"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { idleState, type FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Generic wrapper so server-rendered admin forms get pending + result state. */
export function ActionForm({ action, submitLabel, children, className, variant = "primary" }: {
  action: Action; submitLabel: string; children: ReactNode; className?: string; variant?: "primary" | "secondary" | "accent" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} size="sm" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state.message && <p role="status" className={cn("text-sm", state.status === "success" ? "text-success" : "text-danger")}>{state.message}</p>}
      </div>
      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <ul className="text-xs text-danger">{Object.entries(state.fieldErrors).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      )}
    </form>
  );
}
