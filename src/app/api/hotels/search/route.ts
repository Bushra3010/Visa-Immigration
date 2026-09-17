import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { hotelSearchSchema } from "@/lib/travel/schemas";
import { searchHotels } from "@/lib/travel/service";

export async function POST(request: NextRequest) {
  if (!(await rateLimit("hotel-search", 30, 60_000)).ok) {
    return NextResponse.json({ error: "Too many searches, please slow down" }, { status: 429 });
  }
  const parsed = hotelSearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json({ hotels: await searchHotels(parsed.data) });
  } catch (err) {
    console.error("Hotel search failed", err);
    return NextResponse.json({ error: "Hotel search is temporarily unavailable" }, { status: 502 });
  }
}
