import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, ClipboardList, CloudUpload, CreditCard, FileText, Globe, Headset, LockKeyhole, Mail,
  MessageCircleMore, RefreshCcw, ShieldCheck, Users, Zap, type LucideIcon,
} from "lucide-react";
import { DestinationCarousel } from "@/components/immigration/destination-carousel";
import { PassportArt } from "@/components/immigration/passport-art";
import { VisaFinder } from "@/components/immigration/visa-finder";
import { CountryFlag } from "@/components/site/country-flag";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES, COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { countryPhoto } from "@/lib/content/country-photos";
import { POPULAR_VISAS } from "@/lib/content/popular-visas";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Visa & Immigration Consultancy",
  description: "Expert guidance for study, work, visit, business, family, PR and citizenship visas. Check your eligibility and get a simplified, hassle-free visa experience.",
  alternates: { canonical: "/immigration" },
};

const container = "mx-auto w-full max-w-7xl px-4 sm:px-8";

// Marketing figures from the approved design — confirm before launch.
const HERO_STATS: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Globe, value: "150+", label: "Countries Covered" },
  { icon: Users, value: "50K+", label: "Happy Travelers" },
  { icon: BadgeCheck, value: "99%", label: "Success Rate" },
  { icon: Headset, value: "24/7", label: "Expert Support" },
];

const TRUST: { icon: LucideIcon; title: string; lines: [string, string] }[] = [
  { icon: ShieldCheck, title: "Trusted & Reliable", lines: ["Trusted by 50K+", "travelers worldwide"] },
  { icon: Globe, title: "Global Presence", lines: ["150+ countries", "visa assistance"] },
  { icon: Headset, title: "Expert Guidance", lines: ["From start to", "visa approval"] },
  { icon: LockKeyhole, title: "Secure Process", lines: ["100% secure &", "confidential"] },
];

/* Customer journey (PRD §13.1), summarised. */
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ClipboardList, title: "Check Eligibility", text: "Select your destination and check visa requirements" },
  { icon: CloudUpload, title: "Submit Documents", text: "Upload documents and provide required details" },
  { icon: CreditCard, title: "Make Payment", text: "Secure payment through multiple options" },
  { icon: FileText, title: "Get Your Visa", text: "Track your application and receive your visa" },
];

const WHY: { icon: LucideIcon; title: string; lines: [string, string]; tone: string }[] = [
  { icon: ShieldCheck, title: "Secure & Confidential", lines: ["Your data is safe", "and confidential"], tone: "bg-brand-50 text-brand-600" },
  { icon: MessageCircleMore, title: "Dedicated Support", lines: ["A dedicated counsellor", "for your case"], tone: "bg-orange-50 text-orange-500" },
  { icon: FileText, title: "End-to-End Assistance", lines: ["From documentation to", "visa in hand"], tone: "bg-blue-50 text-blue-600" },
  { icon: Zap, title: "Faster Processing", lines: ["Complete files,", "fewer delays"], tone: "bg-violet-50 text-violet-600" },
];

const ASSURANCES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "SSL Encrypted", text: "Your information is safe" },
  { icon: CreditCard, title: "Secure Payments", text: "Multiple payment options" },
  { icon: RefreshCcw, title: "Easy Refund Policy", text: "Terms & conditions apply" },
  { icon: Mail, title: "Instant Updates", text: "Stay updated via email & WhatsApp" },
];


