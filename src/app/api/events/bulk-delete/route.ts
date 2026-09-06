import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
export async function POST(req: NextRequest) {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = z.object({ ids: z.array(z.uuid()).min(1).max(100) }).safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Provide 1–100 valid event IDs' }, { status: 400 })
    const { data, error } = await db.rpc('delete_events_atomic', { event_ids: [...new Set(parsed.data.ids)] })
    if (error) return NextResponse.json({ error: 'Unable to delete events. Only their owner may delete them.' }, { status: error.code === '42501' ? 403 : 409 })
    return NextResponse.json({ success: true, deleted: data })
}
