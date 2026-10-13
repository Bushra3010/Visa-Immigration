import type { Faq } from "./countries";

/**
 * Plain-text formats used by the CMS editor so structured page sections can be
 * edited in ordinary textareas: one item per line, parts separated by " | ".
 */

const lines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Splits on "|" into at most `max` parts; the last part keeps any further pipes. */
function parts(line: string, max: number) {
  const out = line.split("|");
  return [...out.slice(0, max - 1), out.slice(max - 1).join("|")].map((p) => (p ?? "").trim());
}

export const parseList = (text: string): string[] => lines(text);
export const formatList = (items: readonly string[] | undefined) => (items ?? []).join("\n");

export const parseFaqs = (text: string): Faq[] =>
  lines(text)
    .map((l) => parts(l, 2))
    .filter(([q, a]) => q && a)
    .map(([question, answer]) => ({ question, answer }));
export const formatFaqs = (faqs: readonly Faq[] | undefined) => (faqs ?? []).map((f) => `${f.question} | ${f.answer}`).join("\n");

export type Step = { title: string; description: string };
export const parseSteps = (text: string): Step[] =>
  lines(text)
    .map((l) => parts(l, 2))
    .filter(([t]) => t)
    .map(([title, description]) => ({ title, description }));
export const formatSteps = (steps: readonly Step[] | undefined) => (steps ?? []).map((s) => `${s.title} | ${s.description}`).join("\n");

export type ImmigrationOption = { title: string; description: string; visaSlug?: string };
export const parseOptions = (text: string): ImmigrationOption[] =>
  lines(text)
    .map((l) => parts(l, 3))
    .filter(([t]) => t)
    .map(([title, description, visaSlug]) => (visaSlug ? { title, description, visaSlug } : { title, description }));
export const formatOptions = (options: readonly ImmigrationOption[] | undefined) =>
  (options ?? []).map((o) => [o.title, o.description, o.visaSlug].filter((p, i) => i < 2 || p).join(" | ")).join("\n");

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
