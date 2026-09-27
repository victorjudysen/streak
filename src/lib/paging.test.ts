import { describe, expect, it } from "vitest";
import { PAGE_SIZE, fetchAll } from "@/lib/paging";

/** A fake query over `total` rows that, like Supabase, returns at most PAGE_SIZE per request. */
function fakeQuery(total: number) {
  const requests: [number, number][] = [];
  const page = async (from: number, to: number) => {
    requests.push([from, to]);
    const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
    return { data: rows, error: null };
  };
  return { page, requests };
}

describe("fetchAll", () => {
  it("returns every row beyond the 1,000-row limit, in order", async () => {
    const { page, requests } = fakeQuery(2 * PAGE_SIZE + 349);
    const rows = await fetchAll<number>(page);
    expect(rows).toHaveLength(2349);
    expect(rows[0]).toBe(0);
    expect(rows.at(-1)).toBe(2348);
    expect(requests).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("stops after one request when everything fits", async () => {
    const { page, requests } = fakeQuery(12);
    expect(await fetchAll<number>(page)).toHaveLength(12);
    expect(requests).toHaveLength(1);
  });

  it("makes one extra empty request when the total is an exact multiple", async () => {
    const { page, requests } = fakeQuery(PAGE_SIZE);
    expect(await fetchAll<number>(page)).toHaveLength(PAGE_SIZE);
    expect(requests).toHaveLength(2);
  });

  it("passes errors through", async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
