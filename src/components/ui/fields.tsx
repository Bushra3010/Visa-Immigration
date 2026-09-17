import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 aria-invalid:border-danger";

export function Field({ label, htmlFor, error, hint, required, children, className }: {
  label: string; htmlFor: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props}>{children}</select>;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "py-2", className)} {...props} />;
}
