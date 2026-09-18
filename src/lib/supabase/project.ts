export const EVENTRA_PROJECT_REF = 'tbicyyhprqbhimhrihgn'

/** Fail closed rather than ever connecting Eventra to another product's database. */
export function eventraDatabaseUrl(value = process.env.NEXT_PUBLIC_SUPABASE_URL) {
    if (!value) throw new Error('Eventra database URL is not configured')
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== `${EVENTRA_PROJECT_REF}.supabase.co` || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Database project mismatch: Eventra must use its dedicated Supabase project')
    }
    return url.origin
}
