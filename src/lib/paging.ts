// Paging for Supabase queries. No server imports, so it can be unit-tested.

/** Supabase returns at most 1,000 rows per request by default. */
export const PAGE_SIZE = 1000;

/**
 * Fetches every row of a query by requesting it in pages of PAGE_SIZE. The query
 * must have a stable order (e.g. `.order("id")`), or pages could overlap or skip rows.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
