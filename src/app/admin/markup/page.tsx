import type { Metadata } from "next";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { Field, Input, Select } from "@/components/ui/fields";
import { Badge, Card } from "@/components/ui/primitives";
import { saveMarkupRule } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, toBusinessInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing & markup" };

type Rule = {
  id?: string; name?: string; product?: string; markup_type?: string; value?: number; destination_country?: string | null; airline_code?: string | null;
  hotel_star_rating?: number | null; supplier?: string | null; is_promotional?: boolean; priority?: number; starts_at?: string | null; ends_at?: string | null; is_active?: boolean;
};

function RuleFields({ rule }: { rule: Rule }) {
  const id = (k: string) => `${rule.id ?? "new"}-${k}`;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {rule.id && <input type="hidden" name="id" value={rule.id} />}
      <Field label="Name" htmlFor={id("name")} className="sm:col-span-2"><Input id={id("name")} name="name" defaultValue={rule.name} required /></Field>
      <Field label="Product" htmlFor={id("product")}><Select id={id("product")} name="product" defaultValue={rule.product ?? "flight"}><option value="flight">Flight</option><option value="hotel">Hotel</option><option value="package">Package</option></Select></Field>
      <Field label="Type" htmlFor={id("type")}><Select id={id("type")} name="markupType" defaultValue={rule.markup_type ?? "fixed"}><option value="fixed">Fixed (₹)</option><option value="percentage">Percentage (%)</option></Select></Field>
      <Field label="Value" htmlFor={id("value")} hint="Negative for promotions"><Input id={id("value")} name="value" type="number" step="0.01" defaultValue={rule.value} required /></Field>
      <Field label="Priority" htmlFor={id("priority")}><Input id={id("priority")} name="priority" type="number" defaultValue={rule.priority ?? 0} /></Field>
      <Field label="Country (ISO, optional)" htmlFor={id("country")}><Input id={id("country")} name="destinationCountry" maxLength={2} placeholder="CA" defaultValue={rule.destination_country ?? ""} /></Field>
      <Field label="Airline (IATA, optional)" htmlFor={id("airline")}><Input id={id("airline")} name="airlineCode" maxLength={2} placeholder="AI" defaultValue={rule.airline_code ?? ""} /></Field>
      <Field label="Hotel stars (optional)" htmlFor={id("stars")}><Input id={id("stars")} name="hotelStarRating" type="number" min={1} max={5} defaultValue={rule.hotel_star_rating ?? ""} /></Field>
      <Field label="Supplier (optional)" htmlFor={id("supplier")}><Input id={id("supplier")} name="supplier" defaultValue={rule.supplier ?? ""} /></Field>
      <Field label="Starts (IST)" htmlFor={id("starts")}><Input id={id("starts")} name="startsAt" type="datetime-local" defaultValue={toBusinessInput(rule.starts_at ?? null)} /></Field>
      <Field label="Ends (IST)" htmlFor={id("ends")}><Input id={id("ends")} name="endsAt" type="datetime-local" defaultValue={toBusinessInput(rule.ends_at ?? null)} /></Field>
      <div className="flex items-center gap-4 sm:col-span-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPromotional" defaultChecked={rule.is_promotional} className="accent-brand-600" /> Promotional discount</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={rule.is_active ?? true} className="accent-brand-600" /> Active</label>
      </div>
    </div>
  );
}

export default async function MarkupPage() {
  await requireSection("markup");
  const supabase = await createClient();
  const { data } = await supabase.from("markup_rules").select("*").order("product").order("priority", { ascending: false });

  return (
    <>
      <PageHeader
        title="Pricing & markup"
        description={<>Customer price = supplier fare + best-matching markup − best-matching promotion (never below supplier fare). More specific rules (country, airline, star rating, supplier) win; ties go to higher priority. Example: {formatMoney(20000)} + {formatMoney(1000)} = {formatMoney(21000)}.</>}
      />
      <Card className="mb-8 p-5">
        <h2 className="mb-3 font-semibold">New rule</h2>
        <ActionForm action={saveMarkupRule} submitLabel="Create rule"><RuleFields rule={{}} /></ActionForm>
      </Card>
      <div className="space-y-4">
        {(data ?? []).map((r: Rule) => (
          <details key={r.id} className="rounded-xl border border-line bg-white p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2">
              <span className="font-medium">{r.name}</span>
              <Badge tone="brand">{r.product}</Badge>
              <Badge>{r.markup_type === "fixed" ? formatMoney(Number(r.value)) : `${r.value}%`}</Badge>
              {r.is_promotional && <Badge tone="accent">Promo</Badge>}
              {!r.is_active && <Badge tone="danger">Inactive</Badge>}
              {[r.destination_country, r.airline_code, r.hotel_star_rating && `${r.hotel_star_rating}★`, r.supplier].filter(Boolean).map((s) => <Badge key={String(s)}>{s}</Badge>)}
            </summary>
            <div className="mt-4"><ActionForm action={saveMarkupRule} submitLabel="Save rule"><RuleFields rule={r} /></ActionForm></div>
          </details>
        ))}
      </div>
    </>
  );
}
