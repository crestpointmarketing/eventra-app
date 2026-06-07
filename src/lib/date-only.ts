const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

function getDateParts(value: string) {
    const match = value.match(DATE_ONLY_PATTERN)
    if (!match) return null

    const [, year, month, day] = match
    return {
        year,
        month: Number(month),
        day: Number(day),
    }
}

export function formatDateOnly(
    value: string,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
) {
    const parts = getDateParts(value)
    if (!parts) return value

    const monthFormat = options.month
    const day = options.day === '2-digit' ? String(parts.day).padStart(2, '0') : String(parts.day)
    const year = parts.year

    if (monthFormat === 'long') {
        return `${LONG_MONTHS[parts.month - 1]} ${day}, ${year}`
    }

    if (monthFormat === 'short') {
        return `${SHORT_MONTHS[parts.month - 1]} ${day}, ${year}`
    }

    const month = options.month === '2-digit' ? String(parts.month).padStart(2, '0') : String(parts.month)
    return `${month}/${day}/${year}`
}

export function formatMonthOnly(value: string) {
    const parts = getDateParts(value)
    if (!parts) return value

    return `${LONG_MONTHS[parts.month - 1]} ${parts.year}`
}

export function dateOnlyToLocalDate(value: string) {
    const parts = getDateParts(value)
    if (!parts) return new Date(value)

    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

export function dateOnlyTime(value: string | null | undefined) {
    if (!value) return 0
    return dateOnlyToLocalDate(value).getTime()
}
