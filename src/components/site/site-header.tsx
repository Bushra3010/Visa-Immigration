import { AccountActions } from "./account-actions";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";
import { getContent } from "@/lib/content/store";
import { buildNav } from "./nav-config";

// Kept free of request data so marketing pages stay statically rendered (SEO, §11);
// the signed-in state is resolved client-side in AccountActions.
export async function SiteHeader() {
  const { countries } = await getContent();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white">
      <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6 2xl:gap-14">
        <Logo height={58} />
        <MainNav groups={buildNav(countries)} />
        <div className="ml-auto hidden items-center gap-6 xl:flex">
          <LocaleSwitcher />
          <AccountActions />
        </div>
      </div>
    </header>
  );
}
