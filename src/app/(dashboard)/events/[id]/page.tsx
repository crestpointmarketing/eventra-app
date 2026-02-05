'use client'

import { use, useMemo } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { useEventTasks } from '@/hooks/useTasks'
import { EventTasksTab } from '@/components/events/event-tasks-tab'
import { EventRisksTab } from '@/components/events/event-risks-tab'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    Flag,
    MessageSquare,
    Bell,
    TrendingUp,
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { EventIntelligenceCard } from '@/components/ai/event-intelligence-card'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const COLORS = {
    hot: '#a3e635',    // lime-400
    warm: '#facc15',   // yellow-400
    cold: '#d4d4d8'    // zinc-300
}

// Mock data
const getMockEventData = (event: any) => ({
    event_number: String(event.id),
    objective: "Deliver a flawless enterprise summit for 500+ attendees with 100% vendor satisfaction and zero critical risks.",
    key_messages: [
        "Innovation is at the core of the CrestPoint legacy.",
        "Scalable architecture for modern enterprises.",
    ],
    preparation_progress: {
        'Strategy & Planning': 85,
        'Outreach': 60,
        'Creative Assets': 42,
        'Logistics': 25,
    },
    recent_updates: [
        {
            id: '1',
            message: 'Contract signed by venue vendor.',
            hours_ago: 2,
            user_name: 'Vivian',
        },
    ],
})

export default function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: event, isLoading, error } = useEvent(id)
    const { data: eventTasks } = useEventTasks(id)
    const searchParams = useSearchParams()
    const view = searchParams.get('view') || 'overview'

    // Calculate lead analytics
    const leadAnalytics = useMemo(() => {
        if (!event?.leads || event.leads.length === 0) {
            return {
                total: 0,
                hot: 0,
                warm: 0,
                cold: 0,
                avgScore: 0,
                scoreDistribution: []
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
            { range: '80-100', count: 0 }
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
            scoreDistribution: scoreRanges
        }
    }, [event])

    const priorityData = [
        { name: 'Hot', value: leadAnalytics.hot, fill: COLORS.hot },
        { name: 'Warm', value: leadAnalytics.warm, fill: COLORS.warm },
        { name: 'Cold', value: leadAnalytics.cold, fill: COLORS.cold }
    ].filter(d => d.value > 0)

    if (isLoading || !event) return null
    // Layout handles loading/error, but we might be waiting for data here too. 
    // Only return null if strictly needed to avoid flicker, or just let it render what it can.

    const mockData = getMockEventData(event)

    // Render content based on view
    if (view === 'prep') {
        return <EventTasksTab eventId={id} />
    }

    if (view === 'risks') {
        return <EventRisksTab eventId={id} />
    }

    if (view === 'activity') {
        return (
            <Card className="p-12 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-center">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    Event Activity Feed
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Coming soon: Full activity log of all event changes and actions
                </p>
            </Card>
        )
    }

    if (view === 'analytics') {
        return (
            <div className="space-y-8">
                {/* Preparation Progress */}
                <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-6 flex items-center gap-2 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        PREPARATION PROGRESS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(mockData.preparation_progress).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {key}
                                    </span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{value}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#CBFB45] rounded-full transition-all"
                                        style={{ width: `${value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Charts Section */}
                {leadAnalytics.total > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Lead Priority Distribution */}
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

                        {/* Score Distribution */}
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
                                            borderRadius: '8px'
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

    // Default View: 'overview'
    return (
        <div className="space-y-8">
            {/* Three-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Event Objective */}
                <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2 font-medium">
                        <Flag className="w-4 h-4" />
                        EVENT OBJECTIVE
                    </h3>
                    <p className="text-zinc-900 dark:text-white italic text-sm leading-relaxed">
                        "{mockData.objective}"
                    </p>
                </Card>

                {/* Key Messages */}
                <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2 font-medium">
                        <MessageSquare className="w-4 h-4" />
                        KEY MESSAGES
                    </h3>
                    <ul className="space-y-3">
                        {mockData.key_messages.map((msg, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{msg}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Recent Updates */}
                <Card className="p-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-xs uppercase text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2 font-medium">
                        <Bell className="w-4 h-4" />
                        RECENT UPDATES
                    </h3>
                    <div className="space-y-4">
                        {mockData.recent_updates.map((update) => (
                            <div key={update.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#CBFB45] flex items-center justify-center text-xs font-bold text-zinc-900 flex-shrink-0">
                                    {update.user_name[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-900 dark:text-white">{update.message}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        {update.hours_ago} hours ago
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* AI Event Intelligence */}
            <EventIntelligenceCard eventId={id} eventName={event.name} />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">Total Budget</p>
                    <p className="text-4xl font-medium text-zinc-900 dark:text-white">${event.total_budget?.toLocaleString() || '0'}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">Total Leads</p>
                    <p className="text-4xl font-medium text-lime-400">{leadAnalytics.total}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">Hot Leads</p>
                    <p className="text-4xl font-medium text-lime-400">{leadAnalytics.hot}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">Avg Score</p>
                    <p className="text-4xl font-medium text-zinc-900 dark:text-white">{leadAnalytics.avgScore}</p>
                </Card>
            </div>

            {/* Charts Section */}
            {leadAnalytics.total > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lead Priority Distribution */}
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

                    {/* Score Distribution */}
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
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="count" fill="#a3e635" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Event Details */}
            <Card className="p-8 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                <h3 className="text-2xl font-medium text-zinc-900 dark:text-white mb-4">Event Details</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Start Date</p>
                        <p className="text-zinc-900 dark:text-white">{event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">End Date</p>
                        <p className="text-zinc-900 dark:text-white">{event.end_date ? new Date(event.end_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Location</p>
                        <p className="text-zinc-900 dark:text-white">{event.location || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Event URL</p>
                        {event.url ? (
                            <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate block">
                                {event.url}
                            </a>
                        ) : (
                            <p className="text-zinc-900 dark:text-white">Not set</p>
                        )}
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Event Type</p>
                        <p className="text-zinc-900 dark:text-white capitalize">{event.event_type || 'Not set'}</p>
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Target Leads</p>
                        <p className="text-zinc-900 dark:text-white">{event.target_leads || 0}</p>
                    </div>
                    <div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Lead Progress</p>
                        <p className="text-zinc-900 dark:text-white">
                            {leadAnalytics.total} / {event.target_leads || 0}
                            {event.target_leads > 0 && (
                                <span className="text-zinc-600 dark:text-zinc-400 text-sm ml-2">
                                    ({Math.round((leadAnalytics.total / event.target_leads) * 100)}%)
                                </span>
                            )}
                        </p>
                    </div>
                    {event.description && (
                        <div className="col-span-2 pt-4 border-t border-zinc-100 dark:border-zinc-700 mt-2">
                            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">Description</p>
                            <p className="text-zinc-900 dark:text-white text-sm leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
