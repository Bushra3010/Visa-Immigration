import { notFound } from "next/navigation";
import { TRAVEL_ENABLED } from "@/lib/features";

// Flight and hotel booking is switched off (see src/lib/features.ts).
export default function TravelOnlyLayout({ children }: { children: React.ReactNode }) {
  if (!TRAVEL_ENABLED) notFound();
  return children;
}
