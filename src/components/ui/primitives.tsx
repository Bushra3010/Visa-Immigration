import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("py-12 sm:py-16", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)} {...props} />;
}

export function SectionHeading({ eyebrow, title, description, className }: { eyebrow?: string; title: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>}
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-ink-soft">{description}</p>}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-canvas text-ink-soft ring-line",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-green-50 text-success ring-green-200",
  warning: "bg-amber-50 text-warning ring-amber-200",
  danger: "bg-red-50 text-danger ring-red-200",
  accent: "bg-accent-50 text-accent-600 ring-orange-200",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", badgeTones[tone], className)}
      {...props}
    />
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "brand", children, className }: { tone?: "brand" | "warning" | "danger" | "success"; children: ReactNode; className?: string }) {
  const tones = {
    brand: "border-brand-100 bg-brand-50 text-brand-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
  };
  return <div role="status" className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}
