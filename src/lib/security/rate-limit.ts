import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window rate limiter (PRD §12.3). In-memory, so limits are per server
 * instance — swap for a shared store (Upstash Redis / Postgres) before scaling
 * horizontally in production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const id = `${key}:${await clientIp()}`;
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }
    return { ok: true };
  }
  bucket.count++;
  return { ok: bucket.count <= limit, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}
