import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Helper function to convert priority to score
function priorityToScore(priority: string): number {
    switch (priority?.toLowerCase()) {
        case 'hot': return 90
        case 'warm': return 60
        case 'cold': return 30
        default: return 0
    }
}

export function useLeads() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['leads'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('leads')
                .select(`
          *,
          events (
            name
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Map priority to lead_score for UI compatibility
            return data?.map(lead => ({
                ...lead,
                lead_score: priorityToScore(lead.priority),
                lead_status: lead.stage
            }))
        },
        refetchOnWindowFocus: true, // Auto-refresh when returning to page
    })
}

// Hook to invalidate leads cache
export function useInvalidateLeads() {
    const queryClient = useQueryClient()
    return () => queryClient.invalidateQueries({ queryKey: ['leads'] })
}
