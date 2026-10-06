'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    addMonths, addWeeks, addYears, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek,
    endOfYear, format, isSameMonth, isToday, startOfMonth, startOfWeek, startOfYear,
} from 'date-fns'
import { ArrowRight, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { COMMITTED_ENGAGEMENTS, ENGAGEMENT_TYPES, eventEngagement, type EngagementType } from '@/lib/events/taxonomy'
import { downloadIcs, type IcsEvent } from '@/lib/events/ics'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type View = 'month' | 'week' | 'year'

export type CalendarEvent = IcsEvent & { discovery_priority?: string | null }

export const ENGAGEMENT_LABEL: Record<EngagementType, string> = {
    Sponsor: 'Sponsor', Exhibit: 'Exhibit', Attend: 'Attendee', Speaking: 'Speaking', Follow: 'Follow',
}

// Bar, dot and pill colors per engagement on the dashboard.
export const ENGAGEMENT_STYLES: Record<EngagementType, { dot: string; bar: string; pill: string }> = {
    Sponsor:  { dot: 'bg-emerald-500', bar: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    Exhibit:  { dot: 'bg-blue-500',    bar: 'bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100',             pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    Attend:   { dot: 'bg-violet-500',  bar: 'bg-violet-50 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100',     pill: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
    Speaking: { dot: 'bg-pink-500',    bar: 'bg-pink-50 text-pink-900 dark:bg-pink-900/30 dark:text-pink-100',             pill: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    Follow:   { dot: 'bg-zinc-400',    bar: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100',               pill: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300' },
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/
const MAX_SPAN_DAYS = 60
const MONTH_LANES = 3

/** Event dates are calendar days; parse them locally so they never shift by timezone. */
export function parseDay(value: string | null | undefined) {
    const match = value?.match(DATE_ONLY)
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

export function shortLocation(location?: string | null) {
    return (location ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(', ')
}

/** Inclusive day span; invalid or implausibly long ranges collapse to the start day. */
function eventSpan(event: CalendarEvent) {
    const start = parseDay(event.start_date)
    if (!start) return null
    let end = parseDay(event.end_date) ?? start
    if (end < start || differenceInCalendarDays(end, start) > MAX_SPAN_DAYS) end = start
    return { start, end }
}

interface Segment { event: CalendarEvent; from: number; to: number; lane: number; clippedStart: boolean; clippedEnd: boolean }

/** Lay out the events of one week as horizontal bars, packing them into the fewest lanes. */
function layoutWeek(events: CalendarEvent[], weekStart: Date) {
    const weekEnd = endOfWeek(weekStart)
    const segments: Segment[] = []
    for (const event of events) {
        const span = eventSpan(event)
        if (!span || span.end < weekStart || span.start > weekEnd) continue
        segments.push({
            event,
            from: Math.max(0, differenceInCalendarDays(span.start, weekStart)),
            to: Math.min(6, differenceInCalendarDays(span.end, weekStart)),
            lane: 0,
            clippedStart: span.start < weekStart,
            clippedEnd: span.end > weekEnd,
        })
    }
    segments.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from) || a.event.name.localeCompare(b.event.name))
    const laneEnds: number[] = []
    for (const seg of segments) {
        let lane = laneEnds.findIndex(end => end < seg.from)
        if (lane === -1) lane = laneEnds.length
        laneEnds[lane] = seg.to
        seg.lane = lane
    }
    return segments
}

function EventBar({ seg }: { seg: Segment }) {
    const engagement = eventEngagement(seg.event)
    const style = ENGAGEMENT_STYLES[engagement]
    const location = shortLocation(seg.event.location)
    return (
        <Link
            href={`/events/${seg.event.id}`}
            title={`${seg.event.name} · ${ENGAGEMENT_LABEL[engagement]}${location ? ` · ${location}` : ''}`}
            style={{ gridColumn: `${seg.from + 1} / ${seg.to + 2}`, gridRow: seg.lane + 2 }}
            className={`min-w-0 px-2.5 py-1.5 text-left transition hover:brightness-95 dark:hover:brightness-125 ${style.bar}
                ${seg.clippedStart ? 'rounded-l-none' : 'ml-1 rounded-l-md'} ${seg.clippedEnd ? 'rounded-r-none' : 'mr-1 rounded-r-md'}`}
        >
            <span className="flex items-center gap-2 min-w-0">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                <span className="truncate text-xs font-medium">{seg.event.name}</span>
            </span>
            <span className="block truncate pl-[18px] text-[11px] opacity-75">
                {ENGAGEMENT_LABEL[engagement]}{location && ` · ${location}`}
            </span>
        </Link>
    )
}

export function EventCalendar({ events }: { events: CalendarEvent[] }) {
    const router = useRouter()
    const [view, setView] = useState<View>('month')
    const [cursor, setCursor] = useState(() => new Date())

    // The period a user is looking at (month view excludes the padding days of adjacent months).
    const period = useMemo(() => view === 'week' ? { start: startOfWeek(cursor), end: endOfWeek(cursor) }
        : view === 'year' ? { start: startOfYear(cursor), end: endOfYear(cursor) }
        : { start: startOfMonth(cursor), end: endOfMonth(cursor) }, [view, cursor])

    const shown = useMemo(() => events.filter(e => {
        const span = eventSpan(e)
        return span && span.end >= period.start && span.start <= period.end
    }), [events, period])

    const weeks = useMemo(() => {
        if (view === 'year') return []
        const first = startOfWeek(view === 'week' ? cursor : startOfMonth(cursor))
        const last = view === 'week' ? first : startOfWeek(endOfMonth(cursor))
        const starts: Date[] = []
        for (let d = first; d <= last; d = addWeeks(d, 1)) starts.push(d)
        return starts.map(start => ({ start, segments: layoutWeek(shown, start) }))
    }, [view, cursor, shown])

    // Year view: events per day, for coloring the mini months.
    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>()
        if (view !== 'year') return map
        for (const event of shown) {
            const span = eventSpan(event)!
            for (const day of eachDayOfInterval(span)) map.set(dayKey(day), [...(map.get(dayKey(day)) ?? []), event])
        }
        return map
    }, [view, shown])

    const step = (dir: 1 | -1) => setCursor(c =>
        view === 'week' ? addWeeks(c, dir) : view === 'year' ? addYears(c, dir) : addMonths(c, dir))

    const title = view === 'year' ? format(cursor, 'yyyy')
        : view === 'month' ? format(cursor, 'MMMM yyyy')
        : isSameMonth(period.start, period.end) ? `${format(period.start, 'MMM d')} – ${format(period.end, 'd, yyyy')}`
        : `${format(period.start, 'MMM d')} – ${format(period.end, 'MMM d, yyyy')}`

    const fileSuffix = view === 'year' ? format(cursor, 'yyyy') : view === 'month' ? format(cursor, 'yyyy-MM') : `week-${dayKey(period.start)}`
    const dated = useMemo(() => events.filter(e => parseDay(e.start_date)), [events])
    const exportEvents = (list: CalendarEvent[], file: string, name: string) =>
        downloadIcs(list.map(e => ({ ...e, engagement_type: ENGAGEMENT_LABEL[eventEngagement(e)] })), file, name)

    const openWeek = (day: Date) => { setCursor(day); setView('week') }
    const weekdays = eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })

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
                </div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">{title}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5" role="tablist">
                        {(['month', 'week', 'year'] as View[]).map(v => (
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
                    <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700">
                        Today
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button aria-label="Export calendar" title="Export .ics" className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                                <Download className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel className="text-xs font-normal text-zinc-500">
                                .ics file for Google Calendar, Outlook or Apple Calendar
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!shown.length} onSelect={() => exportEvents(shown, `eventra-${fileSuffix}.ics`, `Eventra ${title}`)}>
                                Events in {title} ({shown.length})
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!dated.length} onSelect={() => exportEvents(dated, 'eventra-events.ics', 'Eventra')}>
                                All shown types ({dated.length})
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Month & week: one row per week, multi-day events drawn as spanning bars */}
            {view !== 'year' && (
                <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40">
                            {weekdays.map(d => (
                                <div key={d.getDay()} className="py-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
                                    {format(d, 'EEE')}
                                </div>
                            ))}
                        </div>
                        {weeks.map(({ start, segments }) => {
                            const days = eachDayOfInterval({ start, end: endOfWeek(start) })
                            const lanes = view === 'month' ? MONTH_LANES : Infinity
                            const visible = segments.filter(s => s.lane < lanes)
                            const hiddenPerDay = days.map((_, i) => segments.filter(s => s.lane >= lanes && s.from <= i && s.to >= i).length)
                            return (
                                <div key={dayKey(start)} className={`relative border-b border-zinc-100 dark:border-zinc-700/60 ${view === 'week' ? 'min-h-[360px]' : 'min-h-[120px]'}`}>
                                    <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
                                        {days.map(day => (
                                            <div key={dayKey(day)} className={`border-r border-zinc-100 dark:border-zinc-700/60 last:border-r-0 ${view === 'month' && !isSameMonth(day, cursor) ? 'bg-zinc-50/70 dark:bg-zinc-900/30' : ''}`} />
                                        ))}
                                    </div>
                                    <div className="relative grid grid-cols-7 gap-y-1 pb-2">
                                        {days.map((day, i) => {
                                            const outside = view === 'month' && !isSameMonth(day, cursor)
                                            return (
                                                <div key={dayKey(day)} style={{ gridColumn: i + 1, gridRow: 1 }} className="px-2 pt-2">
                                                    <button
                                                        onClick={() => view === 'month' && openWeek(day)}
                                                        className={`h-7 min-w-7 px-1.5 rounded-full text-sm ${isToday(day)
                                                            ? 'bg-blue-600 text-white font-semibold'
                                                            : outside ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200'} ${view === 'month' ? 'hover:ring-1 hover:ring-zinc-300' : 'cursor-default'}`}
                                                    >
                                                        {format(day, view === 'week' ? 'MMM d' : 'd')}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        {visible.map(seg => <EventBar key={`${seg.event.id}-${seg.from}`} seg={seg} />)}
                                        {hiddenPerDay.map((n, i) => n > 0 && (
                                            <button
                                                key={i}
                                                style={{ gridColumn: i + 1, gridRow: MONTH_LANES + 2 }}
                                                onClick={() => openWeek(days[i])}
                                                className="px-2 text-left text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                            >
                                                +{n} more
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Year overview: twelve mini months, event days marked */}
            {view === 'year' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 p-5">
                    {Array.from({ length: 12 }, (_, i) => new Date(cursor.getFullYear(), i, 1)).map(month => {
                        const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) })
                        const monthEvents = [...new Set(days.filter(d => isSameMonth(d, month)).flatMap(d => byDay.get(dayKey(d)) ?? []))]
                        const counts = ENGAGEMENT_TYPES
                            .map(type => [type, monthEvents.filter(e => eventEngagement(e) === type).length] as const)
                            .filter(([, n]) => n > 0)
                        return (
                            <div key={month.getMonth()}>
                                <button onClick={() => { setCursor(month); setView('month') }} className="mb-2 flex w-full items-baseline justify-between text-left">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-white hover:underline">{format(month, 'MMMM')}</span>
                                    <span className="flex items-center gap-2 text-xs text-zinc-500">
                                        {counts.map(([type, n]) => (
                                            <span key={type} className="inline-flex items-center gap-1" title={`${n} ${ENGAGEMENT_LABEL[type]}`}>
                                                <span className={`h-2 w-2 rounded-full ${ENGAGEMENT_STYLES[type].dot}`} />{n}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                                <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
                                    {weekdays.map(d => <span key={d.getDay()} className="text-zinc-400">{format(d, 'EEEEE')}</span>)}
                                    {days.map(day => {
                                        if (!isSameMonth(day, month)) return <span key={dayKey(day)} />
                                        const list = byDay.get(dayKey(day)) ?? []
                                        const first = list[0] && ENGAGEMENT_STYLES[eventEngagement(list[0])]
                                        return (
                                            <button
                                                key={dayKey(day)}
                                                onClick={() => list.length === 1 ? router.push(`/events/${list[0].id}`) : openWeek(day)}
                                                title={list.map(e => `${e.name} · ${ENGAGEMENT_LABEL[eventEngagement(e)]}`).join('\n') || undefined}
                                                className={`relative mx-auto h-6 w-6 rounded-full ${isToday(day)
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : list.length ? `${first?.bar} font-semibold` : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
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
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {COMMITTED_ENGAGEMENTS.map(type => (
                    <span key={type} className="inline-flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${ENGAGEMENT_STYLES[type].dot}`} />{ENGAGEMENT_LABEL[type]}
                    </span>
                ))}
                <span className="ml-auto text-xs text-zinc-500">{shown.length} event{shown.length === 1 ? '' : 's'} shown</span>
                <Link href="/events" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                    View all events <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}
