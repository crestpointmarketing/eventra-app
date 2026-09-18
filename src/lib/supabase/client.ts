import { eventraDatabaseUrl } from '@/lib/supabase/project'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        eventraDatabaseUrl(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}
