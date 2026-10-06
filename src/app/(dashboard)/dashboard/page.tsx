'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Building2, Calendar, Check, Handshake, Plus, Users } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ENGAGEMENT_LABEL, ENGAGEMENT_STYLES, EventCalendar, parseDay, shortLocation,
} from '@/components/dashboard/event-calendar'
import { COMMITTED_ENGAGEMENTS, eventEngagement, isCommittedEvent, type EngagementType } from '@/lib/events/taxonomy'

type Committed = (typeof COMMITTED_ENGAGEMENTS)[number]

const CARD_TONES = {
    total:   { card: 'bg-blue-50/70 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40',             icon: 'text-blue-600 dark:text-blue-400' },
    Sponsor: { card: 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40', icon: 'text-emerald-600 dark:text-emerald-400' },
    Exhibit: { card: 'bg-sky-50/70 border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/40',                 icon: 'text-blue-600 dark:text-blue-400' },
    Attend:  { card: 'bg-violet-50/70 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40',     icon: 'text-violet-600 dark:text-violet-400' },
}

const CARD_ICONS = { total: Calendar, Sponsor: Handshake, Exhibit: Building2, Attend: Users }

// Checkbox fill per engagement, matching the calendar dots.
const CHECK_TONES: Record<Committed, string> = {
    Sponsor: 'bg-emerald-600 border-emerald-600',
    Exhibit: 'bg-blue-600 border-blue-600',
    Attend:  'bg-violet-600 border-violet-600',
}

function StatCard({ tone, label, value }: { tone: keyof typeof CARD_TONES; label: string; value: number }) {
    const Icon = CARD_ICONS[tone]
    return (
        <div className={`flex items-start gap-3 border rounded-lg px-5 py-4 ${CARD_TONES[tone].card}`}>
            <Icon className={`h-6 w-6 mt-0.5 shrink-0 ${CARD_TONES[tone].icon}`} />
            <div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">{label}</div>
                <div className="text-3xl font-semibold text-zinc-900 dark:text-white">{value}</div>
            </div>
        </div>
    )
}

/** "Oct 1 – 3, 2026", "Oct 30 – Nov 2, 2026" or "Oct 1, 2026". */
function formatRange(start: Date, end: Date) {
    if (+start === +end) return format(start, 'MMM d, yyyy')
    if (start.getFullYear() !== end.getFullYear()) return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
    if (start.getMonth() !== end.getMonth()) return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
}

const INACTIVE = new Set(['completed', 'cancelled', 'canceled'])

export default function DashboardPage() {
    const { data: events, isLoading } = useEvents()
    const [types, setTypes] = useState<Set<EngagementType>>(() => new Set(COMMITTED_ENGAGEMENTS))

    // The home page only shows events we sponsor, exhibit at or attend; the engagement drives their color.
    const committed = useMemo(() =>
        (events ?? []).filter(isCommittedEvent).map((e: any) => ({ ...e, engagement_type: eventEngagement(e) })),
        [events]
    )
    const counts = useMemo(() => Object.fromEntries(COMMITTED_ENGAGEMENTS.map(t =>
        [t, committed.filter(e => e.engagement_type === t).length])) as Record<Committed, number>, [committed])

    const visible = useMemo(() => committed.filter(e => types.has(e.engagement_type)), [committed, types])

    const upcoming = useMemo(() => {
        const today = parseDay(format(new Date(), 'yyyy-MM-dd'))!
        return visible
            .map(e => {
                const start = parseDay(e.start_date)
                const end = parseDay(e.end_date) ?? start
                return start && end ? { event: e, start, end: end < start ? start : end } : null
            })
            .filter((x): x is NonNullable<typeof x> => !!x && x.end >= today && !INACTIVE.has(x.event.status?.toLowerCase()))
            .sort((a, b) => +a.start - +b.start)
            .slice(0, 7)
    }, [visible])

    const toggle = (type: EngagementType) => setTypes(prev => {
        const next = new Set(prev)
        if (next.has(type)) next.delete(type); else next.add(type)
        return next
    })

    return (
        <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
            <div className="max-w-[1600px] mx-auto">
                <h1 className="sr-only">Dashboard</h1>

                {/* Summary + primary action */}
                <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-6">
                    <div className="grid flex-1 grid-cols-2 lg:grid-cols-4 gap-4">
                        {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-lg" />) : <>
                            <StatCard tone="total" label="Total Events" value={committed.length} />
                            {COMMITTED_ENGAGEMENTS.map(t => <StatCard key={t} tone={t} label={ENGAGEMENT_LABEL[t]} value={counts[t]} />)}
                        </>}
                    </div>
                    <Link
                        href="/events/new"
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 xl:self-auto"
                    >
                        <Plus className="h-4 w-4" /> Add Event
                    </Link>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                    {/* Calendar */}
                    <div className="min-w-0">
                        {isLoading
                            ? <Skeleton className="h-[680px] w-full rounded-lg" />
                            : <EventCalendar events={visible} />}
                    </div>

                    <div className="space-y-6 min-w-0">
                        {/* Engagement filter */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5">
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Filter by Event Type</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                {COMMITTED_ENGAGEMENTS.map(type => {
                                    const on = types.has(type)
                                    return (
                                        <label key={type} className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                                            <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(type)} />
                                            <span className={`flex h-5 w-5 items-center justify-center rounded border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 ${on ? CHECK_TONES[type] : 'border-zinc-300 dark:border-zinc-600'}`}>
                                                {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                            </span>
                                            {ENGAGEMENT_LABEL[type]}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Upcoming Events</h3>
                                <Link href="/events" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                    View all <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
                                {isLoading ? (
                                    <div className="p-4 space-y-3">
                                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                                    </div>
                                ) : upcoming.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-5 py-8">
                                        No upcoming {[...types].map(t => ENGAGEMENT_LABEL[t]).join(', ') || 'selected'} events
                                    </p>
                                ) : (
                                    upcoming.map(({ event, start, end }) => {
                                        const type = event.engagement_type as EngagementType
                                        return (
                                            <Link key={event.id} href={`/events/${event.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                <div className="w-12 shrink-0 rounded-md border border-zinc-200 dark:border-zinc-700 py-1 text-center">
                                                    <div className="text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">{format(start, 'MMM')}</div>
                                                    <div className="text-xl font-semibold leading-none text-zinc-900 dark:text-white">{format(start, 'd')}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{event.name}</div>
                                                    <div className="text-xs text-zinc-500 truncate">{shortLocation(event.location) || '—'}</div>
                                                    <div className="text-xs text-zinc-500">{formatRange(start, end)}</div>
                                                </div>
                                                <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${ENGAGEMENT_STYLES[type].pill}`}>
                                                    {ENGAGEMENT_LABEL[type]}
                                                </span>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
