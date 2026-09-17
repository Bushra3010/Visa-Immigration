import { Star } from "lucide-react";
import { cn, humanize } from "@/lib/utils";

export function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex" aria-label={`${count} star hotel`}>
      {Array.from({ length: count }, (_, i) => <Star key={i} className="size-3.5 fill-accent-500 text-accent-500" />)}
    </span>
  );
}

/** Placeholder until supplier images are available. */
export function HotelImage({ name, className }: { name: string; className?: string }) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div
      aria-hidden
      className={cn("grid place-items-center rounded-lg text-2xl font-semibold text-white/90", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 50% 30%))` }}
    >
      {name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
    </div>
  );
}

export const mealLabel = (m: string) => (m === "room_only" ? "Room only" : humanize(m));