export default function ImmigrationPage() {
  const countryOptions = COUNTRIES.map((c) => ({ value: c.slug, label: c.name, hint: c.region }));
  const categoryOptions = VISA_CATEGORIES.map((c) => ({ value: c.slug, label: c.name }));

  return (
    <div className="bg-white text-ink">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
        <img src="/Images/hero.png" alt="" aria-hidden className="absolute inset-0 size-full object-cover object-[60%_45%]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0b2a22]/90 via-[#0b2a22]/60 to-[#0b2a22]/10" />
        <div className={`relative ${container} grid gap-10 pb-8 pt-12 lg:grid-cols-[640px_1fr] lg:pb-8 lg:pt-12`}>
          <div className="text-white">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-200">Visa &amp; Immigration Consultancy</p>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[52px]">Your Journey Abroad<br />Starts Here</h1>
            <p className="mt-4 text-[18px] leading-relaxed text-white/95">Expert guidance. Simplified process.<br />Hassle-free visa experience.</p>
            <div className="mt-6">
              <VisaFinder countries={countryOptions} categories={categoryOptions} />
            </div>
          </div>
          <ul className="hidden self-end rounded-xl border border-white/10 bg-[#0b2a22]/70 px-5 py-2 text-white backdrop-blur-sm lg:mb-2 lg:ml-auto lg:block lg:w-[230px]">
            {HERO_STATS.map(({ icon: Icon, value, label }) => (
              <li key={label} className="flex items-center gap-4 border-b border-white/15 py-4 last:border-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/25"><Icon className="size-5" strokeWidth={1.6} /></span>
                <span><span className="block text-[20px] font-bold leading-tight">{value}</span><span className="text-[13px] text-white/85">{label}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust band */}
      <section className="bg-brand-700 text-white">
        <ul className={`${container} grid grid-cols-2 gap-y-6 py-6 lg:grid-cols-4 lg:divide-x lg:divide-white/15`}>
          {TRUST.map(({ icon: Icon, title, lines }) => (
            <li key={title} className="flex items-center gap-4 lg:justify-center lg:px-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10"><Icon className="size-6" strokeWidth={1.6} /></span>
              <span className="text-[13px] leading-snug"><span className="block font-semibold">{title}</span>{lines[0]}<br />{lines[1]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Popular destinations */}
      <section className={`${container} py-10`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-bold">Popular Visa Destinations</h2>
            <p className="mt-1 text-[15px] text-ink-soft">Most applied visas by our customers</p>
          </div>
          <Link href="/countries" className="flex items-center gap-2 rounded-md border border-ink/60 px-4 py-2 text-sm font-medium hover:border-brand-600 hover:text-brand-600">
            View all countries <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6">
          <DestinationCarousel>
            {POPULAR_VISAS.map((v) => {
              const country = COUNTRY_BY_SLUG.get(v.countrySlug);
              if (!country) return null;
              const photo = countryPhoto(v.countrySlug);
              return (
                <li key={v.countrySlug} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[calc((100%-7*16px)/8)] lg:min-w-[128px]">
                  <Link href={`/countries/${country.slug}`} className="group block h-full overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:shadow-md">
                    <span className="relative block">
                      <span className="block aspect-[4/5] overflow-hidden bg-canvas">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- optional local photo
                          <img src={photo} alt={country.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <CountryFlag isoCode={country.isoCode} name={country.name} className="size-full transition-transform duration-300 group-hover:scale-105" />
                        )}
                      </span>
                      <span className="absolute -bottom-3.5 left-3 size-8 overflow-hidden rounded-full border-2 border-white bg-white shadow">
                        <CountryFlag round isoCode={country.isoCode} name={country.name} className="size-full" />
                      </span>
                    </span>
                    <span className="block px-3 pb-3 pt-6">
                      <span className="block truncate text-[14px] font-bold group-hover:text-brand-600">{v.label}</span>
                      <span className="block truncate text-[12px] text-ink-soft">{v.visaType}</span>
                      <span className="mt-3 block text-[12px] font-semibold text-brand-700">From {formatMoney(v.fromPrice)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </DestinationCarousel>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-canvas py-10">
        <div className={container}>
          <h2 className="text-center text-[22px] font-bold">How It Works</h2>
          <p className="mt-1 text-center text-[15px] text-ink-soft">Simple steps to get your visa</p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="absolute left-[calc(50%+56px)] right-[calc(-50%+56px)] top-8 hidden items-center lg:flex">
                    <span className="h-px flex-1 border-t-2 border-dotted border-ink-soft/40" />
                    <ArrowRight className="-ml-1 size-3.5 text-ink-soft" strokeWidth={2.5} />
                  </span>
                )}
                <span className="grid size-16 place-items-center rounded-full border border-line bg-white shadow-sm">
                  <Icon className="size-7 text-brand-600" strokeWidth={1.5} />
                </span>
                <p className="mt-4 text-[15px] font-semibold">{i + 1}. {title}</p>
                <p className="mt-1 max-w-[190px] text-[13px] text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why choose us */}
      <section className={`${container} py-10`}>
        <h2 className="text-center text-[22px] font-bold">Why Choose New Visa?</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, title, lines, tone }) => (
            <li key={title} className="flex items-center gap-3 rounded-lg border border-line px-3 py-4 shadow-sm xl:gap-4 xl:px-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-full xl:size-14 ${tone}`}><Icon className="size-6 xl:size-7" strokeWidth={1.8} /></span>
              <span className="min-w-0 text-[12.5px] leading-snug text-ink-soft"><span className="mb-1 block text-[13.5px] font-semibold text-ink">{title}</span>{lines.join(" ")}</span>
            </li>
          ))}
        </ul>

        {/* CTA banner */}
        <div className="relative mt-6 overflow-hidden rounded-xl bg-brand-700 text-white">
          <div className="flex flex-col items-center gap-5 px-6 py-6 md:flex-row md:py-0 md:pl-0 md:pr-6">
            <PassportArt className="hidden h-[104px] w-[200px] shrink-0 md:block" />
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-[20px] font-bold xl:text-[22px]">Not sure which visa is right for you?</p>
              <p className="mt-1 text-[14px] text-white/90">Take our quick assessment and get personalized recommendations.</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-center gap-3">
              <Link href="/eligibility" className="whitespace-nowrap rounded-md bg-white px-5 py-3 text-[14px] font-semibold text-ink hover:bg-white/90">Get Free Assessment</Link>
              <Link href="/consultation" className="whitespace-nowrap rounded-md border border-white/80 px-5 py-3 text-[14px] font-semibold hover:bg-white/10">Book a Consultation</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Assurances */}
      <section className="border-t border-line bg-canvas/60">
        <ul className={`${container} grid grid-cols-2 gap-y-5 py-6 lg:grid-cols-4 lg:divide-x lg:divide-line`}>
          {ASSURANCES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4 lg:justify-center lg:px-4">
              <Icon className="size-7 shrink-0 text-ink-soft" strokeWidth={1.5} />
              <span className="text-[13px] leading-snug"><span className="block font-medium">{title}</span><span className="text-ink-soft">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
