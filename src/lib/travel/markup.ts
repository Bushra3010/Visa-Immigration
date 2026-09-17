/**
 * Pricing & markup engine (PRD §8.6).
 * Customer price = supplier fare + best-matching markup rule + best-matching
 * promotional rule. Pure and synchronous so it is easy to test; rules are
 * loaded separately (see pricing.ts).
 */

export type MarkupRule = {
  id: string;
  name: string;
  product: "flight" | "hotel" | "package";
  markupType: "fixed" | "percentage";
  value: number; // negative for promotional discounts
  destinationCountry?: string | null;
  airlineCode?: string | null;
  hotelStarRating?: number | null;
  supplier?: string | null;
  isPromotional: boolean;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

export type PricingContext = {
  product: "flight" | "hotel" | "package";
  supplier: string;
  destinationCountry?: string;
  airlineCode?: string;
  hotelStarRating?: number;
  now?: Date;
};

export type PricedAmount = {
  supplierAmount: number;
  markupAmount: number;
  discountAmount: number;
  customerAmount: number;
  appliedRuleIds: string[];
};

const SCOPE_KEYS = ["destinationCountry", "airlineCode", "hotelStarRating", "supplier"] as const;

/** Returns null if the rule does not apply, otherwise its specificity score. */
function matchScore(rule: MarkupRule, ctx: PricingContext): number | null {
  if (!rule.isActive || rule.product !== ctx.product) return null;
  const now = ctx.now ?? new Date();
  if (rule.startsAt && new Date(rule.startsAt) > now) return null;
  if (rule.endsAt && new Date(rule.endsAt) < now) return null;

  let score = 0;
  for (const key of SCOPE_KEYS) {
    const ruleValue = rule[key];
    if (ruleValue === null || ruleValue === undefined) continue;
    if (ruleValue !== ctx[key]) return null;
    score++;
  }
  return score;
}

function pickBest(rules: MarkupRule[], ctx: PricingContext) {
  let best: { rule: MarkupRule; score: number } | null = null;
  for (const rule of rules) {
    const score = matchScore(rule, ctx);
    if (score === null) continue;
    if (!best || score > best.score || (score === best.score && rule.priority > best.rule.priority)) {
      best = { rule, score };
    }
  }
  return best?.rule ?? null;
}

const amountFor = (rule: MarkupRule | null, base: number) =>
  !rule ? 0 : rule.markupType === "fixed" ? rule.value : (base * rule.value) / 100;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyMarkup(supplierAmount: number, rules: MarkupRule[], ctx: PricingContext): PricedAmount {
  const markupRule = pickBest(rules.filter((r) => !r.isPromotional), ctx);
  const promoRule = pickBest(rules.filter((r) => r.isPromotional), ctx);

  // Customer prices are whole currency units; margin absorbs the rounding.
  const customerBeforeDiscount = Math.ceil(supplierAmount + Math.max(0, amountFor(markupRule, supplierAmount)));
  const markupAmount = round2(customerBeforeDiscount - supplierAmount);
  // Promotions reduce price but never below the supplier fare (no negative margin).
  const rawDiscount = Math.floor(Math.abs(amountFor(promoRule, supplierAmount)));
  const discountAmount = round2(Math.min(rawDiscount, markupAmount));

  return {
    supplierAmount: round2(supplierAmount),
    markupAmount,
    discountAmount,
    customerAmount: round2(supplierAmount + markupAmount - discountAmount),
    appliedRuleIds: [markupRule?.id, promoRule?.id].filter((id): id is string => Boolean(id)),
  };
}
