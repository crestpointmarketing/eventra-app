import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useEvents() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: false })

            if (error) throw error
            return data
        },
        refetchOnWindowFocus: true, // Auto-refresh when returning to page
    })
}
