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

export function useEvent(eventId: string) {
    const supabase = createClient()

    return useQuery({
        queryKey: ['event', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select(`
          *,
          leads (
            id,
            first_name,
            last_name,
            email,
            company,
            priority,
            stage
          )
        `)
                .eq('id', eventId)
                .single()

            if (error) throw error

            // Map priority to lead_score for UI compatibility
            if (data?.leads) {
                data.leads = data.leads.map((lead: any) => ({
                    ...lead,
                    lead_score: priorityToScore(lead.priority),
                    lead_status: lead.stage
                }))
            }

            return data
        },
        enabled: !!eventId
    })
}
