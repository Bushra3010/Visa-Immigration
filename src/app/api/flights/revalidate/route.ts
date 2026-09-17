import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateFlight } from "@/lib/travel/service";

const schema = z.object({ offerId: z.string().min(8).max(4000), expectedTotal: z.number().positive().optional() });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    return NextResponse.json(await revalidateFlight(parsed.data.offerId, parsed.data.expectedTotal));
  } catch (err) {
    console.error("Fare revalidation failed", err);
    return NextResponse.json({ error: "Could not revalidate fare" }, { status: 502 });
  }
}
