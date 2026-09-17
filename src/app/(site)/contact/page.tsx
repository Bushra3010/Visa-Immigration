import type { Metadata } from "next";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact Us", description: "Get in touch with our immigration and travel team.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Contact us" description="Send us an enquiry and our team will get back to you." />
      <Section>
        <Container className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <EnquiryForm />
          <aside className="rounded-xl border border-line bg-white p-6 text-sm">
            <p className="font-semibold text-ink">Reach us directly</p>
            <p className="mt-3 text-ink-soft">Email<br /><a className="text-brand-600" href={`mailto:${site.contact.email}`}>{site.contact.email}</a></p>
            <p className="mt-3 text-ink-soft">Phone<br />{site.contact.phone}</p>
          </aside>
        </Container>
      </Section>
    </>
  );
}
