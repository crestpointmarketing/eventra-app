export type EventStatus = 'upcoming' | 'ongoing' | 'completed'

export interface EventStatusInfo {
    status: EventStatus
    label: string
    variant: 'default' | 'lime' | 'secondary'
    daysInfo?: string
}

export function getEventStatus(startDate: string | null, endDate: string | null): EventStatusInfo {
    if (!startDate || !endDate) {
        return {
            status: 'upcoming',
            label: 'Upcoming',
            variant: 'default'
        }
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    if (now < start) {
        const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
            status: 'upcoming',
            label: 'Upcoming',
            variant: 'default',
            daysInfo: `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
        }
    } else if (now > end) {
        const daysAgo = Math.ceil((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
        return {
            status: 'completed',
            label: 'Completed',
            variant: 'secondary',
            daysInfo: `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
        }
    } else {
        const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
            status: 'ongoing',
            label: 'Ongoing',
            variant: 'lime',
            daysInfo: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
        }
    }
}

export function formatEventDateRange(startDate: string | null, endDate: string | null): string {
    if (!startDate) return 'No date'

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null

    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    const startStr = start.toLocaleDateString('en-US', formatOptions)

    if (!end || start.toDateString() === end.toDateString()) {
        return startStr
    }

    const endStr = end.toLocaleDateString('en-US', formatOptions)
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    return `${startStr} - ${endStr} (${duration} days)`
}
