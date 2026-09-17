import { NextResponse, type NextRequest } from "next/server";
import { searchHotelDestinations, searchPlaces } from "@/lib/travel/service";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const type = request.nextUrl.searchParams.get("type") === "hotel" ? "hotel" : "airport";
  try {
    const places = type === "hotel" ? await searchHotelDestinations(q) : await searchPlaces(q);
    return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (err) {
    console.error("Place search failed", err);
    return NextResponse.json({ error: "Place search is temporarily unavailable" }, { status: 502 });
  }
}
