"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

const GOALS = [
  { label: "Study abroad", href: "/visa?category=student" },
  { label: "Work abroad", href: "/visa?category=work" },
  { label: "Visit a country", href: "/visa?category=visitor" },
  { label: "Move permanently", href: "/visa?category=permanent-residency" },
  { label: "Join family", href: "/visa?category=family" },
];

/** "I want to …" selector on the phone home page; the link follows the choice. */
export function JourneyPicker() {
  const id = useId();
  const [goal, setGoal] = useState(GOALS[0]);
  return (
    <>
      <label htmlFor={id} className="relative mt-5 block rounded-xl border border-sage-200 bg-sage-50 px-4 pb-2.5 pt-3">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-soft">I want to</span>
        <select
          id={id}
          value={goal.label}
          onChange={(e) => setGoal(GOALS.find((g) => g.label === e.target.value) ?? GOALS[0])}
          className="mt-0.5 w-full appearance-none bg-transparent pr-8 text-[15px] font-bold text-pine-900 outline-none"
        >
          {GOALS.map((g) => <option key={g.label}>{g.label}</option>)}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-pine-800" strokeWidth={1.8} />
      </label>
      <div className="mt-4 border-t border-sage-100 pt-3">
        <Link href={goal.href} className="text-[13px] font-semibold text-pine-800 underline-offset-2 hover:underline">Explore visa options →</Link>
      </div>
    </>
  );
}
