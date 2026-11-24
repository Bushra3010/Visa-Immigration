"use client";

import {
  createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, useTransition, type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { idleState, type FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";

// ---------------------------------------------------------------------------
// Modal (native <dialog>: focus trap, Esc to close, inert background)
// ---------------------------------------------------------------------------
const ModalContext = createContext<{ close: () => void } | null>(null);
export const useModal = () => useContext(ModalContext);

export function Modal({ trigger, title, description, children, size = "md", triggerClassName, triggerVariant = "primary", triggerSize = "sm", defaultOpen = false }: {
  trigger: ReactNode; title: string; description?: ReactNode; children: ReactNode; size?: "sm" | "md" | "lg" | "xl";
  triggerClassName?: string; triggerVariant?: Variant; triggerSize?: "sm" | "md"; defaultOpen?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName ?? buttonClass(triggerVariant, triggerSize)}>{trigger}</button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
        className={cn("m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]", widths[size])}
      >
        {open && (
          <ModalContext.Provider value={{ close: () => setOpen(false) }}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink" aria-label="Close"><X className="size-5" /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
          </ModalContext.Provider>
        )}
      </dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Forms bound to server actions, with toasts + pending state
// ---------------------------------------------------------------------------
const FormStateContext = createContext<FormState>(idleState);
/** Field error for `name` from the closest CrmForm submission. */
export function useFieldError(name: string) {
  return useContext(FormStateContext).fieldErrors?.[name];
}
/** Last result of the closest CrmForm (e.g. duplicate warnings in `data`). */
export function useFormResult() {
  return useContext(FormStateContext);
}

export function CrmForm({ action, children, submitLabel = "Save", pendingLabel = "Saving…", className, variant = "primary", resetOnSuccess = false, footer, onSuccess, hideSubmit = false, encType }: {
  action: Action; children: ReactNode; submitLabel?: string; pendingLabel?: string; className?: string; variant?: Variant;
  resetOnSuccess?: boolean; footer?: ReactNode; onSuccess?: (state: FormState) => void; hideSubmit?: boolean; encType?: "multipart/form-data";
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const toast = useToast();
  const modal = useModal();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const last = useRef(state);

  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.status === "success") {
      if (state.message) toast(state.message, "success");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
      modal?.close();
      router.refresh();
    } else if (state.status === "error" && state.message) {
      toast(state.message, "error");
    }
  }, [state, toast, modal, resetOnSuccess, onSuccess, router]);

  return (
    <FormStateContext.Provider value={state}>
      {/* onSubmit + startTransition instead of action={…}: React would otherwise reset every field after each submit, wiping input on validation errors. */}
      <form
        ref={formRef}
        className={cn("space-y-4", className)}
        encType={encType}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">{state.message}</p>
        )}
        {!hideSubmit && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {footer}
            {modal && <Button type="button" variant="secondary" size="sm" onClick={modal.close}>Cancel</Button>}
            <Button type="submit" variant={variant} size="sm" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}{pending ? pendingLabel : submitLabel}
            </Button>
          </div>
        )}
      </form>
    </FormStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Confirmation dialog for destructive / irreversible actions
// ---------------------------------------------------------------------------
export function ConfirmButton({ action, fields, title, message, confirmLabel = "Confirm", children, variant = "danger", className, triggerVariant = "ghost", requireReason }: {
  action: Action; fields: Record<string, string>; title: string; message: ReactNode; confirmLabel?: string; children: ReactNode;
  variant?: Variant; className?: string; triggerVariant?: Variant; requireReason?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const [reason, setReason] = useState("");

  function run() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    if (requireReason) fd.set("reason", reason);
    start(async () => {
      const res = await action(idleState, fd);
      if (res.status === "success") {
        ref.current?.close();
        if (res.message) toast(res.message, "success");
        router.refresh();
      } else {
        toast(res.message ?? "Action failed.", "error");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className ?? buttonClass(triggerVariant, "sm", triggerVariant === "ghost" ? "text-danger hover:bg-red-50 hover:text-danger" : undefined)}>{children}</button>
      <dialog ref={ref} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 shadow-2xl backdrop:bg-ink/40">
        <div className="p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="mt-2 text-sm text-ink-soft">{message}</div>
          {requireReason && (
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={requireReason}
              className="mt-3 block w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.close()}>Cancel</Button>
            <Button type="button" variant={variant} size="sm" disabled={pending || (!!requireReason && !reason.trim())} onClick={run}>
              {pending && <Loader2 className="size-4 animate-spin" />}{confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Runs a server action immediately (no confirmation), e.g. "Mark complete". */
export function ActionButton({ action, fields, children, className, variant = "secondary", size = "sm", title }: {
  action: Action; fields: Record<string, string>; children: ReactNode; className?: string; variant?: Variant; size?: "sm" | "md"; title?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={className ?? buttonClass(variant, size)}
      onClick={() => {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) fd.set(k, v);
        start(async () => {
          const res = await action(idleState, fd);
          if (res.status === "success") { if (res.message) toast(res.message); router.refresh(); }
          else toast(res.message ?? "Action failed.", "error");
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filters: submit the surrounding GET form when a control changes
// ---------------------------------------------------------------------------
export function AutoSubmit({ children }: { children: ReactNode }) {
  return (
    <div
      className="contents"
      onChange={(e) => {
        const el = e.target as HTMLInputElement | HTMLSelectElement;
        if (el.tagName === "SELECT" || el.type === "date" || el.type === "checkbox") el.form?.requestSubmit();
      }}
    >
      {children}
    </div>
  );
}

/** Date preset picker that reveals custom from/to inputs. */
export function RangePicker({ value, from, to, presets }: { value: string; from?: string; to?: string; presets: readonly { value: string; label: string }[] }) {
  const [range, setRange] = useState(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select name="range" value={range} onChange={(e) => { setRange(e.target.value); if (e.target.value !== "custom") e.target.form?.requestSubmit(); }}
        className="h-9 rounded-lg border border-line bg-white px-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" aria-label="Date range">
        {presets.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {range === "custom" && (
        <>
          <input type="date" name="from" defaultValue={from} aria-label="From" className="h-9 rounded-lg border border-line bg-white px-2 text-sm" />
          <span className="text-muted">→</span>
          <input type="date" name="to" defaultValue={to} aria-label="To" className="h-9 rounded-lg border border-line bg-white px-2 text-sm" />
          <button className={buttonClass("primary", "sm")}>Apply</button>
        </>
      )}
    </div>
  );
}

/** Auto-refreshes server data (dashboard "real-time" figures). */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function PrintButton({ children = "Print / Save PDF", className }: { children?: ReactNode; className?: string }) {
  return <button type="button" onClick={() => window.print()} className={className ?? buttonClass("secondary", "sm")}>{children}</button>;
}
