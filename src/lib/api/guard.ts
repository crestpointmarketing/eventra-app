import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const inputSchema = z.object({
    eventId: z.uuid().optional(), leadId: z.uuid().optional(), templateId: z.uuid().optional(),
    taskId: z.uuid().optional(), taskIds: z.array(z.uuid()).max(100).optional(),
    count: z.number().int().min(1).max(5).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    years: z.array(z.union([z.string().max(8), z.number().int()])).max(10).optional(),
    topics: z.array(z.string().max(200)).max(10).optional(),
    regions: z.array(z.string().max(200)).max(10).optional(),
    knownDetails: z.string().max(4000).optional(),
}).passthrough()

/** Enforced in each AI route, even if the session-refresh proxy is bypassed. */
export async function guardAI(request: NextRequest, options: { consumeQuota?: boolean } = {}) {
    const db = await createClient()
    const { data: { user }, error } = await db.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: member, error: memberError } = await db.rpc('is_eventra_member')
    if (memberError) return NextResponse.json({ error: 'Access configuration unavailable' }, { status: 503 })
    if (!member) return NextResponse.json({ error: 'Team membership required' }, { status: 403 })
    if (request.method === 'POST') {
        const reader = request.clone().body?.getReader()
        const chunks: Uint8Array[] = []
        let size = 0
        while (reader) {
            const { value, done } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > 32768) { void reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }) }
            chunks.push(value)
        }
        const raw = Buffer.concat(chunks).toString('utf8')
        try {
            if (!inputSchema.safeParse(JSON.parse(raw)).success) return NextResponse.json({ error: 'Invalid request fields' }, { status: 400 })
        } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
        if (options.consumeQuota === false) return null
        // Atomic, shared between instances. Fail closed if quota storage is unavailable.
        const { data: allowed, error: quotaError } = await db.rpc('consume_ai_request')
        if (quotaError) return NextResponse.json({ error: 'AI quota service unavailable' }, { status: 503 })
        if (!allowed) return NextResponse.json({ error: 'AI request limit reached' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
    return null
}
