import { createClient } from '@/lib/supabase/client'

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase(): ReturnType<typeof createClient> {
    if (!_supabase) _supabase = createClient()
    return _supabase
}

// ============================================
// Types
// ============================================
export interface User {
    id: string
    email: string
    name: string | null
    created_at: string
    updated_at: string
}

// ============================================
// Fetch All Users
// ============================================
export async function fetchUsers() {
    console.log('🔵 Fetching users...')

    const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('🔴 Error fetching users:', error)
        throw error
    }

    console.log('🟢 Users fetched successfully:', { count: data?.length })
    return data as User[]
}

// ============================================
// Fetch Single User
// ============================================
export async function fetchUser(userId: string) {
    const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data as User
}
