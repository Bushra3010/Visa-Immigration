import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-xs">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-warning"><ShieldAlert className="size-6" /></span>
      <h1 className="mt-4 text-xl font-bold">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-muted">Your role doesn&apos;t include permission for this module. Ask a Super Admin if you need access.</p>
      <Link href="/crm" className={buttonClass("primary", "md", "mt-6")}>Back to dashboard</Link>
    </div>
  );
}
