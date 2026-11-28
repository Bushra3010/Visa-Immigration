import type { Metadata } from "next";
import { Award, BadgeCheck, Building2, FileCheck2, Globe, Handshake, Star, UserRound } from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { CheckList, PageHero } from "@/components/site/content-blocks";
import { InstagramIcon, LinkedInIcon } from "@/components/site/social-icons";
import { Container, Section } from "@/components/ui/primitives";
import { site, siteAddress } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `${site.name} is a Rohini-based immigration and visa consultancy in Delhi, led by founder ${site.business.proprietor}, helping clients since 2014.`,
  alternates: { canonical: "/about" },
};

const VISA_SERVICES = [
  "Permanent residency (PR)",
  "Work permits",
  "Student visas",
  "Tourist and dependent visas",
  "Business immigration",
  "Golden and investment visas",
];

const DESTINATIONS = [
  "Canada", "Australia", "Germany", "Ireland", "Poland", "Croatia", "Luxembourg",
  "Singapore", "South Africa", "United Kingdom", "United States", "New Zealand", "Schengen countries",
];

const SUPPORT = [
  "Customised document checklists",
  "Cover letter drafting",
  "Document translation and verification",
  "Pre-departure counselling",
  "Travel insurance",
  "Forex assistance",
];

const CREDENTIALS = [
  { icon: BadgeCheck, title: "MSME registered", text: `Udyam ${site.business.udyam}` },
  { icon: Award, title: "GeM verified", text: "Verified seller on the Government e-Marketplace" },
  { icon: Globe, title: "IATA approved", text: "Recognised by the International Air Transport Association" },
  { icon: Handshake, title: "B2B partnerships", text: "Ties across education and travel partners" },
];

const card = "rounded-xl border border-line bg-white p-6";
const h2 = "text-lg font-semibold text-ink";

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title={`About ${site.name}`} description="Visa and immigration consultancy, from your first eligibility check to your final decision." />
      <Section>
        <Container className="max-w-4xl space-y-8 text-ink-soft">
          <section aria-labelledby="who-we-are" className="space-y-4">
            <h2 id="who-we-are" className="text-2xl font-bold text-ink">Who we are</h2>
            <p>
              <strong className="text-ink">{site.name}</strong> is a Rohini-based immigration and visa consultancy in Delhi, led by founder{" "}
              <strong className="text-ink">{site.business.proprietor}</strong>. We have been helping clients since 2014, and the business was formally registered in 2022–2023.
            </p>
            <p>We help students, professionals, families and businesses explore opportunities abroad, from the first eligibility check to the visa decision.</p>
            <CheckList items={["Dedicated counsellors by destination", "Secure online document uploads", "Real-time application tracking", "Guidance at every step of your application"]} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section aria-labelledby="services" className={card}>
              <h2 id="services" className={`flex items-center gap-2 ${h2}`}><FileCheck2 className="size-5 text-brand-600" /> Visa &amp; migration services</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {VISA_SERVICES.map((s) => <li key={s} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{s}</li>)}
              </ul>
            </section>
            <section aria-labelledby="support" className={card}>
              <h2 id="support" className={`flex items-center gap-2 ${h2}`}><Building2 className="size-5 text-brand-600" /> End-to-end support</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {SUPPORT.map((s) => <li key={s} className="flex gap-2"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{s}</li>)}
              </ul>
            </section>
          </div>

          <section aria-labelledby="destinations" className={card}>
            <h2 id="destinations" className={`flex items-center gap-2 ${h2}`}><Globe className="size-5 text-brand-600" /> Destinations we handle</h2>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {DESTINATIONS.map((d) => <li key={d} className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">{d}</li>)}
            </ul>
          </section>

          <section aria-labelledby="credentials">
            <h2 id="credentials" className="text-2xl font-bold text-ink">Reputation &amp; credentials</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {CREDENTIALS.map(({ icon: Icon, title, text }) => (
                <li key={title} className={`flex gap-3 ${card} p-5`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50"><Icon className="size-5 text-brand-600" /></span>
                  <span><span className="block font-semibold text-ink">{title}</span><span className="text-sm">{text}</span></span>
                </li>
              ))}
            </ul>
            <div className={`mt-4 flex flex-wrap items-center gap-3 ${card} p-5`}>
              <span className="flex items-center gap-0.5 text-amber-500" aria-hidden>{Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-5 fill-current" />)}</span>
              <p className="text-sm"><strong className="text-ink">Rated around 4.9 out of 5</strong> across roughly 100 client ratings on local directory listings, including Justdial and Magicpin.</p>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <section aria-labelledby="founder" className={card}>
              <h2 id="founder" className={`flex items-center gap-2 ${h2}`}><UserRound className="size-5 text-brand-600" /> Leadership</h2>
              <p className="mt-3 text-sm"><strong className="text-ink">{site.business.proprietor}</strong>, Founder</p>
              <p className="mt-1 text-sm">Leads our counselling team and has guided clients through visa and immigration journeys since 2014.</p>
            </section>
            <section aria-labelledby="follow" className={card}>
              <h2 id="follow" className={h2}>Follow us</h2>
              <p className="mt-1 text-sm">Updates, success stories and visa news.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={site.social.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004182]">
                  <LinkedInIcon className="size-4" /> LinkedIn
                </a>
                <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand-200 hover:text-brand-700">
                  <InstagramIcon className="size-4" /> Instagram
                </a>
              </div>
            </section>
          </div>

          <section aria-labelledby="business-details" className={card}>
            <h2 id="business-details" className={h2}>Business details</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-ink">Trade name</dt><dd>{site.business.tradeName}</dd>
              <dt className="font-medium text-ink">Legal name</dt><dd>{site.business.legalName}</dd>
              <dt className="font-medium text-ink">Constitution</dt><dd>{site.business.constitution} (Proprietor: {site.business.proprietor})</dd>
              <dt className="font-medium text-ink">Registered address</dt><dd>{siteAddress}, {site.contact.address.state}, {site.contact.address.country}</dd>
              <dt className="font-medium text-ink">GSTIN</dt><dd className="font-mono">{site.business.gstin}</dd>
              <dt className="font-medium text-ink">Udyam registration</dt><dd className="font-mono">{site.business.udyam} ({site.business.enterpriseType} enterprise)</dd>
            </dl>
          </section>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
