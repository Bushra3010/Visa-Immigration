import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

// Single typeface for every page (matches the MakeMyTrip-style design reference).
// Lato ships 300/400/700/900: Tailwind medium→400, semibold/bold→700, extrabold/black→900.
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["300", "400", "700", "900"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Visa, Immigration & Travel`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
