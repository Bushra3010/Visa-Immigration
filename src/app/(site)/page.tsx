import Link from "next/link";
import {
  ChevronRight, ArrowRight, Award, BadgeCheck, Briefcase, Building2, CalendarCheck, CalendarDays, Camera, ClipboardCheck, Flag, Globe,
  GraduationCap, Headset, HeartHandshake, House, IdCard, Mail, MessagesSquare, PlaneTakeoff, Search, ShieldCheck, Users,
  type LucideIcon,
} from "lucide-react";
import { CountryFlag } from "@/components/site/country-flag";
import { OffersSection } from "@/components/site/offers-section";
import { TravelSearch } from "@/components/travel/travel-search";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";
import { COUNTRY_SHORT_NAMES, countryPhoto } from "@/lib/content/country-photos";

const HERO_IMAGE = "/Images/hero.png";

// Marketing figures from the approved design — confirm they are accurate before launch.
const STATS = [
  { icon: ShieldCheck, title: "Trusted", lines: ["by 50K+", "Travelers"] },
  { icon: Globe, title: "150+", lines: ["Countries", "Covered"] },
  { icon: Headset, title: "Expert", lines: ["Visa", "Counsellors"] },
  { icon: BadgeCheck, title: "99%", lines: ["Success", "Rate"] },
];

