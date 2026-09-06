/** Supabase limits each response. Fetch explicit pages when the UI needs the full set. */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += 500) {
        const { data, error } = await page(from, from + 499)
        if (error) throw error
        rows.push(...(data ?? []))
        if (!data || data.length < 500) return rows
    }
}
