import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { eventDeleteFailure } from '@/lib/events/write'
export async function POST(req: NextRequest) {
    const db = await createClient()
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Please sign in again before deleting events.' }, { status: 401 })
    const parsed = z.object({ ids: z.array(z.uuid()).min(1).max(100) }).safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Provide 1–100 valid event IDs' }, { status: 400 })
    const { data, error } = await db.rpc('delete_events_atomic', { event_ids: [...new Set(parsed.data.ids)] })
    if (error) {
        const failure = eventDeleteFailure(error.code)
        return NextResponse.json({ error: failure.error }, { status: failure.status })
    }
    return NextResponse.json({ success: true, deleted: data })
}
