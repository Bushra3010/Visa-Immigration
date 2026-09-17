/** Deterministic helpers so sandbox results are stable for the same search. */

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string) {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function encodeToken(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeToken<T>(token: string): T | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function randomRef(prefix: string, length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = prefix;
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const roundTo = (n: number, step = 1) => Math.round(n / step) * step;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