/* Lead-generation CTAs available throughout the site (PRD §6.3). */
const LEAD_CTAS = [
  { icon: ShieldCheck, title: "Check Eligibility", short: ["Check", "Eligibility"], sub: "7-step online assessment", href: "/eligibility" },
  { icon: ClipboardCheck, title: "Get Free Assessment", short: ["Free", "Assessment"], sub: "Reviewed by a counsellor", badge: "FREE", href: "/eligibility" },
  { icon: CalendarCheck, title: "Book Consultation", short: ["Book", "Consultation"], sub: "Phone, video or office", href: "/consultation" },
  { icon: MessagesSquare, title: "Talk to Counsellor", short: ["Talk to", "Counsellor"], sub: "Destination specialists", href: "/consultation" },
  { icon: Mail, title: "Submit Enquiry", short: ["Submit", "Enquiry"], sub: "We'll get back to you", href: "/contact" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  student: GraduationCap, work: Briefcase, skilled: Award, visitor: Camera, business: Building2, family: Users,
  "permanent-residency": House, citizenship: Flag, dependent: HeartHandshake, "job-seeker": Search,
};

/* Mobile "Popular Visa Services" order and short blurbs. */
const POPULAR_SERVICE_BLURBS: Record<string, string> = {
  student: "Study in top global universities",
  work: "Explore global career opportunities",
  visitor: "Travel the world with ease",
};
const POPULAR_SERVICES = [
  ...["student", "work", "visitor"].map((slug) => VISA_CATEGORIES.find((c) => c.slug === slug)!),
  ...VISA_CATEGORIES.filter((c) => !POPULAR_SERVICE_BLURBS[c.slug]),
];

const shell = "mx-auto w-full max-w-[1360px] px-4 xl:px-0";
const card = "mt-6 rounded-2xl border border-line/70 bg-white px-5 pb-6 pt-5 shadow-[0_2px_16px_rgba(15,27,45,0.06)] sm:px-8";

export default function HomePage() {
  return (
    <div className="bg-[#f2f4f7] pb-10 md:pb-16">
      <section className="relative">
        {/* Background grows with the hero copy and continues 72px behind the search card. */}
        <div className="relative pb-7 md:pb-[72px]">
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative background, SVG or photo */}
          <img src={HERO_IMAGE} alt="" className="size-full object-cover object-[center_40%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a2c]/85 via-[#0d2a2c]/45 to-transparent" />
          </div>
          <div className={`relative ${shell} pb-5 pt-7 md:pt-[38px]`}>
          {/* Phone hero */}
          <div className="text-white md:hidden">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-200">Visa • Immigration • Travel</p>
            <h1 className="mt-2 text-[29px] font-bold leading-[1.12] tracking-[-0.01em]">Your Journey Abroad Starts Here</h1>
            <div className="mt-3 grid grid-cols-[1fr_44%] items-start gap-3">
              <div>
                <p className="text-[13.5px] leading-[1.5] text-white/95">
                  Explore visa options by country, check your eligibility, work with a dedicated counsellor, and book your flights and hotels — all from one platform.
                </p>
              </div>
              <ul className="grid grid-cols-2 rounded-2xl bg-white px-1.5 py-2 text-ink shadow-lg" aria-label="Why NewVisa">
                {STATS.map(({ icon: Icon, title, lines }, i) => (
                  <li key={title} className={`flex flex-col items-center px-1 py-2 text-center ${i < 2 ? "border-b border-line" : ""} ${i % 2 === 0 ? "border-r border-line" : ""}`}>
                    <Icon className="size-7 text-brand-600" strokeWidth={1.4} />
                    <p className="mt-1.5 text-[12.5px] font-bold">{title}</p>
                    <p className="text-[11px] leading-snug text-ink-soft">{lines[0]}<br />{lines[1]}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 grid gap-2.5">
              <Link href="/immigration" className="flex min-h-12 items-center gap-3 rounded-lg border border-white/40 bg-brand-600 px-4 text-[15px] font-semibold">
                <IdCard className="size-5 shrink-0" strokeWidth={1.8} /><span className="flex-1">Explore Visa &amp; Immigration</span><ChevronRight className="size-5" />
              </Link>
              <Link href="/consultation" className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-4 text-[15px] font-semibold text-ink">
                <CalendarDays className="size-5 shrink-0" strokeWidth={1.8} /><span className="flex-1">Book Consultation</span><ChevronRight className="size-5" />
              </Link>
            </div>
          </div>

          <div className="hidden items-start gap-8 md:grid lg:grid-cols-[1fr_538px]">
            <div className="text-white">
              <p className="text-[15px] font-medium uppercase tracking-wide text-white/90">Visa • Immigration • Travel</p>
              <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-[-0.01em] sm:text-[48px]">Your Journey Abroad Starts Here</h1>
              <p className="mt-3 max-w-[500px] text-[18px] leading-[1.45] text-white/95">
                Explore visa options by country, check your eligibility, work with a dedicated counsellor, and book your flights and hotels — all from one platform.
              </p>
              <div className="mt-6 flex flex-wrap gap-5">
                <Link href="/immigration" className="flex h-[48px] items-center gap-3 rounded-md border border-white/40 bg-brand-600 px-5 text-[16px] font-semibold hover:bg-brand-700">
                  <IdCard className="size-5" strokeWidth={1.8} /> Explore Visa &amp; Immigration
                </Link>
                <Link href="#book" className="flex h-[48px] items-center gap-3 rounded-md bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90">
                  <PlaneTakeoff className="size-5" strokeWidth={1.8} /> Book Flights &amp; Hotels
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[15px] font-medium">
                <Link href="/eligibility" className="flex items-center gap-2 hover:underline"><span className="underline underline-offset-2">Check</span> your eligibility <ArrowRight className="size-4" /></Link>
                <span aria-hidden className="h-5 w-px bg-white/50" />
                <Link href="/consultation" className="flex items-center gap-2 hover:underline"><CalendarDays className="size-5" strokeWidth={1.6} /> Book a consultation</Link>
              </div>
            </div>

            <ul className="hidden grid-cols-4 divide-x divide-line rounded-2xl bg-white px-2 py-6 shadow-lg lg:mt-[86px] lg:grid" aria-label="Why NewVisa">
              {STATS.map(({ icon: Icon, title, lines }) => (
                <li key={title} className="flex flex-col items-center px-2 text-center">
                  <Icon className="size-9 text-brand-600" strokeWidth={1.4} />
                  <p className="mt-3 text-[16px] font-bold text-ink">{title}</p>
                  <p className="text-[15px] leading-snug text-ink">{lines[0]}<br />{lines[1]}</p>
                </li>
              ))}
            </ul>
          </div>

          </div>
        </div>
        <div className={`relative -mt-3 ${shell} md:-mt-[72px]`}>
          <div id="book" className="scroll-mt-24">
            <TravelSearch />
          </div>
        </div>
      </section>

      <div className={shell}>
        <ul className="mt-4 grid grid-cols-5 gap-0.5 rounded-2xl bg-white px-1.5 py-4 shadow-[0_2px_12px_rgba(15,27,45,0.08)] md:hidden">
          {LEAD_CTAS.map(({ icon: Icon, title, short, badge, href }) => (
            <li key={title}>
              <Link href={href} className="flex flex-col items-center gap-2 text-center">
                <span className="relative grid size-11 place-items-center rounded-xl bg-brand-50">
                  <Icon className="size-6 text-brand-600" strokeWidth={1.5} />
                  {badge && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-brand-600 px-1.5 py-px text-[9px] font-bold text-white">{badge}</span>}
                </span>
                <span className="text-[11px] leading-tight tracking-tight text-ink">{short[0]}<br />{short[1]}</span>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mx-auto mt-6 hidden max-w-[1180px] flex-wrap items-stretch rounded-xl bg-white shadow-[0_2px_12px_rgba(15,27,45,0.08)] md:flex lg:flex-nowrap">
          {LEAD_CTAS.map(({ icon: Icon, title, sub, badge, href }, i) => (
            <li key={title} className={`flex flex-1 basis-1/2 lg:basis-auto ${i > 0 ? "lg:border-l lg:border-line" : ""}`}>
              <Link href={href} className="my-2 flex w-full items-center gap-4 px-5 py-2.5 hover:bg-canvas/60">
                <Icon className="size-7 shrink-0 text-accent-500" strokeWidth={1.4} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium text-ink">
                    {title}
                    {badge && <span className="rounded-full bg-brand-600 px-1.5 py-px text-[9px] font-bold text-white">{badge}</span>}
                  </span>
                  <span className="block truncate text-[12px] text-ink-soft">{sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Country selection (PRD §5.2) — phone */}
        <section aria-labelledby="m-destinations-heading" className="mt-6 md:hidden">
          <div className="flex items-center justify-between">
            <h2 id="m-destinations-heading" className="text-[19px] font-bold text-ink">Choose Your Destination</h2>
            <Link href="/countries" className="flex items-center gap-1 text-[14px] font-medium text-brand-600">View All <ChevronRight className="size-4" /></Link>
          </div>
          <ul className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {COUNTRIES.map((c) => {
              const photo = countryPhoto(c.slug);
              return (
                <li key={c.slug} className="w-[calc((100vw-64px)/5)] min-w-[64px] shrink-0 snap-start">
                  <Link href={`/countries/${c.slug}`} className="block overflow-hidden rounded-lg bg-white shadow-[0_2px_10px_rgba(15,27,45,0.08)]">
                    <span className="relative block">
                      <span className="block h-[70px] overflow-hidden rounded-t-lg bg-canvas">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- optional local photo
                          <img src={photo} alt="" className="size-full object-cover" />
                        ) : (
                          <CountryFlag isoCode={c.isoCode} name={c.name} className="size-full" />
                        )}
                      </span>
                      <span className="absolute -bottom-2.5 left-1.5 size-6 overflow-hidden rounded-full border-2 border-white bg-white shadow">
                        <CountryFlag round isoCode={c.isoCode} name={c.name} className="size-full" />
                      </span>
                    </span>
                    <span className="block truncate px-1.5 pb-2 pt-4 text-[12px] font-semibold text-ink">{COUNTRY_SHORT_NAMES[c.slug] ?? c.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Popular visa services — phone */}
        <section aria-labelledby="m-services-heading" className="mt-6 md:hidden">
          <h2 id="m-services-heading" className="text-[19px] font-bold text-ink">Popular Visa Services</h2>
          <ul className="-mx-4 mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {POPULAR_SERVICES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] ?? IdCard;
              return (
                <li key={cat.slug} className="w-[190px] shrink-0 snap-start">
                  <Link href={`/visa?category=${cat.slug}`} className="flex h-full items-start gap-2.5 rounded-xl bg-white p-3 shadow-[0_2px_10px_rgba(15,27,45,0.08)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50"><Icon className="size-5 text-brand-700" strokeWidth={1.5} /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink">{cat.name}</span>
                      <span className="mt-1 block text-[12px] leading-snug text-ink-soft">{POPULAR_SERVICE_BLURBS[cat.slug] ?? cat.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Country selection (PRD §5.2) */}
        <section aria-labelledby="destinations-heading" className={`${card} hidden md:block`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="destinations-heading" className="text-[28px] font-bold text-ink">Choose Your Destination</h2>
              <p className="text-[15px] text-ink-soft">Immigration, study, work and visit options by country</p>
            </div>
            <Link href="/countries" className="flex items-center gap-2 text-[15px] font-bold text-accent-500">VIEW ALL <ArrowRight className="size-4" /></Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {COUNTRIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/countries/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand-200 hover:shadow-md">
                  <span className="relative block aspect-[16/9] overflow-hidden border-b border-line bg-canvas">
                    <CountryFlag isoCode={c.isoCode} name={c.name} className="size-full transition-transform duration-300 group-hover:scale-105" />
                  </span>
                  <span className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold text-ink group-hover:text-brand-600">{c.name}</span>
                      <span className="block text-[13px] text-ink-soft">{c.region}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/countries" className="group flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-brand-200 text-brand-600 hover:bg-brand-50">
                <span className="grid aspect-[16/9] place-items-center border-b border-dashed border-brand-200 bg-brand-50/60">
                  <Globe className="size-10" strokeWidth={1.2} />
                </span>
                <span className="flex items-center justify-between gap-2 px-4 py-3">
                  <span>
                    <span className="block text-[16px] font-semibold">Other destinations</span>
                    <span className="block text-[13px] text-ink-soft">Explore more countries</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0" />
                </span>
              </Link>
            </li>
          </ul>
        </section>

        {/* Visa category shortcuts (PRD §5.2) */}
        <section aria-labelledby="categories-heading" className={`${card} hidden md:block`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="categories-heading" className="text-[28px] font-bold text-ink">Find the Right Visa</h2>
              <p className="text-[15px] text-ink-soft">Browse by visa category</p>
            </div>
            <Link href="/visa" className="flex items-center gap-2 text-[15px] font-bold text-accent-500">ALL VISA SERVICES <ArrowRight className="size-4" /></Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {VISA_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] ?? IdCard;
              return (
                <li key={cat.slug}>
                  <Link href={`/visa?category=${cat.slug}`} className="group flex h-full flex-col items-center rounded-xl border border-line px-3 py-5 text-center hover:border-brand-200 hover:shadow-md">
                    <Icon className="size-8 text-brand-600" strokeWidth={1.4} />
                    <span className="mt-3 text-[15px] font-semibold text-ink group-hover:text-brand-600">{cat.name}</span>
                    <span className="mt-1 text-[12px] leading-snug text-ink-soft">{cat.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-6">
          <OffersSection />
        </div>
      </div>
    </div>
  );
}
