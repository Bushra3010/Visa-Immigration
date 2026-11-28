import Link from "next/link";
import { BriefcaseBusiness, Check, Luggage, Plus, School, type LucideIcon } from "lucide-react";
import { CountryFlag } from "./country-flag";
import { JourneyPicker } from "./journey-picker";
import { TRAVEL_ENABLED } from "@/lib/features";

/** Set to a photo path (e.g. "/Images/hero-mobile.jpg") to replace the illustrated hero. */
const MOBILE_HERO_IMAGE: string | null = "/Images/Mobile%20View%20Hero%20Section%20Image.jpeg";

type Destination = { slug: string; name: string; isoCode: string; photo: string | null };

const HELP: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Study abroad", href: "/visa?category=student", icon: School },
  { label: "Work abroad", href: "/visa?category=work", icon: BriefcaseBusiness },
  { label: "Visit a country", href: "/visa?category=visitor", icon: Luggage },
];

const serif = "font-display font-bold tracking-[-0.01em] text-pine-900";

/** Phone-only home page (hidden from md up, where the desktop layout takes over). */
export function MobileHome({ destinations }: { destinations: Destination[] }) {
  return (
    <div className="bg-sage-50 pb-8 md:hidden">
      <section className="relative overflow-hidden bg-pine-800 px-6 pb-[132px] pt-10 text-white">
        {MOBILE_HERO_IMAGE ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative hero photo */}
            <img src={MOBILE_HERO_IMAGE} alt="" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-pine-900/80 via-pine-900/50 to-pine-900/30" />
          </>
        ) : (
          <HeroArt />
        )}
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">{TRAVEL_ENABLED ? "Visa · Immigration · Travel" : "Visa · Immigration"}</p>
          <h1 className="mt-3 font-display text-[33px] font-bold leading-[1.12] tracking-[-0.01em]">Your journey<br />abroad starts here.</h1>
          <p className="mt-4 max-w-[260px] text-[14px] leading-[1.5] text-white/95">{TRAVEL_ENABLED ? "Visa guidance, expert support and travel booking — all in one place." : "Visa guidance and expert support — all in one place."}</p>
          <Link href="/eligibility" className="mt-6 inline-flex h-12 items-center rounded-lg bg-white px-9 text-[14px] font-bold text-pine-900 shadow-sm">
            Check eligibility →
          </Link>
          <p className="mt-6 text-[12.5px] font-bold">✓ Free 7-step assessment</p>
          <p className="mt-1.5 text-[12.5px] text-white/90">50K+ travellers supported · 150+ countries</p>
        </div>
      </section>

      <div className="px-[18px]">
        <section aria-labelledby="m-journey" className="relative -mt-[110px] rounded-[20px] bg-white px-5 pb-3 pt-6 shadow-[0_8px_28px_rgba(23,63,51,0.10)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Start your journey</p>
          <h2 id="m-journey" className={`mt-1.5 text-[21px] ${serif}`}>Find the right visa</h2>
          <p className="mt-1.5 text-[13px] text-ink-soft">Tell us your plans. We&apos;ll help you explore.</p>
          <JourneyPicker />
        </section>
      </div>

      <section aria-labelledby="m-help" className="mt-8 px-5">
        <h2 id="m-help" className={`text-[21px] ${serif}`}>How can we help?</h2>
        <ul className="mt-4 grid grid-cols-3 gap-2.5">
          {HELP.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link href={href} className="flex h-[92px] flex-col items-center justify-center gap-2.5 rounded-2xl bg-white px-1 text-center shadow-[0_2px_14px_rgba(23,63,51,0.07)]">
                <span className="grid size-9 place-items-center rounded-full bg-sage-100">
                  <Icon className="size-5 text-pine-800" strokeWidth={1.5} />
                </span>
                <span className="text-[12px] font-bold text-pine-900">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="m-destinations" className="mt-9 px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="m-destinations" className={`text-[21px] ${serif}`}>Popular destinations</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Explore your options around the world</p>
          </div>
          <Link href="/countries" className="mt-1.5 shrink-0 text-[12px] font-bold tracking-wide text-pine-800">VIEW ALL</Link>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3.5">
          {destinations.map((d, i) => (
            <li key={d.slug}>
              <Link href={`/countries/${d.slug}`} className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(23,63,51,0.07)]">
                <span className="relative block h-[72px] overflow-hidden">
                  {d.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- optional local/CMS photo
                    <img src={d.photo} alt="" className="size-full object-cover" />
                  ) : (
                    <DestinationArt variant={i} />
                  )}
                  <span className="absolute left-2.5 top-2.5 h-3.5 w-[19px] overflow-hidden rounded-[3px] shadow-sm ring-2 ring-white">
                    <CountryFlag isoCode={d.isoCode} name={d.name} className="size-full" />
                  </span>
                </span>
                <span className="block px-3.5 pb-4 pt-3">
                  <span className="block truncate text-[15px] font-bold text-ink">{d.name}</span>
                  <span className="mt-1 block text-[11px] text-ink-soft">Study · Work · Visit</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="m-guidance" className="relative mx-5 mt-6 overflow-hidden rounded-2xl bg-sage-100 px-5 pb-6 pt-7">
        <span aria-hidden className="absolute -right-6 top-6 size-[124px] rounded-full bg-sage-200/70" />
        <span aria-hidden className="absolute right-[2px] top-[34px] size-[76px] rounded-full bg-sage-200" />
        <div className="relative">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-pine-600">Personal guidance</p>
          <h2 id="m-guidance" className={`mt-2 text-[19px] leading-[1.25] ${serif}`}>A real person,<br />every step of the way.</h2>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-[11.5px] text-ink-soft">Talk to a destination specialist.</p>
            <Link href="/consultation" className="shrink-0 rounded-full bg-pine-800 px-4 py-2 text-[11px] font-bold tracking-wide text-white">BOOK A CALL →</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="m-confidence" className="mt-8 px-5">
        <h2 id="m-confidence" className={`text-[21px] ${serif}`}>Travel with confidence</h2>
        <ul className="mt-5 space-y-5 pl-2.5">
          {[
            { icon: Check, title: "Expert counsellors", sub: "Guidance tailored to your plans" },
            { icon: Plus, title: "One simple platform", sub: TRAVEL_ENABLED ? "Visa support and travel booking" : "Applications, documents and updates" },
          ].map(({ icon: Icon, title, sub }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-sage-100">
                <Icon className="size-4 text-pine-800" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[13px] font-bold text-pine-900">{title}</span>
                <span className="mt-0.5 block text-[10.5px] text-ink-soft">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Illustrated mountains used until a hero photo is supplied. */
function HeroArt() {
  return (
    <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 430 440" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="m-hero-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b4639" />
          <stop offset="1" stopColor="#2a6250" />
        </linearGradient>
      </defs>
      <rect width="430" height="440" fill="url(#m-hero-sky)" />
      <circle cx="355" cy="94" r="47" fill="#a8a77f" />
      <path d="M0 330 L95 190 L175 290 L270 150 L380 285 L430 235 V440 H0 Z" fill="#3c705e" opacity="0.75" />
      <path d="M270 150 L300 194 L282 186 L262 206 L246 186 Z" fill="#cfe0d4" opacity="0.35" />
      <path d="M0 380 L120 250 L200 330 L300 230 L430 360 V440 H0 Z" fill="#2f6352" />
      <path d="M0 440 V410 Q110 360 215 400 T430 395 V440 Z" fill="#1d4a3c" />
    </svg>
  );
}

const ART = [
  { sky: "#dfece4", back: "#9cbfac", front: "#6d9a84", shape: "peaks", sun: true },
  { sky: "#dce8ee", back: "#a9bfca", front: "#86a6b3", shape: "peaks", sun: false },
  { sky: "#f1e4d6", back: "#e2c9ad", front: "#b98a5e", shape: "waves", sun: false },
  { sky: "#dfeae3", back: "#bcd3c4", front: "#6f9a80", shape: "waves", sun: false },
] as const;

/** Small landscape header for destination cards without a photo. */
function DestinationArt({ variant }: { variant: number }) {
  const a = ART[variant % ART.length];
  return (
    <svg aria-hidden className="size-full" viewBox="0 0 190 72" preserveAspectRatio="none">
      <rect width="190" height="72" fill={a.sky} />
      {a.sun && <circle cx="38" cy="30" r="8" fill="#ffffff" opacity="0.9" />}
      {a.shape === "peaks" ? (
        <>
          <path d="M0 72 L0 44 L40 22 L75 50 L110 14 L150 46 L190 28 V72 Z" fill={a.back} />
          <path d="M0 72 L0 58 L55 36 L95 60 L140 34 L190 56 V72 Z" fill={a.front} />
        </>
      ) : (
        <>
          <path d="M0 72 V48 Q50 24 100 40 T190 30 V72 Z" fill={a.back} />
          <path d="M0 72 V56 Q55 36 105 52 T190 46 V72 Z" fill={a.front} />
        </>
      )}
    </svg>
  );
}
