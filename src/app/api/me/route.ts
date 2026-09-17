import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ signedIn: false });

  // RLS limits this to the viewer's own in-app notifications.
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("channel", "in_app")
    .is("read_at", null);

  return NextResponse.json(
    {
      signedIn: true,
      name: viewer.fullName,
      accountHref: viewer.role === "customer" ? "/dashboard" : "/admin",
      unreadNotifications: count ?? 0,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
