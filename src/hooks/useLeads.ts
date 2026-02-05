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

            // Map priority to lead_score for UI compatibility & Mock missing fields
            return data?.map((lead, index) => ({
                ...lead,
                lead_score: priorityToScore(lead.priority),
                lead_status: lead.stage,
                // Mocked fields for UI demo
                ai_summary: index % 3 === 0 ? 'High intent based on pricing page visits.' : index % 3 === 1 ? ' unresponsive to last 2 emails.' : 'New lead from webinar.',
                next_action: index % 4 === 0 ? 'Send Contract' : index % 4 === 1 ? 'Follow Up Call' : index % 4 === 2 ? 'Schedule Demo' : 'Email Intro',
                next_action_due: new Date(Date.now() + (index * 86400000)).toISOString(),
                owner_id: index % 2 === 0 ? 'user_1' : 'user_2',
                owner: {
                    name: index % 2 === 0 ? 'Sarah Smith' : 'Mike Jones',
                    avatar: ''
                }
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

import { createLead, type CreateLeadDTO } from '@/lib/api/leads'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateLead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (newLead: CreateLeadDTO) => createLead(newLead),
        onSuccess: () => {
            toast.success('Lead created successfully')
            queryClient.invalidateQueries({ queryKey: ['leads'] })
        },
        onError: (error: Error) => {
            toast.error(`Failed to create lead: ${error.message}`)
        }
    })
}
