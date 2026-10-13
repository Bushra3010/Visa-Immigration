import { describe, expect, it, vi } from "vitest";
import {
  formatFaqs, formatList, formatOptions, formatSteps, parseFaqs, parseList, parseOptions, parseSteps, SLUG_PATTERN,
} from "@/lib/content/cms-format";
import { COUNTRIES } from "@/lib/content/countries";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { categoryColumns, countryColumns, serviceColumns } from "@/lib/content/rows";
import { VISA_SERVICES } from "@/lib/content/visa-services";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
const { toCategory, toCountry, toService } = await import("@/lib/content/store");

describe("CMS text formats", () => {
  it("parses one item per line, ignoring blanks and padding", () => {
    expect(parseList("  Passport \n\n Photos\r\n")).toEqual(["Passport", "Photos"]);
  });

  it("keeps extra pipes in the last part", () => {
    expect(parseFaqs("Fees? | Varies | ask us")).toEqual([{ question: "Fees?", answer: "Varies | ask us" }]);
  });

  it("drops FAQs without an answer", () => {
    expect(parseFaqs("Just a question\nQ | A")).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("makes the immigration option visa slug optional", () => {
    expect(parseOptions("PR | Points-based | canada-pr\nWork permit | Employer-specific")).toEqual([
      { title: "PR", description: "Points-based", visaSlug: "canada-pr" },
      { title: "Work permit", description: "Employer-specific" },
    ]);
  });

  it("round-trips every bundled page through the editor formats", () => {
    for (const c of COUNTRIES) {
      expect(parseList(formatList(c.why))).toEqual(c.why);
      expect(parseOptions(formatOptions(c.immigrationOptions))).toEqual(c.immigrationOptions);
      expect(parseFaqs(formatFaqs(c.faqs))).toEqual(c.faqs);
    }
    for (const s of VISA_SERVICES) {
      expect(parseSteps(formatSteps(s.process))).toEqual(s.process);
      expect(parseFaqs(formatFaqs(s.faqs))).toEqual(s.faqs);
    }
  });

  it("accepts only URL-safe slugs", () => {
    expect(SLUG_PATTERN.test("new-zealand")).toBe(true);
    for (const bad of ["New Zealand", "-uk", "uk-", "a--b", "uae/dubai"]) expect(SLUG_PATTERN.test(bad)).toBe(false);
  });
});

describe("CMS database mapping", () => {
  const seo = { title: undefined, description: undefined };

  it("restores countries exactly from their columns", () => {
    for (const c of COUNTRIES) {
      const { name, region, iso_code, summary, content, seo: seoJson } = countryColumns(c);
      expect(toCountry({ slug: c.slug, name, region, iso_code, summary, content, seo: seoJson })).toEqual({ ...c, seo });
    }
  });

  it("restores visa services exactly from their columns", () => {
    for (const s of VISA_SERVICES) {
      const cols = serviceColumns(s);
      expect(toService({ slug: s.slug, ...cols, country: { slug: s.countrySlug }, category: { slug: s.categorySlug } })).toEqual({ ...s, seo });
    }
  });

  it("restores categories exactly from their columns", () => {
    for (const c of VISA_CATEGORIES) expect(toCategory({ slug: c.slug, ...categoryColumns(c) })).toEqual(c);
  });

  it("tolerates rows with empty or malformed content", () => {
    const country = toCountry({ slug: "x", name: "X", region: null, iso_code: null, summary: null, content: { why: "not a list", faqs: [{ question: 1 }] }, seo: {} });
    expect(country.why).toEqual([]);
    expect(country.faqs).toEqual([]);
    expect(country.work).toBe("");
  });
});
