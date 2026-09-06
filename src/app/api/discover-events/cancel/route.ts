import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAI } from '@/lib/api/guard'
import { createClient } from '@/lib/supabase/server'
export async function POST(req: NextRequest) {
    const denied = await guardAI(req, { consumeQuota: false })
    if (denied) return denied
    const body = z.object({ id: z.uuid() }).safeParse(await req.json())
    if (!body.success)
        return NextResponse.json({ error: 'Invalid job' }, { status: 400 })
    const { error } = await (
        await createClient()
    ).rpc('cancel_event_search', { p_id: body.data.id })
    return error
        ? NextResponse.json(
              { error: 'Could not cancel search' },
              { status: 500 },
          )
        : NextResponse.json({ cancelled: true })
}
