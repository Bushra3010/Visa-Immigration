import Link from "next/link";
import { COUNTRIES } from "@/lib/content/countries";
import { SERVICE_NAV } from "@/lib/content/categories";
import { site } from "@/lib/site";
import { Container } from "@/components/ui/primitives";
import { Logo } from "./logo";

export function SiteFooter() {
  const columns = [
    { title: "Destinations", links: COUNTRIES.map((c) => ({ href: `/countries/${c.slug}`, label: c.name })) },
    { title: "Visa services", links: [...SERVICE_NAV.map((s) => ({ href: s.href, label: s.label })), { href: "/visa", label: "All services" }] },
    { title: "Travel", links: [{ href: "/flights", label: "Flights" }, { href: "/hotels", label: "Hotels" }, { href: "/flight-hotel", label: "Flight + Hotel" }] },
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
    <footer className="mt-auto border-t border-line bg-brand-900 text-brand-100">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Logo tile height={56} className="w-fit" />
          <p className="mt-2 text-sm text-brand-200">{site.description}</p>
          <p className="mt-4 text-sm">{site.contact.email}<br />{site.contact.phone}</p>
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
      <Container className="border-t border-brand-700 py-6 text-xs text-brand-200">
        © {new Date().getFullYear()} {site.name}. Visa decisions are made solely by the relevant government authorities.
      </Container>
    </footer>
  );
}
