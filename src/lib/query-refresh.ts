import type { QueryClient } from '@tanstack/react-query'

// Every cached view that shows events or their tasks: the dashboard, EventPulse
// (portfolio, follow-up flags, review badge), event workspaces and task lists.
const EVENT_DATA_KEYS = [
    ['events'], ['event'], ['eventpulse-events'], ['eventpulse-task-summary'], ['eventpulse-review-count'],
    ['tasks'], ['task'],
]

/** Mark all event- and task-derived queries stale after a write that affects them. */
export function refreshEventData(queryClient: QueryClient) {
    for (const queryKey of EVENT_DATA_KEYS) queryClient.invalidateQueries({ queryKey })
}
