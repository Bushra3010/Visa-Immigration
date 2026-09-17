/**
 * Homepage offers (design placeholders). Replace with real, approved offers
 * before launch — every discount shown to customers must be honoured.
 * `image` is a path under /public; cards fall back to an illustration.
 */
export type OfferCategory = "flights" | "hotels" | "package" | "visa";

export type Offer = {
  id: string;
  category: OfferCategory;
  tag: string;
  title: string;
  description: string;
  href: string;
  image?: string;
  tone: string; // fallback gradient
};

/** Offer categories follow the platform's services (PRD §5.2, §8.10). */
export const OFFER_TABS: { id: "all" | OfferCategory; label: string }[] = [
  { id: "all", label: "All Offers" },
  { id: "flights", label: "Flights" },
  { id: "hotels", label: "Hotels" },
  { id: "package", label: "Flight + Hotel" },
  { id: "visa", label: "Visa & Immigration" },
];

export const OFFERS: Offer[] = [
  { id: "intl-flights-40", category: "flights", tag: "INTL FLIGHTS", title: "Up to 40% OFF* on International Flights", description: "Fly to top destinations across the globe with exclusive fares.", href: "/flights", tone: "from-sky-300 via-indigo-300 to-amber-200" },
  { id: "fly-fest", category: "flights", tag: "INTL FLIGHTS", title: "The Only Fest You Need to Fly", description: "Special fares on business and economy for a limited time.", href: "/flights", tone: "from-slate-700 via-slate-500 to-sky-300" },
  { id: "dom-flat-12", category: "flights", tag: "DOM FLIGHTS", title: "Save Flat 12%", description: "On domestic flight bookings made on NewVisa.", href: "/flights", tone: "from-sky-400 via-sky-200 to-amber-100" },
  { id: "hotels-stay", category: "hotels", tag: "HOTELS", title: "Stay More, Save More", description: "Extra savings on stays of 3 nights or longer.", href: "/hotels", tone: "from-emerald-300 via-teal-200 to-amber-100" },
  { id: "flight-hotel", category: "package", tag: "FLIGHT + HOTEL", title: "Book Flight + Hotel Together", description: "Plan your trip in one flow under a single Travel Booking ID.", href: "/flight-hotel", tone: "from-teal-500 via-cyan-300 to-yellow-100" },
  { id: "free-assessment", category: "visa", tag: "VISA", title: "Free Eligibility Assessment", description: "Check your eligibility and get matched with a counsellor.", href: "/eligibility", tone: "from-green-600 via-green-400 to-lime-200" },
  { id: "consultation", category: "visa", tag: "IMMIGRATION", title: "Talk to a Visa Counsellor", description: "Book a phone, video or office consultation.", href: "/consultation", tone: "from-emerald-700 via-emerald-500 to-teal-200" },
];
