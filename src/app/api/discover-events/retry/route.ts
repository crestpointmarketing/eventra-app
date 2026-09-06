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
    const db = await createClient()
    // RLS limits this lookup to the authenticated creator. Explicit retries can
    // resume their saved history even when its original preview was replaced.
    const { data: savedJob, error: readError } = await db
        .from('event_search_jobs')
        .select('environment')
        .eq('id', input.data.id)
        .single()
    if (readError || !savedJob)
        return NextResponse.json(
            { error: 'Search unavailable' },
            { status: 404 },
        )
    const { data, error } = await db.rpc('retry_event_search', {
        p_id: input.data.id,
    })
    if (error || !data)
        return NextResponse.json(
            {
                error: 'Cannot retry: another search is running or the retry limit was reached.',
            },
            { status: 409 },
        )
    after(async () => {
        try {
            await runSearchWorker(input.data.id, savedJob.environment)
        } catch {
            console.error('Search retry worker unavailable')
        }
    })
    return NextResponse.json({ id: input.data.id }, { status: 202 })
}
