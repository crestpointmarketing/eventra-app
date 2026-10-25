import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/** Whether the signed-in member has the administrator role. The database enforces it; this only shows controls. */
export function useIsAdmin() {
    return useQuery({
        queryKey: ['is-admin'],
        queryFn: async () => {
            const { data, error } = await createClient().rpc('is_eventra_admin')
            if (error) return false
            return data === true
        },
        staleTime: 1000 * 60 * 5,
    })
}
