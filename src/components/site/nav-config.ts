import { COUNTRIES } from "@/lib/content/countries";
import { SERVICE_NAV } from "@/lib/content/categories";

export type NavGroup = { label: string; href?: string; items?: { href: string; label: string; description?: string }[] };

/** Primary navigation (PRD §5.1), grouped so it fits on one row. */
export const NAV: NavGroup[] = [
  {
    label: "Immigration",
    items: [
      { href: "/immigration", label: "Immigration overview" },
      { href: "/visa", label: "Visa Services" },
      ...SERVICE_NAV.map((s) => ({ href: s.href, label: s.label })),
    ],
  },
  {
    label: "Countries",
    items: [...COUNTRIES.map((c) => ({ href: `/countries/${c.slug}`, label: c.name })), { href: "/countries", label: "All destinations" }],
  },
  {
    label: "Travel",
    items: [
      { href: "/flights", label: "Flight Booking" },
      { href: "/hotels", label: "Hotel Booking" },
      { href: "/flight-hotel", label: "Flight + Hotel" },
    ],
  },
  { label: "About Us", href: "/about" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact Us", href: "/contact" },
];
