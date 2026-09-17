import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { flightSearchSchema } from "@/lib/travel/schemas";
import { searchFlights } from "@/lib/travel/service";

export async function POST(request: NextRequest) {
  if (!(await rateLimit("flight-search", 30, 60_000)).ok) {
    return NextResponse.json({ error: "Too many searches, please slow down" }, { status: 429 });
  }
  const parsed = flightSearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json({ offers: await searchFlights(parsed.data) });
  } catch (err) {
    console.error("Flight search failed", err);
    return NextResponse.json({ error: "Flight search is temporarily unavailable" }, { status: 502 });
  }
}
