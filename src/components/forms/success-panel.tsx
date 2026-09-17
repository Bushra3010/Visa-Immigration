import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui/primitives";

export function SuccessPanel({ title, reference, demo, children }: { title: string; reference?: string; demo?: boolean; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-8 text-center">
      <CheckCircle2 className="mx-auto size-12 text-success" />
      <h2 className="mt-4 text-2xl font-semibold text-ink">{title}</h2>
      {reference && (
        <p className="mt-2 text-ink-soft">
          Your reference number is <span className="font-mono font-semibold text-ink">{reference}</span>
        </p>
      )}
      {demo && (
        <Notice tone="warning" className="mx-auto mt-4 max-w-md text-left">
          Preview mode: this site is using demo data, so your submission was not stored. Please contact us directly to reach a counsellor.
        </Notice>
      )}
      {children && <div className="mt-6 text-ink-soft">{children}</div>}
    </div>
  );
}
