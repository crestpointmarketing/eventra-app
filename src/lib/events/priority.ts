export const EVENT_PRIORITIES = ['High', 'Medium', 'Low'] as const

export type EventPriority = (typeof EVENT_PRIORITIES)[number]

export const EVENT_PRIORITY_BADGE: Record<EventPriority, string> = {
    High:   'bg-transparent text-rose-600 dark:text-rose-400',
    Medium: 'bg-transparent text-amber-600 dark:text-amber-400',
    Low:    'bg-transparent text-blue-600 dark:text-blue-400',
}

export const EVENT_PRIORITY_PILL: Record<EventPriority, string> = {
    High:   'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    Medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    Low:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

export const EVENT_PRIORITY_TEXT: Record<EventPriority, string> = {
    High:   'text-rose-600',
    Medium: 'text-amber-600',
    Low:    'text-blue-600',
}

export function normalizeEventPriority(value?: string | null): EventPriority {
    switch ((value ?? '').trim().toLowerCase()) {
        case 'sponsor':
        case 'high':
            return 'High'
        case 'attend':
        case 'medium':
            return 'Medium'
        case 'follow':
        case 'low':
        default:
            return 'Low'
    }
}
