// iCalendar (RFC 5545) export of events as all-day entries. The same file imports
// into Google Calendar, Outlook and Apple Calendar.

export interface IcsEvent {
    id: string
    name: string
    start_date: string | null
    end_date?: string | null
    location?: string | null
    event_type?: string | null
    engagement_type?: string | null
    description?: string | null
    website_url?: string | null
    url?: string | null
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/

function icsDate(value: string) {
    const m = value.match(DATE_ONLY)
    return m ? `${m[1]}${m[2]}${m[3]}` : null
}

/** All-day DTEND is exclusive, so it is the day after the last event day. */
function nextDay(yyyymmdd: string) {
    const d = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + 1))
    return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function escapeText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Fold content lines at 75 octets without splitting a multi-byte character. */
function fold(line: string) {
    const out: string[] = []
    let current = '', bytes = 0
    for (const ch of line) {
        const size = new TextEncoder().encode(ch).length
        if (bytes + size > (out.length ? 74 : 75)) { out.push(current); current = ''; bytes = 0 }
        current += ch; bytes += size
    }
    out.push(current)
    return out.join('\r\n ')
}

export function buildIcs(events: IcsEvent[], { origin, now = new Date(), name = 'Eventra' }: { origin?: string; now?: Date; name?: string } = {}) {
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Eventra//Event Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(name)}`]
    for (const event of events) {
        const start = event.start_date && icsDate(event.start_date)
        if (!start) continue
        let last = (event.end_date && icsDate(event.end_date)) || start
        if (last < start) last = start
        const link = origin ? `${origin}/events/${event.id}` : null
        const website = event.website_url || event.url
        const details = [event.engagement_type && `Engagement: ${event.engagement_type}`, event.event_type, event.description, website && `Website: ${website}`, link && `Eventra: ${link}`].filter(Boolean).join('\n')
        lines.push(
            'BEGIN:VEVENT',
            `UID:${event.id}@eventra`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${start}`,
            `DTEND;VALUE=DATE:${nextDay(last)}`,
            `SUMMARY:${escapeText(event.name)}`,
            ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
            ...(details ? [`DESCRIPTION:${escapeText(details)}`] : []),
            ...(link ? [`URL:${link}`] : []),
            'TRANSP:TRANSPARENT',
            'END:VEVENT',
        )
    }
    lines.push('END:VCALENDAR')
    return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(events: IcsEvent[], filename: string, name?: string) {
    const blob = new Blob([buildIcs(events, { origin: window.location.origin, name })], { type: 'text/calendar;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href, download: filename })
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
}
