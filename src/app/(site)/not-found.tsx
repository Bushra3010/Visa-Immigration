import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink-soft">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className={buttonClass("primary")}>Go home</Link>
        <Link href="/contact" className={buttonClass("secondary")}>Contact us</Link>
      </div>
    </Container>
  );
}
