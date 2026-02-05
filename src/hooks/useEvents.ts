import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useEvents() {
    const supabase = createClient()

    return useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: false })

            if (eventsError) throw eventsError

            if (!events || events.length === 0) return []

            // Extract unique owner IDs
            const ownerIds = Array.from(new Set(events.map(e => e.owner_id).filter(Boolean))) as string[]

            if (ownerIds.length === 0) return events

            // Fetch owner details
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', ownerIds)

            if (usersError) {
                console.error('Error fetching event owners:', usersError)
                return events
            }

            // Create user map for fast lookup
            const userMap = new Map(users.map(u => [u.id, u]))

            // Merge owner data
            return events.map(event => ({
                ...event,
                owner: userMap.get(event.owner_id)
            }))
        },
        refetchOnWindowFocus: true, // Auto-refresh when returning to page
    })
}
