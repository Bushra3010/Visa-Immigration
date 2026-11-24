import "server-only";
import { cookies } from "next/headers";

/** One-shot toast shown after a redirect (read and cleared by the CRM ToastProvider). */
export async function flash(message: string, tone: "success" | "error" = "success") {
  (await cookies()).set("crm_flash", Buffer.from(JSON.stringify({ message, tone })).toString("base64url"), {
    path: "/crm",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
