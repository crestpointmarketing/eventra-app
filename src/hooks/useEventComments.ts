import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/supabase/auth'

export type EventComment = {
    id: string
    event_id: string
    author_email: string
    body: string
    created_at: string
}

export function useEventComments(eventId: string) {
    return useQuery({
        queryKey: ['event-comments', eventId],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('event_comments')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true })
            if (error) throw error
            return data as EventComment[]
        },
        enabled: !!eventId,
    })
}

export function useAddComment(eventId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (body: string) => {
            const supabase = createClient()
            const user = await safeGetUser(supabase)
            if (!user?.email) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('event_comments')
                .insert({ event_id: eventId, author_email: user.email, body })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] })
        },
    })
}

export function useDeleteComment(eventId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (commentId: string) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('event_comments')
                .delete()
                .eq('id', commentId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-comments', eventId] })
        },
    })
}

export function useCurrentUserEmail() {
    return useQuery({
        queryKey: ['current-user-email'],
        queryFn: async () => {
            const supabase = createClient()
            const user = await safeGetUser(supabase)
            return user?.email ?? null
        },
        staleTime: Infinity,
    })
}
