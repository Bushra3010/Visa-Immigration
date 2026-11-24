import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import logo from "../../../../public/Images/logo-cropped.png";

export default function CrmPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-pine-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-pine-600/40 blur-3xl" />
        <div className="relative inline-flex w-fit rounded-xl bg-white px-3 py-2"><Image src={logo} alt="New Visa" height={44} style={{ width: "auto", height: 44 }} priority /></div>
        <div className="relative max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-200">Consultancy CRM</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">Every lead, visa file and rupee, in one place.</h1>
          <p className="mt-4 text-white/70">Pipeline, customers, visa applications, documents, payments and expenses for the New Visa team.</p>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/60"><ShieldCheck className="size-4" />Authorised staff only. Activity is logged.</p>
      </div>
      <div className="flex flex-col items-center justify-center bg-canvas px-4 py-12">
        <div className="mb-8 rounded-xl bg-white px-3 py-2 shadow-sm lg:hidden"><Image src={logo} alt="New Visa" height={40} style={{ width: "auto", height: 40 }} priority /></div>
        <main className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl shadow-ink/5 sm:p-8">{children}</main>
        <p className="mt-6 text-xs text-muted">© {new Date().getFullYear()} New Visa Global Odyssey</p>
      </div>
    </div>
  );
}
