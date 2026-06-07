export type EventStatus = 'upcoming' | 'ongoing' | 'completed'

export interface EventStatusInfo {
    status: EventStatus
    label: string
    variant: 'default' | 'lime' | 'secondary'
    daysInfo?: string
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseLocalDate(value: string) {
    const match = value.match(DATE_ONLY_PATTERN)
    if (!match) return new Date(value)

    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
}

function getDateParts(value: string) {
    const match = value.match(DATE_ONLY_PATTERN)
    if (!match) return null

    const [, year, month, day] = match
    return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
    }
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

    const start = parseLocalDate(startDate)
    start.setHours(0, 0, 0, 0)

    const end = parseLocalDate(endDate)
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

    const start = getDateParts(startDate)
    const end = endDate ? getDateParts(endDate) : null

    if (!start) return startDate

    // Single day or no end date
    if (!end || (start.year === end.year && start.month === end.month && start.day === end.day)) {
        return `${SHORT_MONTHS[start.month - 1]} ${start.day}, ${start.year}`
    }

    // Multi-day event
    const startMonth = SHORT_MONTHS[start.month - 1]
    const endMonth = SHORT_MONTHS[end.month - 1]

    // Same month: "Jan 25-27 2026"
    if (start.month === end.month && start.year === end.year) {
        return `${startMonth} ${start.day}-${end.day} ${start.year}`
    }

    // Different months: "Jan 25 - Feb 3 2026"
    return `${startMonth} ${start.day} - ${endMonth} ${end.day} ${end.year}`
}
