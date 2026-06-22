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
                .select('*')
                .eq('id', eventId)
                .single()

            if (error) throw error

            // Load related leads separately so a missing relationship or lead
            // column cannot make an otherwise valid event appear not to exist.
            const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select(`
                    id,
                    first_name,
                    last_name,
                    email,
                    company,
                    job_title,
                    priority,
                    stage,
                    last_contacted_at
                `)
                .eq('event_id', eventId)

            if (leadsError) {
                console.warn('Failed to load event leads:', leadsError.message)
            }

            data.leads = leads ?? []

            if (data && data.owner_id) {
                const { data: owner } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', data.owner_id)
                    .single()

                if (owner) {
                    (data as any).owner = owner
                }
            }


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
