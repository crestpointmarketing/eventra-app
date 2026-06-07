import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Return existing token or create new one
    const { data: event } = await supabase
        .from('events')
        .select('share_token')
        .eq('id', id)
        .single()

    if (event?.share_token) {
        return NextResponse.json({ token: event.share_token })
    }

    const token = generateToken()
    const { error } = await supabase
        .from('events')
        .update({ share_token: token })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ token })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.from('events').update({ share_token: null }).eq('id', id)
    return NextResponse.json({ success: true })
}
