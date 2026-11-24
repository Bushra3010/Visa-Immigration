"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlarmClock, GripVertical, Loader2, Phone } from "lucide-react";
import { moveLeadStage } from "@/lib/crm/actions/leads";
import { nowMs } from "@/lib/crm/dates";
import { fmtDate } from "@/lib/crm/format";
import { idleState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { StatusPill } from "./blocks";
import { useToast } from "./toast";

export type KanbanCard = { id: string; code: string; name: string; mobile: string; country: string; visa: string; temperature: string; assignee: string; followUp: string | null; converted: boolean };
export type KanbanColumn = { id: string; name: string; color: string; isWon: boolean; isLost: boolean; count: number; cards: KanbanCard[] };

export function Kanban({ columns: initial, canEdit }: { columns: KanbanColumn[]; canEdit: boolean }) {
  const [columns, setColumns] = useState(initial);
  const [dragging, setDragging] = useState<{ card: KanbanCard; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lost, setLost] = useState<{ card: KanbanCard; from: string; to: KanbanColumn } | null>(null);
  const [reason, setReason] = useState("");
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const [now] = useState(nowMs);

  // Server data changed (router.refresh): adopt it.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setColumns(initial);
  }

  function apply(cardId: string, from: string, to: string) {
    setColumns((cols) => {
      const card = cols.find((c) => c.id === from)?.cards.find((c) => c.id === cardId);
      if (!card) return cols;
      return cols.map((c) =>
        c.id === from ? { ...c, count: c.count - 1, cards: c.cards.filter((x) => x.id !== cardId) }
          : c.id === to ? { ...c, count: c.count + 1, cards: [card, ...c.cards] } : c);
    });
  }

  function move(card: KanbanCard, from: string, to: KanbanColumn, lostReason?: string) {
    if (from === to.id) return;
    if (to.isWon && !card.converted) {
      toast(`Open ${card.name} and use “Convert to customer” to move it to ${to.name}.`, "info");
      return;
    }
    if (to.isLost && lostReason === undefined) { setLost({ card, from, to }); return; }
    apply(card.id, from, to.id); // optimistic
    setBusy(card.id);
    const fd = new FormData();
    fd.set("leadId", card.id);
    fd.set("stageId", to.id);
    if (lostReason) fd.set("lostReason", lostReason);
    start(async () => {
      const res = await moveLeadStage(idleState, fd);
      setBusy(null);
      if (res.status === "success") { toast(`${card.name} → ${to.name}`); router.refresh(); }
      else { apply(card.id, to.id, from); toast(res.message ?? "Could not move the lead.", "error"); }
    });
  }

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:thin]">
        <div className="flex min-h-[60vh] gap-3">
          {columns.map((col) => (
            <section key={col.id}
              onDragOver={(e) => { if (canEdit && dragging) { e.preventDefault(); setOver(col.id); } }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragging) move(dragging.card, dragging.from, col); setDragging(null); }}
              className={cn("flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-50/80 transition-colors", over === col.id ? "border-brand-500 bg-brand-50/60" : "border-line")}
              aria-label={`${col.name}: ${col.count} leads`}>
              <header className="flex items-center gap-2 rounded-t-2xl border-b border-line bg-white px-3 py-2.5" style={{ boxShadow: `inset 0 3px 0 ${col.color}` }}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <h2 className="flex-1 truncate text-sm font-semibold">{col.name}</h2>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-bold tabular-nums text-ink-soft">{col.count}</span>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "70vh" }}>
                {col.cards.map((card) => {
                  const overdue = card.followUp && new Date(card.followUp).getTime() < now;
                  return (
                    <article key={card.id} draggable={canEdit && busy !== card.id}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", card.id); setDragging({ card, from: col.id }); }}
                      onDragEnd={() => { setDragging(null); setOver(null); }}
                      className={cn("group rounded-xl border border-line bg-white p-3 shadow-xs transition-shadow hover:shadow-md", canEdit && "cursor-grab active:cursor-grabbing", busy === card.id && "opacity-60", dragging?.card.id === card.id && "opacity-40")}>
                      <div className="flex items-start gap-1.5">
                        {canEdit && <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-300 group-hover:text-slate-400" />}
                        <div className="min-w-0 flex-1">
                          <Link href={`/crm/leads/${card.id}`} className="block truncate font-semibold text-ink hover:text-brand-700" draggable={false}>{card.name}</Link>
                          <p className="font-mono text-[11px] text-muted">{card.code}</p>
                        </div>
                        {busy === card.id ? <Loader2 className="size-4 animate-spin text-muted" /> : <StatusPill status={card.temperature} />}
                      </div>
                      <p className="mt-2 truncate text-xs text-ink-soft">{card.country} · {card.visa}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                        <a href={`tel:${card.mobile}`} className="flex items-center gap-1 hover:text-brand-700" draggable={false}><Phone className="size-3" />{card.mobile}</a>
                        <span className="truncate">{card.assignee}</span>
                      </div>
                      {card.followUp && (
                        <p className={cn("mt-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]", overdue ? "bg-red-50 font-semibold text-danger" : "bg-canvas text-ink-soft")}>
                          <AlarmClock className="size-3" />{overdue ? "Overdue · " : ""}{fmtDate(card.followUp)}
                        </p>
                      )}
                      {canEdit && (
                        <select aria-label={`Move ${card.name}`} value={col.id} onChange={(e) => { const to = columns.find((c) => c.id === e.target.value); if (to) move(card, col.id, to); }}
                          className="mt-2 h-7 w-full rounded-md border border-line bg-white px-1.5 text-[11px] text-ink-soft lg:hidden">
                          {columns.map((c) => <option key={c.id} value={c.id}>Move to: {c.name}</option>)}
                        </select>
                      )}
                    </article>
                  );
                })}
                {col.count > col.cards.length && (
                  <Link href={`/crm/leads?stage=${col.id}`} className="block rounded-lg py-2 text-center text-xs font-medium text-brand-700 hover:bg-white">
                    + {col.count - col.cards.length} more in list view
                  </Link>
                )}
                {col.count === 0 && <p className="py-6 text-center text-xs text-muted">Drop leads here</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
      {lost && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">Move {lost.card.name} to {lost.to.name}?</h2>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">Reason (optional)</span>
              <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg border border-line px-3" placeholder="e.g. Budget, went with another agency" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-8 rounded-lg px-3 text-sm ring-1 ring-line" onClick={() => { setLost(null); setReason(""); }}>Cancel</button>
              <button type="button" className="h-8 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white" onClick={() => { move(lost.card, lost.from, lost.to, reason.trim()); setLost(null); setReason(""); }}>Move lead</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
