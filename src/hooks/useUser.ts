import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface User {
    id: string
    email: string
    created_at: string
}

// Fetch current authenticated user
async function fetchUser(): Promise<User | null> {
    const supabase = createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at
    }
}

export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
