import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
async function updateShare(id: string, token: string | null) {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
    const expires = token ? new Date(Date.now() + 30 * 86400000).toISOString() : null
    const { data, error } = await db.from('events').update({ share_token: token, share_expires_at: expires })
        .eq('id', id).eq('owner_id', user.id).select('id').maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'Only the event owner can manage sharing' }, { status: 403 })
    return NextResponse.json(token ? { token, expiresAt: expires } : { success: true })
}
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return updateShare((await params).id, randomBytes(32).toString('hex'))
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return updateShare((await params).id, null)
}
