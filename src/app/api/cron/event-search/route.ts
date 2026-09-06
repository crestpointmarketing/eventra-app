import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { runSearchWorker } from '@/lib/events/search-worker'
export const maxDuration = 300
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET
        ? `Bearer ${process.env.CRON_SECRET}`
        : ''
    const actual = req.headers.get('authorization') ?? ''
    if (
        !expected ||
        Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        await runSearchWorker()
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json(
            { error: 'Search worker unavailable' },
            { status: 503 },
        )
    }
}
