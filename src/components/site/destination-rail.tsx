import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";
import { CountryFlag } from "@/components/site/country-flag";

export type RailCountry = { slug: string; name: string; region: string; isoCode: string; photo: string | null };

/**
 * Single-row destination rail that scrolls itself. The track is rendered twice
 * and animated with CSS (compositor-driven, so it stays smooth), looping
 * seamlessly at -50%. It pauses on hover/focus and for visitors who prefer
 * reduced motion.
 */
export function DestinationRail({ countries }: { countries: RailCountry[] }) {
  // "other" is part of the repeated set, so the -50% loop lines up exactly.
  const base: (RailCountry | "other")[] = [...countries, "other"];
  const track = [...base, ...base];

  return (
    <div className="group/rail relative overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
      <ul className="flex w-max gap-3 motion-safe:animate-[rail_46s_linear_infinite] motion-safe:group-hover/rail:[animation-play-state:paused] motion-safe:has-[a:focus-visible]:[animation-play-state:paused] ">
        {track.map((c, i) => {
          const duplicate = i >= base.length;
          if (c === "other") {
            return (
              <li key={`other-${i}`} className="w-[152px] shrink-0" aria-hidden={duplicate || undefined}>
                <Link href="/countries" tabIndex={duplicate ? -1 : undefined} className="flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-brand-200 text-brand-600 hover:bg-brand-50">
                  <span className="grid aspect-[16/9] place-items-center border-b border-dashed border-brand-200 bg-brand-50/60">
                    <Globe className="size-8" strokeWidth={1.2} />
                  </span>
                  <span className="flex items-center justify-between gap-1.5 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold">Other</span>
                      <span className="block truncate text-[12px] text-ink-soft">destinations</span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0" />
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={`${c.slug}-${i}`} className="w-[152px] shrink-0" aria-hidden={duplicate || undefined}>
              <Link
                href={`/countries/${c.slug}`}
                tabIndex={duplicate ? -1 : undefined}
                className="group block overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="block aspect-[16/9] overflow-hidden border-b border-line bg-canvas">
                  {c.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- optional local photo
                    <img src={c.photo} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <CountryFlag isoCode={c.isoCode} name={c.name} className="size-full transition-transform duration-300 group-hover:scale-105" />
                  )}
                </span>
                <span className="flex items-center justify-between gap-1.5 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink group-hover:text-brand-600">{c.name}</span>
                    <span className="block truncate text-[12px] text-ink-soft">{c.region}</span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
