import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** Shown in place of the traveller form while the site runs on demo data. */
export function DemoBookingNotice() {
  return (
    <div className="rounded-xl border border-line bg-white p-6 text-center">
      <p className="text-lg font-semibold">Online booking is coming soon</p>
      <p className="mt-1 text-sm text-muted">Fares shown are demo data. Our travel team can book this trip for you today.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link href="/contact" className={buttonClass("primary")}>Contact travel team</Link>
        <Link href="/consultation" className={buttonClass("secondary")}>Book consultation</Link>
      </div>
    </div>
  );
}
