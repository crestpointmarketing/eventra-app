import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface UpdateEventInput {
    // Basic Information
    name?: string
    event_type?: string
    status?: string
    start_date?: string
    end_date?: string
    location?: string
    venue?: string
    url?: string
    owner_id?: string
    description?: string

    // Goals & KPIs
    total_budget?: number
    target_leads?: number
    target_revenue?: number
    actual_leads?: number
    actual_revenue?: number

    // Marketing Brief
    industry?: string
    goal_statement?: string
    target_audience?: string
    core_message?: string
    primary_offering?: string
    key_cta?: string

    // Budget Breakdown
    budget_breakdown?: Record<string, unknown>
}

export function useUpdateEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateEventInput }) => {
            const supabase = createClient()
            const { data: updated, error } = await supabase
                .from('events')
                .update(data)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return updated
        },
        onSuccess: (data) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['event', data.id] })
            queryClient.invalidateQueries({ queryKey: ['events'] })

            toast.success('Event updated successfully')
        },
        onError: (error: Error) => {
            toast.error('Failed to update event', {
                description: error.message
            })
        }
    })
}
