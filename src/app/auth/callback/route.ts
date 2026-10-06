import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth/next-path'
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const next = safeNextPath(request.nextUrl.searchParams.get('next'))
    if (code) {
        const { error } = await (await createClient()).auth.exchangeCodeForSession(code)
        if (!error) return NextResponse.redirect(new URL(next, request.url))
    }
    return NextResponse.redirect(new URL('/login?error=callback', request.url))
}
