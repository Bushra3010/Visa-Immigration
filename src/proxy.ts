import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistic redirect only — real authorization happens in pages, actions and RLS.
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
// CRM pages reachable without a session (everything else under /crm needs one).
const CRM_PUBLIC = ["/crm/login", "/crm/forgot-password", "/crm/reset-password"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const isCrm = pathname === "/crm" || pathname.startsWith("/crm/");
  if (configured && !user && isCrm && !CRM_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/crm/login", request.url));
  }
  if (configured && !user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
