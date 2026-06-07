'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MessageSquare, TrendingUp } from 'lucide-react'
import { useEvent } from '@/hooks/useEvent'
import { useEventTasks } from '@/hooks/useTasks'
import { EventTasksTab } from '@/components/events/event-tasks-tab'
import { EventRisksTab } from '@/components/events/event-risks-tab'
import { EventEmailTab } from '@/components/events/event-email-tab'
import { EventIntelligenceCard } from '@/components/ai/event-intelligence-card'
import { EventComments } from '@/components/events/event-comments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDateOnly } from '@/lib/date-only'

const COLORS = {
    hot: '#a3e635',
    warm: '#facc15',
    cold: '#d4d4d8',
}

const MOCK_PREPARATION_PROGRESS: Record<string, number> = {
    'Strategy & Planning': 85,
    Outreach: 60,
    'Creative Assets': 42,
    Logistics: 25,
}

export default function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: event, isLoading } = useEvent(id)
    const { data: eventTasks } = useEventTasks(id)
    const searchParams = useSearchParams()
    const view = searchParams.get('view') || 'overview'

    const leadAnalytics = useMemo(() => {
        if (!event?.leads || event.leads.length === 0) {
            return {
                total: 0,
                hot: 0,
                warm: 0,
                cold: 0,
                avgScore: 0,
                scoreDistribution: [],
            }
        }

        const hot = event.leads.filter((l: any) => l.lead_score >= 80).length
        const warm = event.leads.filter((l: any) => l.lead_score >= 50 && l.lead_score < 80).length
        const cold = event.leads.filter((l: any) => l.lead_score < 50).length
        const avgScore = event.leads.reduce((sum: number, l: any) => sum + (l.lead_score || 0), 0) / event.leads.length

        const scoreRanges = [
            { range: '0-20', count: 0 },
            { range: '20-40', count: 0 },
            { range: '40-60', count: 0 },
            { range: '60-80', count: 0 },
            { range: '80-100', count: 0 },
        ]

        event.leads.forEach((lead: any) => {
            const score = lead.lead_score || 0
            if (score < 20) scoreRanges[0].count++
            else if (score < 40) scoreRanges[1].count++
            else if (score < 60) scoreRanges[2].count++
            else if (score < 80) scoreRanges[3].count++
            else scoreRanges[4].count++
        })

        return {
            total: event.leads.length,
            hot,
            warm,
            cold,
            avgScore: Math.round(avgScore),
            scoreDistribution: scoreRanges,
        }
    }, [event])

    const priorityData = [
        { name: 'Hot', value: leadAnalytics.hot, fill: COLORS.hot },
        { name: 'Warm', value: leadAnalytics.warm, fill: COLORS.warm },
        { name: 'Cold', value: leadAnalytics.cold, fill: COLORS.cold },
    ].filter(d => d.value > 0)

    if (isLoading || !event) return null

    const eventUrl = event.website_url ?? event.url
    const openTasks = (eventTasks ?? []).filter((task: any) => task.status !== 'completed')
    const nextTasks = openTasks.slice(0, 4)
    const leadTarget = event.target_leads || 0
    const leadProgress = leadTarget > 0 ? Math.round((leadAnalytics.total / leadTarget) * 100) : 0

    if (view === 'tasks') {
        return <EventTasksTab eventId={id} />
    }

    if (view === 'notes') {
        return <EventRisksTab eventId={id} />
    }

    if (view === 'email') {
        return <EventEmailTab eventId={id} eventName={event.name} />
    }

    if (view === 'insights') {
        return (
            <div className="space-y-8">
                <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-6 flex items-center gap-2 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        PREPARATION PROGRESS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(MOCK_PREPARATION_PROGRESS).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{key}</span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{value}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#CBFB45] rounded-full transition-all" style={{ width: `${value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {leadAnalytics.total > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                            <h3 className="text-2xl font-medium text-zinc-900 dark:text-white mb-6">Lead Priority Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        dataKey="value"
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                            <h3 className="text-2xl font-medium text-zinc-900 dark:text-white mb-6">Lead Score Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={leadAnalytics.scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                    <XAxis dataKey="range" stroke="#71717a" />
                                    <YAxis stroke="#71717a" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#a3e635" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] gap-6">
                <div className="space-y-6">
                    <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Event Summary</h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                    Core details and the current operating target for this event.
                                </p>
                            </div>
                            <Link href={`/events/${id}/edit`}>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Date</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {event.start_date ? formatDateOnly(event.start_date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                                    {event.end_date && event.end_date !== event.start_date ? ` - ${formatDateOnly(event.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Location</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{event.location || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Type</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{event.event_type || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Website</p>
                                {eventUrl ? (
                                    <a href={eventUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                                        {eventUrl}
                                    </a>
                                ) : (
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Not set</p>
                                )}
                            </div>
                        </div>

                        {event.description && (
                            <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-700">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Description</p>
                                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{event.description}</p>
                            </div>
                        )}
                    </Card>

                    <EventIntelligenceCard eventId={id} eventName={event.name} />
                </div>

                <div className="space-y-6">
                    <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Next Actions</h2>
                        {nextTasks.length > 0 ? (
                            <div className="space-y-3">
                                {nextTasks.map((task: any) => (
                                    <Link
                                        key={task.id}
                                        href={`/tasks/${task.id}`}
                                        className="block rounded-md border border-zinc-200 p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/40"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{task.title}</p>
                                            <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">{task.priority || 'normal'}</Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {task.due_date ? `Due ${formatDateOnly(task.due_date, { month: 'short', day: 'numeric' })}` : 'No due date'} - {task.status || 'open'}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
                                No open tasks yet.
                            </p>
                        )}
                        <Link href={`/events/${id}?view=tasks`} className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                            View all tasks
                        </Link>
                    </Card>

                    <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Operating Metrics</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Budget</p>
                                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">${event.total_budget?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Leads</p>
                                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">{leadAnalytics.total}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Hot Leads</p>
                                <p className="mt-1 text-2xl font-semibold text-lime-500">{leadAnalytics.hot}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Avg Score</p>
                                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">{leadAnalytics.avgScore}</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                                <span>Lead target</span>
                                <span>{leadAnalytics.total} / {leadTarget}</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                                <div className="h-full rounded-full bg-[#CBFB45]" style={{ width: `${Math.min(leadProgress, 100)}%` }} />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2 font-medium">
                    <MessageSquare className="w-4 h-4" />
                    COMMENTS
                </h3>
                <EventComments eventId={id} />
            </Card>
        </div>
    )
}
