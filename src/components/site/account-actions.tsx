"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Me = { signedIn: false } | { signedIn: true; name: string | null; accountHref: string; unreadNotifications: number };

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Me) => !cancelled && setMe(data))
      .catch(() => !cancelled && setMe({ signedIn: false }));
    return () => {
      cancelled = true;
    };
  }, []);
  return me;
}

export function AccountActions() {
  const me = useMe();
  return (
    <>
      {me?.signedIn ? (
        <Link href={me.accountHref} className="whitespace-nowrap text-[15px] font-medium text-ink hover:text-brand-600">My account</Link>
      ) : (
        <Link href="/login" className="whitespace-nowrap text-[15px] font-medium text-ink hover:text-brand-600">Login / Register</Link>
      )}
      <Link
        href="/eligibility"
        className="whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        Check eligibility
      </Link>
    </>
  );
}
