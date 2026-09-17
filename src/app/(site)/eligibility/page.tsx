import type { Metadata } from "next";
import { EligibilityForm } from "@/components/forms/eligibility-form";
import { PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { OBJECTIVE_TO_CATEGORY } from "@/lib/leads/schemas";

export const metadata: Metadata = {
  title: "Free Eligibility Assessment",
  description: "Check your eligibility to study, work, visit or settle abroad with our free 7-step online assessment.",
  alternates: { canonical: "/eligibility" },
};

export default async function EligibilityPage({ searchParams }: PageProps<"/eligibility">) {
  const { country, visa } = await searchParams;
  const defaultCountry = typeof country === "string" && COUNTRY_BY_SLUG.has(country) ? country : undefined;
  const defaultObjective =
    typeof visa === "string" ? Object.entries(OBJECTIVE_TO_CATEGORY).find(([, cat]) => cat === visa)?.[0] : undefined;

  return (
    <>
      <PageHero eyebrow="Free assessment" title="Check your eligibility" description="Takes about 5 minutes. A counsellor reviews every assessment personally." />
      <Section>
        <Container>
          <EligibilityForm defaultCountry={defaultCountry} defaultObjective={defaultObjective} />
        </Container>
      </Section>
    </>
  );
}
