import type { Metadata } from "next";
import { FaqList, JsonLd, PageHero, faqJsonLd } from "@/components/site/content-blocks";
import { CtaBand } from "@/components/site/cta-band";
import { Container, Section } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "FAQs", description: "Answers to common questions about visas, immigration services and travel bookings.", alternates: { canonical: "/faqs" } };

const GROUPS = [
  {
    title: "Immigration services",
    faqs: [
      { question: "Is the eligibility assessment free?", answer: "Yes. The online assessment is free and is reviewed by a counsellor." },
      { question: "Do you guarantee visa approval?", answer: "No. Visa decisions are made solely by government authorities. We help you prepare a complete, accurate application." },
      { question: "How do I track my application?", answer: "Log in to your dashboard to see your application status, documents, counsellor remarks and next steps." },
    ],
  },
  {
    title: "Documents",
    faqs: [
      { question: "Is it safe to upload my passport?", answer: "Documents are stored in private, access-controlled storage and are only visible to you and the staff handling your application." },
      { question: "What file types can I upload?", answer: "PDF, JPG, PNG and WebP files up to 10 MB each." },
    ],
  },
  {
    title: "Flights & hotels",
    faqs: [
      { question: "Where do flight and hotel prices come from?", answer: "Live availability and fares come from our authorised travel suppliers. Prices are rechecked just before you pay." },
      { question: "How do cancellations and refunds work?", answer: "Cancellation eligibility, fees and refund amounts are set by the airline or hotel's rules and are shown to you before you confirm a cancellation." },
    ],
  },
];

export default function FaqsPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(GROUPS.flatMap((g) => g.faqs))} />
      <PageHero eyebrow="Help" title="Frequently asked questions" />
      <Section>
        <Container className="max-w-3xl space-y-10">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="mb-4 text-xl font-semibold">{g.title}</h2>
              <FaqList faqs={g.faqs} />
            </div>
          ))}
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
