import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, Briefcase, Building2, CalendarDays, CircleCheck, FileCheck2, FileText, GraduationCap, Headset, Hourglass, House,
  Search, ShieldCheck, Timer, UserRound, Users, BadgeCheck, type LucideIcon,
} from "lucide-react";
import { SkylineArt } from "@/components/immigration/skyline-art";
import { WavingFlag } from "@/components/immigration/waving-flag";
import { FaqList, JsonLd, faqJsonLd } from "@/components/site/content-blocks";
import { COUNTRIES, COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { servicesForCountry } from "@/lib/content/visa-services";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/countries/[slug]">): Promise<Metadata> {
  const country = COUNTRY_BY_SLUG.get((await params).slug);
  if (!country) return {};
  return {
    title: `${country.name} Immigration — Visas, PR, Study & Work`,
    description: `${country.tagline} Explore ${country.name} immigration options, eligibility, required documents and FAQs.`,
    alternates: { canonical: `/countries/${country.slug}` },
    openGraph: { title: `${country.name} Immigration`, description: country.tagline },
  };
}

/* Section order follows PRD §6.1. */
const SECTIONS = [
  { id: "why", label: "Why" },
  { id: "options", label: "Immigration options" },
  { id: "work", label: "Work opportunities" },
  { id: "study", label: "Study options" },
  { id: "pr", label: "Permanent Residency" },
  { id: "family", label: "Family sponsorship" },
  { id: "visitor", label: "Visitor visa" },
  { id: "eligibility", label: "Eligibility" },
  { id: "documents", label: "Required documents" },
  { id: "processing", label: "Processing information" },
  { id: "faqs", label: "FAQs" },
];

// Marketing claims from the approved design — confirm before launch.
const FEATURES: { icon: LucideIcon; title: string; lines: [string, string] }[] = [
  { icon: ShieldCheck, title: "Secure & Reliable", lines: ["Your data is safe", "and confidential."] },
  { icon: Users, title: "Expert Guidance", lines: ["Advice from experienced", "immigration counsellors."] },
  { icon: Timer, title: "Faster Processing", lines: ["Streamlined process for", "quicker results."] },
  { icon: Headset, title: "24/7 Support", lines: ["We're here to help you", "at every step."] },
];

function optionIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (/(permanent|residency|pr\b|skilled migrant)/.test(t)) return House;
  if (/(study|student)/.test(t)) return GraduationCap;
  if (/(job seeker|opportunity card)/.test(t)) return Search;
  if (/(visit|tourist)/.test(t)) return UserRound;
  if (/(golden|business|investor)/.test(t)) return Building2;
  if (/(blue card)/.test(t)) return BadgeCheck;
  if (/(work|employ|skilled)/.test(t)) return Briefcase;
  return FileText;
}

function optionCategory(title: string) {
  const t = title.toLowerCase();
  if (/(permanent|residency)/.test(t)) return "permanent-residency";
  if (/(study|student)/.test(t)) return "student";
  if (/(visit|tourist)/.test(t)) return "visitor";
  if (/(job seeker|opportunity)/.test(t)) return "job-seeker";
  if (/(golden|business)/.test(t)) return "business";
  if (/skilled/.test(t)) return "skilled";
  return "work";
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={`${id}-heading`} className="text-[21px] font-bold text-ink">{children}</h2>;
}

