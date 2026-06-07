'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Calendar, Users, DollarSign, ArrowRight, Plus, AlertTriangle, TrendingUp } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useLeads } from '@/hooks/useLeads'
import { useTasks, useMarkTaskAsDone } from '@/hooks/useTasks'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEventDateRange } from '@/lib/utils/event-status'

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active:      'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
        planning:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
        in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        prep:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        draft:       'bg-zinc-100   text-zinc-700   dark:bg-zinc-700      dark:text-zinc-300',
        completed:   'bg-zinc-100   text-zinc-500   dark:bg-zinc-700      dark:text-zinc-400',
        cancelled:   'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
    }
    const labels: Record<string, string> = {
        active: 'Active', planning: 'Planning', in_progress: 'Confirmed',
        prep: 'Prep', draft: 'Draft', completed: 'Completed', cancelled: 'Cancelled',
    }
    const key = status?.toLowerCase() ?? ''
    return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${styles[key] ?? styles.draft}`}>
            {labels[key] ?? status}
        </span>
    )
}

function StatCard({ icon: Icon, label, value, sub }: {
    icon: React.ElementType
    label: string
    value: string | number
    sub?: string
}) {
    return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400 tracking-wide">{label}</span>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</div>
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

function calcProgress(event: any) {
    if (event.progress != null) return event.progress
    const map: Record<string, number> = { draft: 10, planning: 40, in_progress: 70, completed: 100, cancelled: 0 }
    return map[event.status?.toLowerCase()] ?? 0
}

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

    const recentEvents = useMemo(() =>
        (events ?? []).slice(0, 5),
        [events]
    )

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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-zinc-500 uppercase mb-6">
                    <span>Workspace</span>
                    <span>›</span>
                    <span className="text-zinc-900 dark:text-white font-medium">Dashboard</span>
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Dashboard</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Overview of active events and follow-up progress.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                    ) : (
                        <>
                            <StatCard icon={Calendar}    label="Active Events"    value={stats.activeEvents} />
                            <StatCard icon={Users}       label="Leads Captured"   value={stats.totalLeads} />
                            <StatCard icon={TrendingUp}  label="Hot Leads"        value={stats.hotLeads} sub="Score ≥ 80" />
                            <StatCard icon={DollarSign}  label="Est. Pipeline"    value={formatCurrency(stats.pipeline)} sub="Active event budgets" />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Current Events */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Recent Events</h2>
                                <Link href="/events" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
                                    View all <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                {eventsLoading ? (
                                    <div className="p-6 space-y-3">
                                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : recentEvents.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">No events yet</p>
                                        <Link href="/events/new" className="text-sm font-medium text-zinc-900 dark:text-white hover:underline flex items-center gap-1 justify-center">
                                            <Plus className="h-4 w-4" /> Create your first event
                                        </Link>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Event Name</th>
                                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Date</th>
                                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Status</th>
                                                <th className="text-right p-4 text-xs uppercase text-zinc-500 font-medium">Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentEvents.map((event: any) => (
                                                <tr
                                                    key={event.id}
                                                    className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                    onClick={() => window.location.href = `/events/${event.id}`}
                                                >
                                                    <td className="p-4">
                                                        <div className="font-medium text-zinc-900 dark:text-white">{event.name}</div>
                                                        <div className="text-xs text-zinc-500">{event.location || '—'}</div>
                                                    </td>
                                                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                        {formatEventDateRange(event.start_date, event.end_date)}
                                                    </td>
                                                    <td className="p-4">
                                                        <StatusBadge status={event.status} />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <div className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#CBFB45] rounded-full transition-all"
                                                                    style={{ width: `${calcProgress(event)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-zinc-600 dark:text-zinc-400 w-10 text-right">
                                                                {calcProgress(event)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Widgets */}
                    <div className="space-y-6">
                        {/* This Week Tasks */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Due This Week</h3>
                                <Link href="/tasks" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

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
                            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Overdue Tasks</h3>
                            </div>

                            <div className="p-4 space-y-3">
                                {tasksLoading ? (
                                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                                ) : overdueTasks.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                                        All tasks on track 🎉
                                    </p>
                                ) : (
                                    overdueTasks.map((task: any) => (
                                        <div key={task.id} className="flex gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-lg">
                                            <div className="flex-shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1 truncate">
                                                    {task.title}
                                                </div>
                                                <div className="text-xs text-orange-700 dark:text-orange-300">
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
