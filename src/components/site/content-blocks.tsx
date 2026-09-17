import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Faq } from "@/lib/content/countries";
import { Container } from "@/components/ui/primitives";

export function PageHero({ eyebrow, title, description, breadcrumbs, children }: {
  eyebrow?: string; title: string; description?: string; breadcrumbs?: { href?: string; label: string }[]; children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-gradient-to-br from-brand-900 to-brand-700 py-12 text-white sm:py-16">
      <Container>
        {breadcrumbs && <div className="mb-6"><Breadcrumbs items={breadcrumbs} /></div>}
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg text-brand-100">{description}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </Container>
    </section>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-brand-200">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? <Link href={item.href} className="hover:text-white">{item.label}</Link> : <span aria-current="page" className="text-white">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ContentSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line py-8 last:border-0">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 text-ink-soft">{children}</div>
    </section>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {faqs.map((f) => (
        <details key={f.question} className="group p-4">
          <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
            <span className="flex items-center justify-between gap-4">
              {f.question}
              <span aria-hidden className="text-brand-600 transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <p className="mt-2 text-sm text-ink-soft">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page" className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.id}><a href={`#${i.id}`} className="text-ink-soft hover:text-brand-700">{i.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}

/** Renders schema.org JSON-LD (§11). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}
