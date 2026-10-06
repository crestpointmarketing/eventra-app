'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    addDays, addMonths, addWeeks, addYears, eachDayOfInterval, endOfMonth, endOfWeek,
    endOfYear, format, isSameMonth, isToday, startOfMonth, startOfWeek, startOfYear,
} from 'date-fns'
import { ArrowRight, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { ENGAGEMENT_TYPES, eventEngagement, type EngagementType } from '@/lib/events/taxonomy'
import { downloadIcs, type IcsEvent } from '@/lib/events/ics'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type View = 'week' | 'month' | 'year'

type CalendarEvent = IcsEvent & { discovery_priority?: string | null }

// Chip and dot colors per engagement, matching the EventPulse engagement pills.
const ENGAGEMENT_STYLES: Record<EngagementType, { dot: string; chip: string }> = {
    Sponsor:  { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200' },
    Exhibit:  { dot: 'bg-orange-500',  chip: 'bg-orange-50 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200' },
    Attend:   { dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200' },
    Speaking: { dot: 'bg-pink-500',    chip: 'bg-pink-50 text-pink-900 dark:bg-pink-900/30 dark:text-pink-200' },
    Follow:   { dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200' },
}

const styleOf = (event: CalendarEvent) => ENGAGEMENT_STYLES[eventEngagement(event)]

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/
const MAX_SPAN_DAYS = 60

/** Event dates are calendar days; parse them locally so they never shift by timezone. */
function parseDay(value: string | null | undefined) {
    const match = value?.match(DATE_ONLY)
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

function shortLocation(location?: string | null) {
    return (location ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(', ')
}

function visibleRange(view: View, cursor: Date) {
    if (view === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) }
    if (view === 'year') return { start: startOfYear(cursor), end: endOfYear(cursor) }
    return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) }
}

function EventChip({ event, wrap }: { event: CalendarEvent; wrap?: boolean }) {
    const style = styleOf(event)
    const location = shortLocation(event.location)
    return (
        <Link
            href={`/events/${event.id}`}
            title={`${event.name} · ${eventEngagement(event)}${location ? ` · ${location}` : ''}`}
            className={`block rounded-md px-2 py-1 text-left transition hover:brightness-95 dark:hover:brightness-125 ${style.chip}`}
        >
            <span className={`flex gap-1.5 min-w-0 ${wrap ? "items-start" : "items-center"}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${wrap ? "mt-1" : ""} ${style.dot}`} />
                <span className={`text-xs font-medium ${wrap ? "break-words" : "truncate"}`}>{event.name}</span>
            </span>
            {location && <span className="block truncate pl-3.5 text-[11px] opacity-70">{location}</span>}
        </Link>
    )
}

export function EventCalendar({ events }: { events: CalendarEvent[] }) {
    const router = useRouter()
    const [view, setView] = useState<View>('month')
    const [cursor, setCursor] = useState(() => new Date())
    const range = useMemo(() => visibleRange(view, cursor), [view, cursor])

    // Map each visible day to the events running on it (multi-day events appear on every day).
    const { byDay, shown } = useMemo(() => {
        const byDay = new Map<string, CalendarEvent[]>()
        const shown = new Set<CalendarEvent>()
        for (const event of events) {
            const start = parseDay(event.start_date)
            if (!start) continue
            let end = parseDay(event.end_date) ?? start
            if (end < start || (end.getTime() - start.getTime()) / 864e5 > MAX_SPAN_DAYS) end = start
            if (end < range.start || start > range.end) continue
            const from = start < range.start ? range.start : start
            const to = end > range.end ? range.end : end
            for (const day of eachDayOfInterval({ start: from, end: to })) {
                const key = dayKey(day)
                byDay.set(key, [...(byDay.get(key) ?? []), event])
                if (view !== 'month' || isSameMonth(day, cursor)) shown.add(event)
            }
        }
        for (const list of byDay.values()) list.sort((a, b) => a.name.localeCompare(b.name))
        return { byDay, shown }
    }, [events, range, view, cursor])

    const legend = useMemo(() => {
        const types = new Set([...shown].map(eventEngagement))
        return ENGAGEMENT_TYPES.filter(t => types.has(t))
    }, [shown])

    const step = (dir: 1 | -1) => setCursor(c =>
        view === 'week' ? addWeeks(c, dir) : view === 'year' ? addYears(c, dir) : addMonths(c, dir))

    const title = view === 'year' ? format(cursor, 'yyyy')
        : view === 'month' ? format(cursor, 'MMMM yyyy')
        : isSameMonth(range.start, range.end) ? `${format(range.start, 'MMM d')} – ${format(range.end, 'd, yyyy')}`
        : `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`

    const fileSuffix = view === 'year' ? format(cursor, 'yyyy') : view === 'month' ? format(cursor, 'yyyy-MM') : `week-${dayKey(range.start)}`
    const dated = useMemo(() => events.filter(e => parseDay(e.start_date)), [events])

    const openWeek = (day: Date) => { setCursor(day); setView('week') }
    const openMonth = (day: Date) => { setCursor(day); setView('month') }
    const weekdays = eachDayOfInterval({ start: startOfWeek(cursor), end: addDays(startOfWeek(cursor), 6) })

    return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                    <button onClick={() => step(-1)} aria-label="Previous" className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => step(1)} aria-label="Next" className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
                        Today
                    </button>
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{title}</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="sm:ml-auto h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
                            <Download className="h-4 w-4" /> Export
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="text-xs font-normal text-zinc-500">
                            .ics file for Google Calendar, Outlook or Apple Calendar
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!shown.size} onSelect={() => downloadIcs([...shown], `eventra-${fileSuffix}.ics`, `Eventra ${title}`)}>
                            Events in {title} ({shown.size})
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!dated.length} onSelect={() => downloadIcs(dated, 'eventra-all-events.ics', 'Eventra')}>
                            All events ({dated.length})
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="inline-flex max-w-full rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1" role="tablist">
                    {(['week', 'month', 'year'] as View[]).map(v => (
                        <button
                            key={v}
                            role="tab"
                            aria-selected={view === v}
                            onClick={() => setView(v)}
                            className={`px-3 sm:px-4 py-1.5 text-sm rounded-md capitalize transition-colors ${view === v
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Week & month grids */}
            {view !== 'year' && (
                <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40">
                            {weekdays.map(d => (
                                <div key={d.getDay()} className="py-2 text-center text-xs font-medium text-zinc-500">
                                    {format(d, view === 'week' ? 'EEE d' : 'EEE')}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {eachDayOfInterval(range).map(day => {
                                const list = byDay.get(dayKey(day)) ?? []
                                const outside = view === 'month' && !isSameMonth(day, cursor)
                                const limit = view === 'month' ? 2 : list.length
                                return (
                                    <div
                                        key={dayKey(day)}
                                        className={`border-b border-r border-zinc-100 dark:border-zinc-700/60 p-1.5 space-y-1 ${view === 'week' ? 'min-h-[320px]' : 'min-h-[104px]'} ${outside ? 'bg-zinc-50/60 dark:bg-zinc-900/30' : ''}`}
                                    >
                                        {view === 'month' && (
                                            <button
                                                onClick={() => openWeek(day)}
                                                className={`h-6 min-w-6 px-1 rounded-full text-sm ${isToday(day)
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : outside ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-700 dark:text-zinc-300'} hover:ring-1 hover:ring-zinc-300`}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        )}
                                        {view === 'week' && isToday(day) && (
                                            <div className="text-[11px] font-semibold text-blue-600 px-1">Today</div>
                                        )}
                                        {list.slice(0, limit).map(event => (
                                            <EventChip key={event.id} event={event} wrap={view === "week"} />
                                        ))}
                                        {list.length > limit && (
                                            <button onClick={() => openWeek(day)} className="px-2 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                                                +{list.length - limit} more
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Year overview: twelve mini months, event days marked */}
            {view === 'year' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 p-5">
                    {Array.from({ length: 12 }, (_, i) => new Date(cursor.getFullYear(), i, 1)).map(month => {
                        const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) })
                        const count = new Set(days.filter(d => isSameMonth(d, month))
                            .flatMap(d => byDay.get(dayKey(d)) ?? [])).size
                        return (
                            <div key={month.getMonth()}>
                                <button onClick={() => openMonth(month)} className="mb-2 flex w-full items-baseline justify-between text-left">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-white hover:underline">{format(month, 'MMMM')}</span>
                                    <span className="text-xs text-zinc-500">{count ? `${count} event${count > 1 ? 's' : ''}` : ''}</span>
                                </button>
                                <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
                                    {weekdays.map(d => <span key={d.getDay()} className="text-zinc-400">{format(d, 'EEEEE')}</span>)}
                                    {days.map(day => {
                                        if (!isSameMonth(day, month)) return <span key={dayKey(day)} />
                                        const list = byDay.get(dayKey(day)) ?? []
                                        const first = list[0] && styleOf(list[0])
                                        return (
                                            <button
                                                key={dayKey(day)}
                                                onClick={() => list.length === 1 ? router.push(`/events/${list[0].id}`) : openWeek(day)}
                                                title={list.map(e => e.name).join('\n') || undefined}
                                                className={`relative mx-auto h-6 w-6 rounded-full ${isToday(day)
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : list.length ? `${first?.chip} font-semibold` : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                                            >
                                                {format(day, 'd')}
                                                {list.length > 1 && <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                {legend.map(type => (
                    <span key={type} className="inline-flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${ENGAGEMENT_STYLES[type].dot}`} />{type}
                    </span>
                ))}
                <span className="ml-auto text-zinc-500">{shown.size} event{shown.size === 1 ? '' : 's'} shown</span>
                <Link href="/events" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">
                    View all events <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}
