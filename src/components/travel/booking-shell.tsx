import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Container, Notice } from "@/components/ui/primitives";

const STEPS = ["Select", "Details", "Payment", "Confirmation"];

export function BookingSteps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2 text-sm" aria-label="Booking progress">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className={i === current ? "font-semibold text-brand-700" : i < current ? "text-ink-soft" : "text-muted"}>
          {i + 1}. {s}{i < STEPS.length - 1 && <span className="ml-2 text-line">—</span>}
        </li>
      ))}
    </ol>
  );
}

export function BookingShell({ title, step, summary, children }: { title: string; step: number; summary: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-8">
      <BookingSteps current={step} />
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">{children}</div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">{summary}</aside>
      </div>
    </Container>
  );
}

export function LoginToBook({ next }: { next: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-6 text-center">
      <p className="text-lg font-semibold">Log in to continue</p>
      <p className="mt-1 text-sm text-muted">Your booking, e-ticket and voucher will be saved to your dashboard.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass("primary")}>Log in</Link>
        <Link href={`/register?next=${encodeURIComponent(next)}`} className={buttonClass("secondary")}>Create account</Link>
      </div>
    </div>
  );
}

export function Unavailable({ reason, backHref }: { reason: string; backHref: string }) {
  return (
    <Container className="py-12">
      <Notice tone="danger">
        <p className="font-medium">This option is no longer available</p>
        <p className="mt-1">{reason}</p>
      </Notice>
      <Link href={backHref} className={buttonClass("primary", "md", "mt-6")}>Search again</Link>
    </Container>
  );
}

export function PriceLines({ lines, total, currency }: { lines: { label: string; amount: number }[]; total: number; currency: string }) {
  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="font-semibold">Price summary</p>
      <dl className="mt-3 space-y-2 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between"><dt className="text-ink-soft">{l.label}</dt><dd>{fmt(l.amount)}</dd></div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{fmt(total)}</dd></div>
      </dl>
    </div>
  );
}
