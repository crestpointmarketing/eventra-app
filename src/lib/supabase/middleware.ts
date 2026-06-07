import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from './auth'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired. Clear stale auth cookies instead of surfacing
    // Supabase refresh-token errors to the Next.js dev overlay.
    const { error } = await supabase.auth.getUser()
    if (error && isInvalidRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }

    // Auth redirect temporarily disabled for development
    // Will be enabled when login page is created

    return supabaseResponse
}
