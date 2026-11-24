import "server-only";

type Q = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> };

/**
 * Sums numeric columns over every row a (filtered, RLS-scoped) query returns.
 * PostgREST aggregates are disabled on Supabase by default and responses are
 * capped at 1000 rows, so this pages through the result.
 */
export async function sumColumns<K extends string>(make: () => Q, columns: K[], cap = 100_000): Promise<Record<K, number>> {
  const totals = Object.fromEntries(columns.map((c) => [c, 0])) as Record<K, number>;
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error || !data) break;
    for (const row of data as Record<string, unknown>[]) for (const c of columns) totals[c] += Number(row[c] ?? 0);
    if (data.length < 1000) break;
  }
  for (const c of columns) totals[c] = Math.round(totals[c] * 100) / 100;
  return totals;
}
