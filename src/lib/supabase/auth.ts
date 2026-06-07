import type { User } from '@supabase/supabase-js'

type SupabaseAuthClient = {
    auth: {
        getUser: () => Promise<{
            data: { user: User | null }
            error: unknown
        }>
        signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<unknown>
    }
}

export function isInvalidRefreshTokenError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? '')

    return (
        message.includes('Invalid Refresh Token') ||
        message.includes('Refresh Token Not Found') ||
        message.includes('refresh_token_not_found')
    )
}

export async function clearInvalidSession(supabase: SupabaseAuthClient) {
    try {
        await supabase.auth.signOut({ scope: 'local' })
    } catch {
        try {
            await supabase.auth.signOut()
        } catch {
            // A corrupt/expired refresh token can also make signOut fail.
        }
    }
}

export async function safeGetUser(supabase: SupabaseAuthClient) {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser()

        if (error) {
            if (isInvalidRefreshTokenError(error)) {
                await clearInvalidSession(supabase)
            }

            return null
        }

        return user
    } catch (error) {
        if (isInvalidRefreshTokenError(error)) {
            await clearInvalidSession(supabase)
            return null
        }

        throw error
    }
}