/** Icon + copy + link card used for the narrative sections. */
function InfoCard({ icon: Icon, text, link, decoration = false }: { icon: LucideIcon; text: string; link?: { href: string; label: string }; decoration?: boolean }) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-lg border border-line bg-gradient-to-r from-white to-brand-50/60 px-5 py-6 shadow-sm sm:px-6">
      {decoration && <SkylineArt className="pointer-events-none absolute -bottom-2 right-4 hidden h-[120px] w-[300px] text-brand-200/70 sm:block" />}
      <div className="relative flex items-center gap-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border border-line bg-white shadow-sm">
          <Icon className="size-6 text-brand-700" strokeWidth={1.7} />
        </span>
        <div className="max-w-[420px]">
          <p className="text-[14.5px] leading-relaxed text-ink">{text}</p>
          {link && (
            <Link href={link.href} className="mt-3 inline-flex items-center gap-2 text-[14.5px] font-semibold text-brand-700 hover:underline">
              {link.label} <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function CountryPage({ params }: PageProps<"/countries/[slug]">) {
  const country = COUNTRY_BY_SLUG.get((await params).slug);
  if (!country) notFound();
  const services = servicesForCountry(country.slug);
  const q = (visa?: string) => `?country=${country.slug}${visa ? `&visa=${visa}` : ""}`;
  const divider = "scroll-mt-28 border-b border-line py-9 first:pt-0 last:border-0";

  return (
    <div className="bg-[#f8faf9]">
      <JsonLd data={faqJsonLd(country.faqs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: site.url },
            { "@type": "ListItem", position: 2, name: "Countries", item: `${site.url}/countries` },
            { "@type": "ListItem", position: 3, name: country.name, item: `${site.url}/countries/${country.slug}` },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
        <img src="/Images/hero.png" alt="" aria-hidden className="absolute inset-0 size-full object-cover object-[55%_50%]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0b2419]/90 via-[#0b2419]/55 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-12 pt-9 sm:px-8 lg:grid-cols-[1fr_380px]">
          <div className="text-white">
            <nav aria-label="Breadcrumb" className="text-[14px] text-white/85">
              <ol className="flex flex-wrap items-center gap-2">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li aria-hidden>/</li>
                <li><Link href="/countries" className="hover:text-white">Countries</Link></li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="font-semibold text-white">{country.name}</li>
              </ol>
            </nav>
            <p className="mt-8 text-[13px] font-semibold uppercase tracking-wide text-brand-200">Study. Work. Settle</p>
            <h1 className="mt-3 text-[40px] font-bold leading-tight tracking-[-0.02em] sm:text-[48px]">{country.name} Immigration</h1>
            <p className="mt-4 max-w-[440px] text-[16.5px] leading-relaxed text-white/95">{country.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link href={`/eligibility${q()}`} className="flex h-[46px] items-center gap-2.5 rounded-md border border-white/40 bg-brand-600 px-5 text-[15px] font-semibold hover:bg-brand-700">
                <CalendarDays className="size-5" strokeWidth={1.8} /> Check Eligibility
              </Link>
              <Link href={`/consultation${q()}`} className="flex h-[46px] items-center gap-2.5 rounded-md bg-white px-5 text-[15px] font-semibold text-ink hover:bg-white/90">
                <CalendarDays className="size-5" strokeWidth={1.8} /> Book Consultation
              </Link>
            </div>
          </div>
          <WavingFlag isoCode={country.isoCode} name={country.name} className="relative -mb-12 ml-auto hidden min-h-[300px] w-[300px] self-stretch lg:block" />
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-10 pt-10 sm:px-8 lg:grid-cols-[1fr_300px] lg:gap-12">
        <article>
          <section id="why" aria-labelledby="why-heading" className={divider}>
            <SectionTitle id="why">Why {country.name}?</SectionTitle>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {country.why.map((w) => (
                <li key={w} className="flex gap-3 text-[14px] text-ink"><CircleCheck className="size-5 shrink-0 text-brand-600" strokeWidth={1.7} />{w}</li>
              ))}
            </ul>
          </section>

          <section id="options" aria-labelledby="options-heading" className={divider}>
            <SectionTitle id="options">Immigration Options</SectionTitle>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {country.immigrationOptions.map((o) => {
                const Icon = optionIcon(o.title);
                const href = o.visaSlug ? `/visa/${o.visaSlug}` : `/consultation${q(optionCategory(o.title))}`;
                return (
                  <li key={o.title} className="flex gap-4 rounded-lg border border-line bg-white p-5 shadow-sm">
                    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-50/80"><Icon className="size-5 text-brand-700" strokeWidth={1.7} /></span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{o.title}</p>
                      <p className="mt-2 text-[13.5px] text-ink-soft">{o.description}</p>
                      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-700 hover:underline">
                        {o.visaSlug ? "View details" : "Get advice"} <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="work" aria-labelledby="work-heading" className={divider}>
            <SectionTitle id="work">Work opportunities</SectionTitle>
            <InfoCard icon={Briefcase} text={country.work} link={{ href: `/eligibility${q("work")}`, label: `Explore work options in ${country.name}` }} decoration />
          </section>

          <section id="study" aria-labelledby="study-heading" className={divider}>
            <SectionTitle id="study">Study options</SectionTitle>
            <InfoCard icon={GraduationCap} text={country.study} link={{ href: `/eligibility${q("student")}`, label: `Check study visa eligibility` }} />
          </section>

          <section id="pr" aria-labelledby="pr-heading" className={divider}>
            <SectionTitle id="pr">Permanent Residency</SectionTitle>
            <InfoCard icon={House} text={country.permanentResidency} link={{ href: `/eligibility${q("permanent-residency")}`, label: "Check PR eligibility" }} />
          </section>

          <section id="family" aria-labelledby="family-heading" className={divider}>
            <SectionTitle id="family">Family sponsorship</SectionTitle>
            <InfoCard icon={Users} text={country.family} link={{ href: `/consultation${q("family")}`, label: "Talk to a family immigration counsellor" }} />
          </section>

          <section id="visitor" aria-labelledby="visitor-heading" className={divider}>
            <SectionTitle id="visitor">Visitor visa</SectionTitle>
            <InfoCard icon={UserRound} text={country.visitor} link={{ href: `/eligibility${q("visitor")}`, label: "Check visitor visa eligibility" }} />
          </section>

          <section id="eligibility" aria-labelledby="eligibility-heading" className={divider}>
            <SectionTitle id="eligibility">Eligibility</SectionTitle>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {country.eligibility.map((e) => (
                <li key={e} className="flex gap-3 text-[14px] text-ink"><CircleCheck className="size-5 shrink-0 text-brand-600" strokeWidth={1.7} />{e}</li>
              ))}
            </ul>
          </section>

          <section id="documents" aria-labelledby="documents-heading" className={divider}>
            <SectionTitle id="documents">Required documents</SectionTitle>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {country.documents.map((d) => (
                <li key={d} className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-[14px] shadow-sm">
                  <FileCheck2 className="size-5 shrink-0 text-brand-700" strokeWidth={1.7} />{d}
                </li>
              ))}
            </ul>
          </section>

          <section id="processing" aria-labelledby="processing-heading" className={divider}>
            <SectionTitle id="processing">Processing information</SectionTitle>
            <InfoCard icon={Hourglass} text={country.processing} />
          </section>

          <section id="faqs" aria-labelledby="faqs-heading" className={divider}>
            <SectionTitle id="faqs">Frequently asked questions</SectionTitle>
            <div className="mt-5"><FaqList faqs={country.faqs} /></div>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink">On this page</p>
            <ul className="mt-3 space-y-2.5 text-[13.5px]">
              {SECTIONS.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-ink-soft hover:text-brand-700">{s.label}</a></li>
              ))}
            </ul>
          </nav>

          {services.length > 0 && (
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink">{country.name} visa services</p>
              <ul className="mt-3 space-y-2.5 text-[14px]">
                {services.map((s) => <li key={s.slug}><Link href={`/visa/${s.slug}`} className="font-medium text-brand-700 hover:underline">{s.title}</Link></li>)}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-brand-50/80 p-5">
            <p className="text-[16px] font-semibold text-ink">Talk to a {country.name} specialist</p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">Get personalized advice on the best option for you.</p>
            <Link href={`/consultation${q()}`} className="mt-4 inline-flex items-center gap-2 rounded-md border border-brand-700 bg-white px-4 py-2 text-[14px] font-semibold text-brand-700 hover:bg-brand-50">
              <CalendarDays className="size-4" strokeWidth={1.8} /> Book a Consultation
            </Link>
            <p className="mt-4 text-[14px] text-ink-soft">
              or Call us: <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="font-semibold text-brand-700">{site.contact.phone}</a>
            </p>
          </div>
        </aside>
      </div>

      {/* Feature band */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8">
        <ul className="grid gap-6 rounded-lg border border-line bg-white px-6 py-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
          {FEATURES.map(({ icon: Icon, title, lines }) => (
            <li key={title} className="flex items-center gap-4 lg:px-5 lg:first:pl-2">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50"><Icon className="size-6 text-brand-700" strokeWidth={1.7} /></span>
              <span className="text-[13px] leading-snug text-ink-soft"><span className="mb-1 block text-[14px] font-semibold text-ink">{title}</span>{lines[0]}<br />{lines[1]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
