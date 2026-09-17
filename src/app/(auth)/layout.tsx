import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 px-4 py-12">
      <Logo tile height={64} className="mb-8 px-4 py-2" />
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">{children}</main>
    </div>
  );
}
