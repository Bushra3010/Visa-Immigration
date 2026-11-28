import Link from "next/link";
import {
  ArrowRight, Award, BadgeCheck, Briefcase, Building2, CalendarCheck, CalendarDays, Camera, ClipboardCheck, Flag, Globe,
  GraduationCap, Headset, HeartHandshake, House, IdCard, Mail, MessagesSquare, PlaneTakeoff, Search, ShieldCheck, Users,
  type LucideIcon,
} from "lucide-react";
import { DestinationRail } from "@/components/site/destination-rail";
import { OffersSection } from "@/components/site/offers-section";
import { TravelSearch } from "@/components/travel/travel-search";
import { TRAVEL_ENABLED } from "@/lib/features";
import { getContent } from "@/lib/content/store";
import { countryPhoto } from "@/lib/content/country-photos";
import { MobileHome } from "@/components/site/mobile-home";

const HERO_IMAGE = "/Images/Desktop%20View%20Hero%20Section%20Image.webp";

// Marketing figures from the approved design — confirm they are accurate before launch.
const STATS = [
  { icon: ShieldCheck, title: "Trusted", lines: ["by 50K+", "Travelers"] },
  { icon: Globe, title: "150+", lines: ["Countries", "Covered"] },
  { icon: Headset, title: "Expert", lines: ["Visa", "Counsellors"] },
  { icon: BadgeCheck, title: "99%", lines: ["Success", "Rate"] },
];

/* Lead-generation CTAs available throughout the site (PRD §6.3). */
const LEAD_CTAS = [
  { icon: ShieldCheck, title: "Check Eligibility", sub: "7-step online assessment", href: "/eligibility" },
  { icon: ClipboardCheck, title: "Get Free Assessment", sub: "Reviewed by a counsellor", badge: "FREE", href: "/eligibility" },
  { icon: CalendarCheck, title: "Book Consultation", sub: "Phone, video or office", href: "/consultation" },
  { icon: MessagesSquare, title: "Talk to Counsellor", sub: "Destination specialists", href: "/consultation" },
  { icon: Mail, title: "Submit Enquiry", sub: "We'll get back to you", href: "/contact" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  student: GraduationCap, work: Briefcase, skilled: Award, visitor: Camera, business: Building2, family: Users,
  "permanent-residency": House, citizenship: Flag, dependent: HeartHandshake, "job-seeker": Search,
};

const shell = "mx-auto w-full max-w-[1360px] px-4 xl:px-0";
const card = "mt-6 rounded-2xl border border-line/70 bg-white px-5 pb-6 pt-5 shadow-[0_2px_16px_rgba(15,27,45,0.06)] sm:px-8";

export default async function HomePage() {
  const { countries, categories } = await getContent();
  const featured = ["canada", "australia", "uk", "usa"].flatMap((slug) => countries.filter((c) => c.slug === slug));
  const mobileDestinations = (featured.length === 4 ? featured : countries.slice(0, 4)).map((c) => ({
    slug: c.slug, name: c.name, isoCode: c.isoCode, photo: c.image ?? countryPhoto(c.slug),
  }));
  return (
    <>
    <MobileHome destinations={mobileDestinations} />
    <div className="hidden bg-[#f2f4f7] pb-10 md:block md:pb-16">
      <section className="relative">
        {/* Background grows with the hero copy and continues 72px behind the search card. */}
        <div className={`relative pb-7 ${TRAVEL_ENABLED ? "md:pb-[72px]" : "md:pb-12"}`}>
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative background, SVG or photo */}
          <img src={HERO_IMAGE} alt="" className="size-full object-cover object-[center_40%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a2c]/85 via-[#0d2a2c]/45 to-transparent" />
          </div>
          <div className={`relative ${shell} pb-5 pt-7 md:pt-[38px]`}>
          <div className="hidden items-start gap-8 md:grid lg:grid-cols-[1fr_538px]">
            <div className="text-white">
              <p className="text-[15px] font-medium uppercase tracking-wide text-white/90">{TRAVEL_ENABLED ? "Visa • Immigration • Travel" : "Visa • Immigration"}</p>
              <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-[-0.01em] sm:text-[48px]">Your Journey Abroad Starts Here</h1>
              <p className="mt-3 max-w-[500px] text-[18px] leading-[1.45] text-white/95">
                {TRAVEL_ENABLED
                  ? "Explore visa options by country, check your eligibility, work with a dedicated counsellor, and book your flights and hotels — all from one platform."
                  : "Explore visa options by country, check your eligibility and work with a dedicated counsellor — from your first question to your visa decision."}
              </p>
              <div className="mt-6 flex flex-wrap gap-5">
                <Link href="/immigration" className="flex h-[48px] items-center gap-3 rounded-md border border-white/40 bg-brand-600 px-5 text-[16px] font-semibold hover:bg-brand-700">
                  <IdCard className="size-5" strokeWidth={1.8} /> Explore Visa &amp; Immigration
                </Link>
                {TRAVEL_ENABLED ? (
                  <Link href="#book" className="flex h-[48px] items-center gap-3 rounded-md bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90">
                    <PlaneTakeoff className="size-5" strokeWidth={1.8} /> Book Flights &amp; Hotels
                  </Link>
                ) : (
                  <Link href="/eligibility" className="flex h-[48px] items-center gap-3 rounded-md bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90">
                    <ClipboardCheck className="size-5" strokeWidth={1.8} /> Get Free Assessment
                  </Link>
                )}
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
        {TRAVEL_ENABLED && (
          <div className={`relative -mt-3 ${shell} md:-mt-[72px]`}>
            <div id="book" className="scroll-mt-24">
              <TravelSearch />
            </div>
          </div>
        )}
      </section>

      <div className={shell}>
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

        {/* Country selection (PRD §5.2) */}
        <section aria-labelledby="destinations-heading" className={`${card} hidden md:block`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="destinations-heading" className="text-[28px] font-bold text-ink">Choose Your Destination</h2>
              <p className="text-[15px] text-ink-soft">Immigration, study, work and visit options by country</p>
            </div>
            <Link href="/countries" className="flex items-center gap-2 text-[15px] font-bold text-accent-500">VIEW ALL <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-5">
            <DestinationRail countries={countries.map((c) => ({ slug: c.slug, name: c.name, region: c.region, isoCode: c.isoCode, photo: c.image ?? countryPhoto(c.slug) }))} />
          </div>
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
            {categories.map((cat) => {
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
    </>
  );
}
