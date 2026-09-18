import { useQuery } from '@tanstack/react-query'
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

export function useLead(leadId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ['lead', leadId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('leads')
                .select(`
          *,
          events (
            id,
            name,
            start_date,
            location
          )
        `)
                .eq('id', leadId)
                .single()

            if (error) throw error
            const owner = data.owner_id ? await supabase.from('users').select('name,email').eq('id', data.owner_id).maybeSingle() : null

            // Map priority to lead_score for UI compatibility
            return {
                ...data,
                owner_name: owner?.data?.name || owner?.data?.email || null,
                lead_score: data.metadata?.ai_score ?? 0,
                lead_status: data.stage
            }
        },
        enabled: !!leadId
    })
}
