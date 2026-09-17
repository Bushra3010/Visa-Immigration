import type { z } from "zod";

export type FormState<T = unknown> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

export const idleState = { status: "idle" } as const satisfies FormState;

/** Flattens zod issues into { "a.b": "message" } keeping the first per path. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
