'use client'

import { use, useMemo } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = {
    hot: '#a3e635',    // lime-400
    warm: '#facc15',   // yellow-400
    cold: '#d4d4d8'    // zinc-300
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: event, isLoading, error } = useEvent(id)

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

        // Score distribution for histogram
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
    ].filter(d => d.value > 0) // Only show categories with data

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-zinc-600 dark:text-white/70">Loading event...</p>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Event not found</p>
                <p className="text-zinc-600 dark:text-white/70 mt-2">Error: {error?.message || 'Unknown error'}</p>
                <Link href="/events">
                    <Button className="mt-4">Back to Events</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="mb-8">
                <Link href="/events" className="text-zinc-600 hover:text-zinc-900 dark:text-white/60 dark:hover:text-[#cbfb45] text-sm mb-4 inline-block">
                    ← Back to Events
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-5xl font-medium text-zinc-900 dark:text-white mb-4">{event.name}</h1>
                        <div className="flex gap-4 text-zinc-600 dark:text-white/70">
                            <span>📅 {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'}</span>
                            <span>📍 {event.location || 'No location'}</span>
                            <span>💰 ${event.total_budget?.toLocaleString() || '0'}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/events/${id}/edit`}>
                            <Button variant="outline">Edit Event</Button>
                        </Link>
                        <Badge variant="lime">Active</Badge>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="leads">Leads ({event.leads?.length || 0})</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 text-center">
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-2">Total Budget</p>
                            <p className="text-4xl font-medium text-zinc-900 dark:text-white">${event.total_budget?.toLocaleString() || '0'}</p>
                        </Card>

                        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 text-center">
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-2">Total Leads</p>
                            <p className="text-4xl font-medium text-lime-400">{leadAnalytics.total}</p>
                        </Card>

                        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 text-center">
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-2">Hot Leads</p>
                            <p className="text-4xl font-medium text-lime-400">{leadAnalytics.hot}</p>
                        </Card>

                        <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 text-center">
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-2">Avg Score</p>
                            <p className="text-4xl font-medium text-zinc-900 dark:text-white">{leadAnalytics.avgScore}</p>
                        </Card>
                    </div>

                    {/* Charts Section */}
                    {leadAnalytics.total > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Lead Priority Distribution */}
                            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
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
                            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
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
                    <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                        <h3 className="text-2xl font-medium text-zinc-900 dark:text-white mb-4">Event Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Start Date</p>
                                <p className="text-zinc-900 dark:text-white/85">{event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">End Date</p>
                                <p className="text-zinc-900 dark:text-white/85">{event.end_date ? new Date(event.end_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Location</p>
                                <p className="text-zinc-900">{event.location || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Event Type</p>
                                <p className="text-zinc-900 capitalize">{event.event_type || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Target Leads</p>
                                <p className="text-zinc-900">{event.target_leads || 0}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Lead Progress</p>
                                <p className="text-zinc-900 dark:text-white/85">
                                    {leadAnalytics.total} / {event.target_leads || 0}
                                    {event.target_leads > 0 && (
                                        <span className="text-zinc-600 dark:text-white/60 text-sm ml-2">
                                            ({Math.round((leadAnalytics.total / event.target_leads) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Leads Tab */}
                <TabsContent value="leads">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {event.leads?.map((lead: any) => (
                            <Card key={lead.id} className="p-6 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">{lead.first_name} {lead.last_name}</p>
                                        <p className="text-sm text-zinc-600 dark:text-white/70">{lead.company || 'No company'}</p>
                                    </div>
                                    <Badge variant={lead.lead_score >= 80 ? 'lime' : 'secondary'}>
                                        {lead.lead_score || 0}
                                    </Badge>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-white/70 mb-4">{lead.email}</p>
                                <Link href={`/leads/${lead.id}`}>
                                    <Button variant="outline" size="sm" className="w-full">View Lead</Button>
                                </Link>
                            </Card>
                        ))}
                        {(!event.leads || event.leads.length === 0) && (
                            <p className="text-zinc-600 dark:text-white/70 col-span-3">No leads yet</p>
                        )}
                    </div>
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks">
                    <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10">
                        <p className="text-zinc-600 dark:text-white/70">Tasks feature coming soon...</p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
