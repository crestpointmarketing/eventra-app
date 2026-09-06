import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAI } from '@/lib/api/guard'
import { createClient } from '@/lib/supabase/server'
import { runSearchWorker } from '@/lib/events/search-worker'
export const maxDuration = 300
export async function POST(req: NextRequest) {
    const denied = await guardAI(req, { consumeQuota: false })
    if (denied) return denied
    const input = z.object({ id: z.uuid() }).safeParse(await req.json())
    if (!input.success)
        return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
    const { data, error } = await (
        await createClient()
    ).rpc('retry_event_search', { p_id: input.data.id })
    if (error || !data)
        return NextResponse.json(
            {
                error: 'Cannot retry: another search is running or the retry limit was reached.',
            },
            { status: 409 },
        )
    after(async () => {
        try {
            await runSearchWorker(input.data.id)
        } catch {
            console.error('Search retry worker unavailable')
        }
    })
    return NextResponse.json({ id: input.data.id }, { status: 202 })
}
