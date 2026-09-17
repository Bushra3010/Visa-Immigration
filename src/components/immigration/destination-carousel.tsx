"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scroller with prev/next controls for the destination cards. */
export function DestinationCarousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative">
      <ul ref={ref} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-4">{children}</ul>
      <button type="button" aria-label="Previous destinations" onClick={() => scroll(-1)} className="absolute -left-4 top-[35%] hidden size-9 place-items-center rounded-full border border-line bg-white shadow-md hover:text-brand-600 md:grid">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" aria-label="Next destinations" onClick={() => scroll(1)} className="absolute -right-4 top-[35%] hidden size-9 place-items-center rounded-full border border-line bg-white shadow-md hover:text-brand-600 md:grid">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
