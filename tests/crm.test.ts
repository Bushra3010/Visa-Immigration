import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addDays, istDateTime, istToday, resolveRange, splitIst } from "@/lib/crm/dates";
import { amountInWords, money } from "@/lib/crm/format";
import { ALL_PERMISSION_KEYS, CRM_ACTIONS, CRM_MODULES } from "@/lib/crm/permissions";
import { parseCustomFields, searchTerm } from "@/lib/crm/schemas";
import { crc32, toCsvRows, toXlsx } from "@/lib/crm/xlsx";

describe("CRM date ranges (IST)", () => {
  // 2026-11-25 20:00 UTC = 2026-11-26 01:30 IST
  const now = Date.UTC(2026, 10, 25, 20, 0);
  it("uses the IST calendar day", () => {
    expect(istToday(now)).toBe("2026-11-26");
  });
  it("today is a half-open IST day", () => {
    const r = resolveRange({ range: "today" }, "30d", now);
    expect(r.from.toISOString()).toBe("2026-11-25T18:30:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-26T18:30:00.000Z");
  });
  it("yesterday, last 7 days and this month", () => {
    expect(resolveRange({ range: "yesterday" }, "30d", now).fromDate).toBe("2026-11-25");
    const w = resolveRange({ range: "7d" }, "30d", now);
    expect([w.fromDate, w.toDate]).toEqual(["2026-11-20", "2026-11-26"]);
    expect(resolveRange({ range: "month" }, "30d", now).fromDate).toBe("2026-11-01");
  });
  it("custom ranges are validated and ordered", () => {
    const r = resolveRange({ range: "custom", from: "2026-11-10", to: "2026-11-01" }, "30d", now);
    expect([r.fromDate, r.toDate]).toEqual(["2026-11-01", "2026-11-10"]);
    expect(resolveRange({ range: "custom", from: "bad", to: "2026-11-10" }, "30d", now).fromDate).toBe("2026-10-28");
    expect(resolveRange({ range: "nonsense" }, "7d", now).key).toBe("7d");
  });
  it("date helpers round-trip", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    const iso = istDateTime("2026-12-01", "09:15");
    expect(iso).toBe("2026-12-01T03:45:00.000Z");
    expect(splitIst(iso)).toEqual({ date: "2026-12-01", time: "09:15" });
  });
});

describe("money formatting", () => {
  it("writes Indian amounts in words", () => {
    expect(amountInWords(125000)).toBe("Rupees One Lakh Twenty Five Thousand");
    expect(amountInWords(10_000_000)).toBe("Rupees One Crore");
    expect(amountInWords(999.5)).toBe("Rupees Nine Hundred Ninety Nine and Fifty Paise");
    expect(amountInWords(0)).toBe("Zero");
  });
  it("formats INR", () => {
    expect(money(150000)).toBe("₹1,50,000");
  });
});

describe("custom fields", () => {
  const fields = [
    { key: "budget", label: "Budget", field_type: "number", options: [], is_required: true },
    { key: "intake", label: "Intake", field_type: "select", options: ["Jan", "Sep"], is_required: false },
    { key: "ielts", label: "IELTS done", field_type: "checkbox", options: [], is_required: false },
  ];
  it("validates and coerces", () => {
    const fd = new FormData();
    fd.set("cf_budget", "250000");
    fd.set("cf_intake", "Sep");
    fd.set("cf_ielts", "on");
    expect(parseCustomFields(fd, fields)).toEqual({ ok: true, values: { budget: 250000, intake: "Sep", ielts: true } });
  });
  it("rejects missing required and unknown options", () => {
    const fd = new FormData();
    fd.set("cf_intake", "May");
    const res = parseCustomFields(fd, fields);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["cf_budget", "cf_intake"]);
  });
});

describe("search terms", () => {
  it("strips PostgREST filter syntax", () => {
    expect(searchTerm("a,b(c)*%:d")).toBe("a b c d");
    expect(searchTerm("  Asha   Rao ")).toBe("Asha Rao");
    expect(searchTerm(undefined)).toBe("");
  });
});

describe("xlsx export", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("builds a valid zip package with sheets", () => {
    const bytes = toXlsx([{ name: "Leads", rows: [["Name", "Amount"], ["Asha <&>", 1200.5], ["=cmd()", null]] }, { name: "Summary", rows: [["Total", 1]] }]);
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("xl/worksheets/sheet2.xml");
    expect(text).toContain("Asha &lt;&amp;&gt;");
    expect(text).toContain("<v>1200.5</v>");
    expect(text).toContain('<is><t xml:space="preserve">=cmd()</t></is>'); // stored as text, never a formula
  });
  it("escapes CSV formula injection", () => {
    expect(toCsvRows([["a", "=1+1"], ["b,c", 2]])).toBe('﻿a,\'=1+1\r\n"b,c",2');
  });
});

describe("permission catalogue", () => {
  it("covers every module × action plus specials", () => {
    expect(ALL_PERMISSION_KEYS.length).toBe(CRM_MODULES.length * CRM_ACTIONS.length + 3);
  });
  it("matches the keys granted in the SQL seed", () => {
    const sql = readFileSync("supabase/migrations/20261126000003_crm_seed.sql", "utf8");
    const granted = [...sql.matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map((m) => m[1]).filter((k) => !k.includes("_seed"));
    expect(granted.length).toBeGreaterThan(50);
    for (const key of granted) expect(ALL_PERMISSION_KEYS, key).toContain(key);
  });
  it("every permission checked in code exists", () => {
    const files = ["src/lib/crm/actions/leads.ts", "src/lib/crm/actions/customers.ts", "src/lib/crm/actions/expenses.ts", "src/components/crm/shell.tsx", "src/lib/crm/reports.ts"];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/(?:can|crmAuthorize|requireCrm)\([^)]*?"([a-z_]+\.[a-z_]+)"/g)) expect(ALL_PERMISSION_KEYS, `${f}: ${m[1]}`).toContain(m[1]);
    }
  });
});
