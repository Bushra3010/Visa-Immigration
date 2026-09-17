"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { confirmCancellation, getCancellationQuote, type CancellationQuoteResult } from "@/lib/bookings/cancellation";
import { formatMoney } from "@/lib/utils";

export function CancelBooking({ kind, id }: { kind: "flight" | "hotel"; id: string }) {
  const [quote, setQuote] = useState<CancellationQuoteResult | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  if (result) return <Notice tone={result.ok ? "success" : "danger"}>{result.message}</Notice>;

  if (!quote) {
    return <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => setQuote(await getCancellationQuote(kind, id)))}>{pending ? "Checking…" : "Cancel booking"}</Button>;
  }
  if (!quote.ok) return <Notice tone="danger">{quote.message}</Notice>;

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold">Cancellation details from the supplier</p>
      {quote.eligible ? (
        <dl className="grid grid-cols-2 gap-1">
          <dt>Cancellation fee</dt><dd className="text-right">{formatMoney(quote.fee, quote.currency)}</dd>
          <dt>Estimated refund</dt><dd className="text-right font-semibold">{formatMoney(quote.refund, quote.currency)}</dd>
        </dl>
      ) : <p>This booking is not eligible for cancellation.</p>}
      {quote.notes.map((n) => <p key={n} className="text-xs text-ink-soft">{n}</p>)}
      <div className="flex gap-2">
        {quote.eligible && <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => setResult(await confirmCancellation(kind, id)))}>{pending ? "Cancelling…" : "Confirm cancellation"}</Button>}
        <Button variant="ghost" size="sm" onClick={() => setQuote(null)}>Keep booking</Button>
      </div>
    </div>
  );
}
