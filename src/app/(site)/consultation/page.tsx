import type { Metadata } from "next";
import { Phone, Video, Building2 } from "lucide-react";
import { ConsultationForm } from "@/components/forms/consultation-form";
import { PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { CATEGORY_BY_SLUG } from "@/lib/content/categories";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description: "Book a phone, video or in-office consultation with an immigration counsellor.",
  alternates: { canonical: "/consultation" },
};

export default async function ConsultationPage({ searchParams }: PageProps<"/consultation">) {
  const { country, visa } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Consultation" title="Talk to an immigration counsellor" description="Choose a phone call, video call or office visit at a time that suits you." />
      <Section>
        <Container className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <ConsultationForm
            defaultCountry={typeof country === "string" && COUNTRY_BY_SLUG.has(country) ? country : undefined}
            defaultVisa={typeof visa === "string" && CATEGORY_BY_SLUG.has(visa) ? visa : undefined}
          />
          <aside className="space-y-4 text-sm text-ink-soft">
            {[
              { icon: Phone, title: "Phone call", text: "A counsellor calls you at your chosen time." },
              { icon: Video, title: "Video call", text: "Meet online — a link is sent to your email." },
              { icon: Building2, title: "Office visit", text: "Meet in person at our office." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-line bg-white p-4">
                <Icon className="size-5 shrink-0 text-brand-600" />
                <div><p className="font-medium text-ink">{title}</p><p>{text}</p></div>
              </div>
            ))}
          </aside>
        </Container>
      </Section>
    </>
  );
}
