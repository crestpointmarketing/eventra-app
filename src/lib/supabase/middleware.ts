import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from './auth'

export async function updateSession(request: NextRequest) {
    // This endpoint authenticates the scheduler secret itself; it has no user session.
    if (request.nextUrl.pathname === '/api/cron/event-search') return NextResponse.next()
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
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error && isInvalidRefreshTokenError(error)) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }

    const path = request.nextUrl.pathname
    const isPublic = path === '/' || path === '/login' || path === '/reset-password' ||
        path === '/contact' || path.startsWith('/auth/') || path.startsWith('/share/') ||
        /\.(?:png|jpg|svg|ico|woff2?)$/.test(path)
    if (!isPublic && !user) {
        const response = path.startsWith('/api/')
            ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            : NextResponse.redirect(new URL('/login', request.url))
        for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie)
        return response
    }

    return supabaseResponse
}
