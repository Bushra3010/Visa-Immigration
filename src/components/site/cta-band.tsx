import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export function CtaBand({ title = "Not sure which visa is right for you?", description = "Take the free eligibility assessment and a counsellor will review your profile." }: { title?: string; description?: string }) {
  return (
    <section className="bg-brand-700 py-12 text-white">
      <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-brand-100">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/eligibility" variant="accent" size="lg">Get free assessment</ButtonLink>
          <ButtonLink href="/consultation" variant="secondary" size="lg">Book consultation</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
