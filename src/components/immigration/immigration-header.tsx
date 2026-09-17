import { Globe, Mail, Phone, ShieldCheck, Star } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { MainNav } from "@/components/site/main-nav";
import type { NavGroup } from "@/components/site/nav-config";
import { SERVICE_NAV, VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";
import { site } from "@/lib/site";
import { ImmigrationAccountActions } from "./account-actions";

const NAV: NavGroup[] = [
  { label: "Visa by Country", items: [...COUNTRIES.map((c) => ({ href: `/countries/${c.slug}`, label: c.name })), { href: "/countries", label: "All countries" }] },
  { label: "Visa by Type", items: [...VISA_CATEGORIES.map((c) => ({ href: `/visa?category=${c.slug}`, label: c.name })), { href: "/visa", label: "All visa services" }] },
  {
    label: "Our Services",
    items: [
      ...SERVICE_NAV.map((s) => ({ href: s.href, label: s.label })),
      { href: "/flights", label: "Flight Booking" },
      { href: "/hotels", label: "Hotel Booking" },
      { href: "/flight-hotel", label: "Flight + Hotel" },
    ],
  },
  { label: "Resources", items: [{ href: "/faqs", label: "FAQs" }, { href: "/about", label: "About Us" }, { href: "/contact", label: "Contact Us" }] },
  { label: "Track Application", href: "/dashboard/applications" },
];

export function ImmigrationHeader() {
  return (
    <>
      <div className="bg-brand-900 text-[13px] text-white">
        <div className="mx-auto flex h-11 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          {/* Marketing figures — confirm before launch. */}
          <ul className="hidden items-center gap-6 md:flex">
            <li className="flex items-center gap-2"><Globe className="size-4" strokeWidth={1.8} /> 150+ Countries</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4" strokeWidth={1.8} /> Trusted by 50K+ Travelers</li>
            <li className="flex items-center gap-2"><Star className="size-4" strokeWidth={1.8} /> 99% Success Rate</li>
          </ul>
          <div className="ml-auto flex items-center gap-6">
            <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hidden items-center gap-2 hover:underline sm:flex"><Phone className="size-4" strokeWidth={1.8} /> {site.contact.phone}</a>
            <a href={`mailto:${site.contact.email}`} className="flex items-center gap-2 hover:underline"><Mail className="size-4" strokeWidth={1.8} /> {site.contact.email}</a>
            <span className="flex items-center gap-1.5" title="More languages coming soon"><Globe className="size-4" strokeWidth={1.8} /> EN</span>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center gap-4 px-4 sm:px-8">
          <Logo height={52} />
          <div className="ml-auto flex items-center">
            <MainNav groups={NAV} breakpoint="lg" mobileTop={76} />
          </div>
          <div className="hidden items-center gap-2 lg:flex xl:gap-3">
            <ImmigrationAccountActions />
          </div>
        </div>
      </header>
    </>
  );
}
