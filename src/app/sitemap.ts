import type { MetadataRoute } from "next";
import { SERVICE_NAV } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";
import { VISA_SERVICES } from "@/lib/content/visa-services";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${site.url}${path}`;
  const staticPages = ["", "/immigration", "/countries", "/visa", "/eligibility", "/consultation", "/flights", "/hotels", "/flight-hotel", "/about", "/contact", "/faqs"];
  return [
    ...staticPages.map((p) => ({ url: url(p), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...SERVICE_NAV.map((s) => ({ url: url(s.href), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...COUNTRIES.map((c) => ({ url: url(`/countries/${c.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...VISA_SERVICES.map((s) => ({ url: url(`/visa/${s.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
