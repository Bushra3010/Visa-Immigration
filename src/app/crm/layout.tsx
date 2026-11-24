import type { Metadata } from "next";
import { ToastProvider } from "@/components/crm/toast";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s · New Visa CRM" },
  robots: { index: false, follow: false },
};

export default function CrmRootLayout({ children }: LayoutProps<"/crm">) {
  return <ToastProvider><div className="crm-app contents">{children}</div></ToastProvider>;
}
