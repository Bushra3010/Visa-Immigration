"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-ink-soft">Please try again. If the problem continues, contact support{error.digest ? ` with reference ${error.digest}` : ""}.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-white">Try again</button>
    </div>
  );
}
