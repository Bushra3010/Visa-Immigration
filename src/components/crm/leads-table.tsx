"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { assignLead } from "@/lib/crm/actions/leads";
import { nowMs } from "@/lib/crm/dates";
import { fmtDate, fmtDateTime } from "@/lib/crm/format";
import { idleState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Empty, SortTh, StatusPill, TBody, Td, THead, Th, TintBadge, Tr } from "./blocks";
import { useToast } from "./toast";

export type LeadRowView = {
  id: string; code: string; full_name: string; mobile: string; email: string | null; country: string; visa: string; source: string;
  stage: { name: string; color: string } | null; temperature: string; assignee: string; follow_up: string | null; created_at: string; converted: boolean;
};

export function LeadsTable({ rows, params, canAssign, staff }: {
  rows: LeadRowView[]; params: Record<string, string | string[] | undefined>; canAssign: boolean; staff: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const all = rows.length > 0 && selected.length === rows.length;
  const [now] = useState(nowMs);

  function bulkAssign() {
    if (!assignee) return toast("Choose an employee first.", "error");
    const fd = new FormData();
    selected.forEach((id) => fd.append("leadId", id));
    fd.set("userId", assignee);
    start(async () => {
      const res = await assignLead(idleState, fd);
      if (res.status === "success") { toast(res.message ?? "Assigned."); setSelected([]); router.refresh(); }
      else toast(res.message ?? "Could not assign.", "error");
    });
  }

  return (
    <>
      {canAssign && selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-900">{selected.length} selected</span>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-8 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Assign to">
            <option value="">Assign to…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={bulkAssign} disabled={pending} className={buttonClass("primary", "sm")}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}Assign
          </button>
          <button type="button" onClick={() => setSelected([])} className="ml-auto text-brand-700 hover:underline">Clear</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <THead>
            {canAssign && (
              <Th className="w-10">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? [] : rows.map((r) => r.id))} className="size-4 accent-brand-600" />
              </Th>
            )}
            <SortTh label="Lead" column="full_name" base="/crm/leads" params={params} />
            <Th>Contact</Th>
            <Th>Interested in</Th>
            <Th>Source</Th>
            <Th>Stage</Th>
            <SortTh label="Priority" column="temperature" base="/crm/leads" params={params} />
            <Th>Assigned</Th>
            <SortTh label="Next follow-up" column="next_follow_up_at" base="/crm/leads" params={params} />
            <SortTh label="Created" column="created_at" base="/crm/leads" params={params} />
          </THead>
          <TBody>
            {rows.map((l) => {
              const overdue = l.follow_up && new Date(l.follow_up).getTime() < now;
              return (
                <Tr key={l.id} className={cn(selected.includes(l.id) && "bg-brand-50/40")}>
                  {canAssign && (
                    <Td>
                      <input type="checkbox" aria-label={`Select ${l.full_name}`} checked={selected.includes(l.id)} className="size-4 accent-brand-600"
                        onChange={() => setSelected((s) => (s.includes(l.id) ? s.filter((x) => x !== l.id) : [...s, l.id]))} />
                    </Td>
                  )}
                  <Td>
                    <Link href={`/crm/leads/${l.id}`} className="font-semibold text-ink hover:text-brand-700">{l.full_name}</Link>
                    <p className="font-mono text-xs text-muted">{l.code}{l.converted && <span className="ml-1.5 text-success">· Customer</span>}</p>
                  </Td>
                  <Td className="text-xs"><a href={`tel:${l.mobile}`} className="block text-ink hover:text-brand-700">{l.mobile}</a><span className="text-muted">{l.email ?? "—"}</span></Td>
                  <Td className="text-xs"><span className="block text-ink">{l.country}</span><span className="text-muted">{l.visa}</span></Td>
                  <Td className="text-xs text-ink-soft">{l.source}</Td>
                  <Td>{l.stage ? <TintBadge color={l.stage.color}>{l.stage.name}</TintBadge> : "—"}</Td>
                  <Td><StatusPill status={l.temperature} /></Td>
                  <Td className={cn("text-xs", l.assignee === "Unassigned" ? "font-medium text-warning" : "text-ink-soft")}>{l.assignee}</Td>
                  <Td className={cn("whitespace-nowrap text-xs", overdue ? "font-semibold text-danger" : "text-ink-soft")}>{l.follow_up ? fmtDateTime(l.follow_up) : "—"}{overdue && <span className="block text-[10px] uppercase">Overdue</span>}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(l.created_at)}</Td>
                </Tr>
              );
            })}
            {!rows.length && <tr><td colSpan={canAssign ? 10 : 9}><Empty title="No leads match these filters" description="Try clearing a filter or widening the date range." /></td></tr>}
          </TBody>
        </table>
      </div>
    </>
  );
}
