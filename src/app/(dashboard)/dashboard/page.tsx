'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Users, DollarSign, ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useLeads } from '@/hooks/useLeads'
import { useTasks, useMarkTaskAsDone } from '@/hooks/useTasks'
import { Skeleton } from '@/components/ui/skeleton'
import { EventCalendar } from '@/components/dashboard/event-calendar'
import { EngagementPill } from '@/components/events/portfolio-parts'
import { eventEngagement, isCommittedEvent } from '@/lib/events/taxonomy'

const TONES = {
    blue:   { card: 'bg-blue-50/70 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40',             icon: 'text-blue-600 dark:text-blue-400' },
    green:  { card: 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40', icon: 'text-emerald-600 dark:text-emerald-400' },
    orange: { card: 'bg-orange-50/70 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40',     icon: 'text-orange-600 dark:text-orange-400' },
    violet: { card: 'bg-violet-50/70 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40',     icon: 'text-violet-600 dark:text-violet-400' },
}

function StatCard({ icon: Icon, label, value, sub, tone }: {
    icon: React.ElementType
    label: string
    value: string | number
    sub?: string
    tone: keyof typeof TONES
}) {
    return (
        <div className={`border rounded-lg p-5 ${TONES[tone].card}`}>
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-4 w-4 ${TONES[tone].icon}`} />
                <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400 tracking-wide">{label}</span>
            </div>
            <div className="text-3xl font-semibold text-zinc-900 dark:text-white">{value}</div>
            {sub && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{sub}</div>}
        </div>
    )
}

function StatCardSkeleton() {
    return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-9 w-20" />
        </div>
    )
}

const INACTIVE = new Set(['completed', 'cancelled'])

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 1, notation: 'compact',
    }).format(n)
}

function isThisWeek(dateStr: string | null) {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const now = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 7)
    return d >= start && d < end
}

function isOverdue(dateStr: string | null, status: string) {
    if (!dateStr || status === 'done' || status === 'archived') return false
    return new Date(dateStr) < new Date()
}

function WidgetHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
            <Link href={title === 'Upcoming Events' ? '/events' : '/tasks'} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    )
}

export default function DashboardPage() {
    const { data: events, isLoading: eventsLoading } = useEvents()
    const { data: leads, isLoading: leadsLoading } = useLeads()
    const { data: tasks, isLoading: tasksLoading } = useTasks()
    const { mutate: markDone } = useMarkTaskAsDone()

    const isLoading = eventsLoading || leadsLoading || tasksLoading

    const stats = useMemo(() => {
        const activeEvents = (events ?? []).filter((e: any) => !INACTIVE.has(e.status?.toLowerCase()))
        const pipeline = activeEvents.reduce((sum: number, e: any) => sum + (e.total_budget ?? 0), 0)
        const hotLeads = (leads ?? []).filter((l: any) => (l.lead_score ?? 0) >= 80).length
        return {
            activeEvents: activeEvents.length,
            totalLeads: (leads ?? []).length,
            hotLeads,
            pipeline,
        }
    }, [events, leads])

    // The home page only shows events we are committed to; the engagement drives their color.
    const committedEvents = useMemo(() =>
        (events ?? []).filter(isCommittedEvent).map((e: any) => ({ ...e, engagement_type: eventEngagement(e) })),
        [events]
    )

    const upcomingEvents = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd')
        return committedEvents
            .filter((e: any) => e.start_date && e.start_date.slice(0, 10) >= today && !INACTIVE.has(e.status?.toLowerCase()))
            .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))
            .slice(0, 5)
    }, [committedEvents])

    const thisWeekTasks = useMemo(() =>
        (tasks ?? [])
            .filter((t: any) => isThisWeek(t.due_date) && t.status !== 'done' && t.status !== 'archived')
            .slice(0, 5),
        [tasks]
    )

    const overdueTasks = useMemo(() =>
        (tasks ?? [])
            .filter((t: any) => isOverdue(t.due_date, t.status))
            .slice(0, 3),
        [tasks]
    )

    return (
        <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
            <div className="max-w-[1600px] mx-auto">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Your events, tasks, and follow-ups at a glance.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                    ) : (
                        <>
                            <StatCard icon={Calendar}    label="Active Events"  value={stats.activeEvents} tone="blue" />
                            <StatCard icon={Users}       label="Leads Captured" value={stats.totalLeads} tone="green" />
                            <StatCard icon={TrendingUp}  label="Hot Leads"      value={stats.hotLeads} sub="Score ≥ 80" tone="orange" />
                            <StatCard icon={DollarSign}  label="Event Budget"   value={formatCurrency(stats.pipeline)} sub="Active event budgets" tone="violet" />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Event Calendar */}
                    <div className="lg:col-span-2 min-w-0">
                        {eventsLoading
                            ? <Skeleton className="h-[640px] w-full rounded-lg" />
                            : <EventCalendar events={committedEvents} />}
                    </div>

                    {/* Right Column: Widgets */}
                    <div className="space-y-6 min-w-0">
                        {/* Upcoming Events */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <WidgetHeader title="Upcoming Events" />
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
                                {eventsLoading ? (
                                    <div className="p-4 space-y-3">
                                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : upcomingEvents.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">No upcoming Sponsor, Exhibit or Attend events</p>
                                ) : (
                                    upcomingEvents.map((event: any) => {
                                        const [y, m, d] = event.start_date.slice(0, 10).split('-').map(Number)
                                        const start = new Date(y, m - 1, d)
                                        return (
                                            <Link key={event.id} href={`/events/${event.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                <div className="w-11 shrink-0 rounded-md border border-zinc-200 dark:border-zinc-700 py-1 text-center">
                                                    <div className="text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">{format(start, 'MMM')}</div>
                                                    <div className="text-lg font-semibold leading-none text-zinc-900 dark:text-white">{format(start, 'd')}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{event.name}</div>
                                                    <div className="text-xs text-zinc-500 truncate">{event.location || '—'}</div>
                                                </div>
                                                <EngagementPill type={event.engagement_type} />
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* This Week Tasks */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <WidgetHeader title="Due This Week" />
                            <div className="p-4 space-y-1">
                                {tasksLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                                ) : thisWeekTasks.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                                        No tasks due this week
                                    </p>
                                ) : (
                                    thisWeekTasks.map((task: any) => (
                                        <div
                                            key={task.id}
                                            className="flex items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors group"
                                        >
                                            <button
                                                onClick={() => markDone(task.id)}
                                                aria-label="Mark as done"
                                                className="mt-0.5 h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex-shrink-0 group-hover:border-[#CBFB45] transition-colors"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                                    {task.title}
                                                </div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {task.events?.name ?? 'No event'} • {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Overdue / Risks */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <WidgetHeader title="Overdue Tasks" />
                            <div className="p-4 space-y-3">
                                {tasksLoading ? (
                                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                                ) : overdueTasks.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                                        All tasks on track
                                    </p>
                                ) : (
                                    overdueTasks.map((task: any) => (
                                        <div key={task.id} className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg">
                                            <div className="flex-shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-red-900 dark:text-red-200 mb-1 truncate">
                                                    {task.title}
                                                </div>
                                                <div className="text-xs text-red-700 dark:text-red-300">
                                                    {task.events?.name ?? 'No event'} • Due {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
