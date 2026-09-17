"use client";

import Link from "next/link";
import { useMe } from "@/components/site/account-actions";

export function ImmigrationAccountActions() {
  const me = useMe();
  return (
    <>
      <Link
        href={me?.signedIn ? me.accountHref : "/login"}
        className="whitespace-nowrap rounded-md border border-ink/70 px-3 py-2 text-[13.5px] xl:px-4 xl:text-sm font-medium text-ink hover:border-brand-600 hover:text-brand-600"
      >
        {me?.signedIn ? "My Account" : "Login / Register"}
      </Link>
      <Link href="/eligibility" className="whitespace-nowrap rounded-md bg-brand-600 px-3 py-2.5 text-[13.5px] xl:px-4 xl:text-sm font-semibold text-white hover:bg-brand-700">
        Apply for Visa
      </Link>
    </>
  );
}
