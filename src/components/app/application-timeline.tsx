import { Check } from "lucide-react";
import { APPLICATION_TIMELINE, type ApplicationStatus } from "@/lib/immigration/status";
import { cn, humanize } from "@/lib/utils";

export function ApplicationTimeline({ status }: { status: ApplicationStatus }) {
  const decided = ["approved", "rejected", "withdrawn"].includes(status);
  const steps = [...APPLICATION_TIMELINE, "decision_received"] as const;
  const currentIndex = decided ? steps.length - 1 : APPLICATION_TIMELINE.indexOf(status as (typeof APPLICATION_TIMELINE)[number]);

  return (
    <ol className="relative space-y-4">
      {steps.map((step, i) => {
        const done = i < currentIndex || (decided && i === currentIndex);
        const current = i === currentIndex && !decided;
        return (
          <li key={step} className="flex items-center gap-3">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs", done ? "bg-brand-600 text-white" : current ? "bg-white ring-2 ring-brand-500" : "bg-canvas text-muted ring-1 ring-line")}>
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-sm", current ? "font-semibold text-ink" : done ? "text-ink" : "text-muted")}>
              {step === "decision_received" ? (decided ? `Decision received — ${humanize(status)}` : "Decision received") : humanize(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
