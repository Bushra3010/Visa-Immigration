import { ImmigrationHeader } from "@/components/immigration/immigration-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";

/** Immigration landing experience with its own utility bar and navigation. */
export default function ImmigrationLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ImmigrationHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
