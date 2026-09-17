"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Plane } from "lucide-react";
import { OFFER_TABS, OFFERS, type Offer, type OfferCategory } from "@/lib/content/offers";
import { cn } from "@/lib/utils";

const VISIBLE_TABS = 8;

export function OfferCard({ offer }: { offer: Offer }) {
  return (
    <Link href={offer.href} className="flex h-full gap-4 rounded-xl border border-line bg-white p-3 shadow-[0_2px_10px_rgba(15,27,45,0.06)] hover:shadow-md">
      <div className={cn("relative h-[124px] w-[132px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br", offer.tone)}>
        {offer.image ? <Image src={offer.image} alt="" fill className="object-cover" sizes="132px" /> : <Plane aria-hidden className="absolute bottom-3 right-3 size-8 text-white/80" strokeWidth={1.4} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className="flex items-start justify-between gap-2 text-[11px] font-medium uppercase text-ink-soft">
          <span>{offer.tag}</span>
          <span className="shrink-0 text-muted">T&amp;C&apos;s Apply</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[17px] font-bold leading-snug text-ink">{offer.title}</p>
        <span aria-hidden className="my-2 block h-0.5 w-8 rounded bg-danger/70" />
        <p className="line-clamp-2 text-[13px] text-ink-soft">{offer.description}</p>
        <span className="mt-auto self-end pt-2 text-[13px] font-bold text-accent-500">BOOK NOW</span>
      </div>
    </Link>
  );
}

export function OffersSection() {
  const [tab, setTab] = useState<"all" | OfferCategory>("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const scroller = useRef<HTMLUListElement>(null);
  const offers = useMemo(() => (tab === "all" ? OFFERS : OFFERS.filter((o) => o.category === tab)), [tab]);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.9, behavior: "smooth" });

  return (
    <section id="offers" aria-labelledby="offers-heading" className="rounded-2xl border border-line/70 bg-white px-5 pb-6 pt-5 shadow-[0_2px_16px_rgba(15,27,45,0.06)] sm:px-8">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <h2 id="offers-heading" className="text-[28px] font-bold text-ink">Offers</h2>
        <div role="tablist" aria-label="Offer categories" className="flex flex-1 flex-wrap items-center gap-x-7 gap-y-2">
          {OFFER_TABS.slice(0, VISIBLE_TABS).map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("relative py-2 text-[15px]", tab === t.id ? "font-semibold text-accent-500" : "text-ink hover:text-accent-500")}>
              {t.label}
              {tab === t.id && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-accent-500" />}
            </button>
          ))}
          {OFFER_TABS.length > VISIBLE_TABS && (
            <div className="relative">
              <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)} className="flex items-center gap-1 py-2 text-[15px] font-semibold text-ink">
                More <ChevronDown className="size-4" />
              </button>
              {moreOpen && (
                <ul className="absolute left-0 top-full z-20 w-40 rounded-lg border border-line bg-white p-1 shadow-lg">
                  {OFFER_TABS.slice(VISIBLE_TABS).map((t) => (
                    <li key={t.id}><button onClick={() => { setTab(t.id); setMoreOpen(false); }} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-canvas">{t.label}</button></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-5">
          <Link href="/offers" className="flex items-center gap-2 text-[15px] font-bold text-accent-500">VIEW ALL <ArrowRight className="size-4" /></Link>
          <div className="flex overflow-hidden rounded-full border border-line">
            <button type="button" aria-label="Previous offers" onClick={() => scrollBy(-1)} className="grid h-9 w-10 place-items-center text-muted hover:text-accent-500"><ChevronLeft className="size-5" /></button>
            <span aria-hidden className="w-px bg-line" />
            <button type="button" aria-label="Next offers" onClick={() => scrollBy(1)} className="grid h-9 w-10 place-items-center text-accent-500"><ChevronRight className="size-5" /></button>
          </div>
        </div>
      </div>

      <ul ref={scroller} className="mt-5 flex snap-x gap-6 overflow-x-auto pb-2 [scrollbar-width:none]">
        {offers.map((o) => (
          <li key={o.id} className="w-[88%] shrink-0 snap-start sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"><OfferCard offer={o} /></li>
        ))}
        {offers.length === 0 && <li className="py-8 text-sm text-muted">No offers in this category right now.</li>}
      </ul>
    </section>
  );
}
