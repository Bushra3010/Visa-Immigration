import Link from "next/link";
import { SERVICE_NAV } from "@/lib/content/categories";
import { getContent } from "@/lib/content/store";
import { TRAVEL_ENABLED } from "@/lib/features";
import { site, siteAddress } from "@/lib/site";
import { Container } from "@/components/ui/primitives";
import { Logo } from "./logo";

export async function SiteFooter() {
  const { countries } = await getContent();
  const columns = [
    { title: "Destinations", links: countries.map((c) => ({ href: `/countries/${c.slug}`, label: c.name })) },
    { title: "Visa services", links: [...SERVICE_NAV.map((s) => ({ href: s.href, label: s.label })), { href: "/visa", label: "All services" }] },
    ...(TRAVEL_ENABLED ? [{ title: "Travel", links: [{ href: "/flights", label: "Flights" }, { href: "/hotels", label: "Hotels" }, { href: "/flight-hotel", label: "Flight + Hotel" }] }] : []),
    {
      title: "Company",
      links: [
        { href: "/about", label: "About Us" },
        { href: "/contact", label: "Contact Us" },
        { href: "/faqs", label: "FAQs" },
        { href: "/eligibility", label: "Free assessment" },
        { href: "/consultation", label: "Book consultation" },
      ],
    },
  ];
  return (
    <footer className="mt-auto border-t border-line bg-brand-900 text-brand-100 max-md:border-0 max-md:bg-pine-800">
      {/* Phone footer */}
      <div className="px-6 pb-8 pt-9 text-white md:hidden">
        <p className="font-display text-[22px] font-bold">NewVisa</p>
        <p className="mt-2 text-[12.5px] text-white/90">Your next chapter starts here.</p>
        <nav aria-label="Footer" className="mt-8 flex gap-1.5 text-[11px] font-semibold tracking-wide">
          <Link href="/about">ABOUT</Link>
          <Link href="/contact">CONTACT</Link>
          <Link href="/faqs">FAQs</Link>
        </nav>
        <address className="mt-6 text-[11px] not-italic leading-relaxed text-white/85">
          {siteAddress}<br />
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> · <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`}>{site.contact.phone}</a>
        </address>
        <p className="mt-6 text-[10px] leading-relaxed text-white/75">
          {site.business.tradeName} · Proprietor {site.business.proprietor}<br />
          GSTIN {site.business.gstin} · Udyam {site.business.udyam}
        </p>
        <p className="mt-3 text-[10px] text-white/75">Visa decisions are made by the relevant government authorities.</p>
      </div>
      <Container className="hidden gap-10 md:grid py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Logo tile height={56} className="w-fit" />
          <p className="mt-2 text-sm text-brand-200">{site.description}</p>
          <address className="mt-4 text-sm not-italic">
            {siteAddress}<br />
            <a href={`mailto:${site.contact.email}`} className="hover:text-white">{site.contact.email}</a><br />
            <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-white">{site.contact.phone}</a>
          </address>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-white">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-brand-200 hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="hidden border-t border-brand-700 py-6 md:block text-xs text-brand-200">
        <p>© {new Date().getFullYear()} {site.business.tradeName} (Proprietor: {site.business.proprietor}). Visa decisions are made solely by the relevant government authorities.</p>
        <p className="mt-1">GSTIN {site.business.gstin} · Udyam {site.business.udyam}</p>
      </Container>
    </footer>
  );
}
