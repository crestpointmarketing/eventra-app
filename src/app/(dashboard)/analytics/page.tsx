'use client'

import { useEvents } from '@/hooks/useEvents'
import { useLeads } from '@/hooks/useLeads'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
    calculateBasicAnalytics,
    analyzeEventsByType,
    analyzeLeadsByPriority,
    getTopEventsByLeads,
    getTopEventsByBudget
} from '@/lib/analytics'
import { StatsLoadingGrid } from '@/components/ui/loading-skeletons'

export default function AnalyticsPage() {
    const { data: events, isLoading: eventsLoading } = useEvents()
    const { data: leads, isLoading: leadsLoading } = useLeads()

    const isLoading = eventsLoading || leadsLoading

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-5xl font-medium text-zinc-900 mb-8">Analytics</h1>
                <StatsLoadingGrid />
            </div>
        )
    }

    const analytics = calculateBasicAnalytics(events || [], leads || [])
    const eventsByType = analyzeEventsByType(events || [])
    const leadsByPriority = analyzeLeadsByPriority(leads || [])
    const topByLeads = getTopEventsByLeads(events || [], 5)
    const topByBudget = getTopEventsByBudget(events || [], 5)

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-5xl font-medium text-zinc-900 mb-8">Analytics</h1>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Card className="p-8 border border-zinc-200 text-center">
                    <p className="text-zinc-600 text-sm mb-2">Total Events</p>
                    <p className="text-5xl font-medium text-zinc-900">{analytics.totalEvents}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 text-center">
                    <p className="text-zinc-600 text-sm mb-2">Total Leads</p>
                    <p className="text-5xl font-medium text-zinc-900">{analytics.totalLeads}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 text-center">
                    <p className="text-zinc-600 text-sm mb-2">Hot Leads</p>
                    <p className="text-5xl font-medium text-lime-400">{analytics.hotLeads}</p>
                </Card>

                <Card className="p-8 border border-zinc-200 text-center">
                    <p className="text-zinc-600 text-sm mb-2">Conversion Rate</p>
                    <p className="text-5xl font-medium text-zinc-900">{analytics.conversionRate}%</p>
                </Card>
            </div>

            {/* Distribution Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {/* Events by Type */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Events by Type</h2>
                    <div className="space-y-4">
                        {Object.entries(eventsByType).map(([type, count]) => {
                            const percentage = analytics.totalEvents > 0
                                ? Math.round((count / analytics.totalEvents) * 100)
                                : 0
                            return (
                                <div key={type}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-zinc-900 capitalize">{type}</span>
                                        <span className="text-zinc-600">{count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 rounded-full h-2">
                                        <div
                                            className="bg-lime-400 h-2 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        {Object.keys(eventsByType).length === 0 && (
                            <p className="text-zinc-600">No event types to display</p>
                        )}
                    </div>
                </Card>

                {/* Leads by Priority */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Leads by Priority</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Hot', value: leadsByPriority.hot, color: 'bg-lime-400' },
                            { label: 'Warm', value: leadsByPriority.warm, color: 'bg-yellow-400' },
                            { label: 'Cold', value: leadsByPriority.cold, color: 'bg-zinc-300' }
                        ].map(({ label, value, color }) => {
                            const percentage = analytics.totalLeads > 0
                                ? Math.round((value / analytics.totalLeads) * 100)
                                : 0
                            return (
                                <div key={label}>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-zinc-900">{label}</span>
                                        <span className="text-zinc-600">{value} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 rounded-full h-2">
                                        <div
                                            className={`${color} h-2 rounded-full`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Events by Leads */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Top Events by Leads</h2>
                    <div className="space-y-4">
                        {topByLeads.map((event, index) => (
                            <Link key={event.id} href={`/events/${event.id}`}>
                                <div className="flex items-center gap-4 p-4 border border-zinc-200 rounded-lg hover:border-zinc-900 transition-colors">
                                    <div className="text-2xl font-medium text-zinc-400 w-8">#{index + 1}</div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-zinc-900">{event.name}</p>
                                        <p className="text-sm text-zinc-600">{event.location}</p>
                                    </div>
                                    <Badge variant="lime">{event.leads} leads</Badge>
                                </div>
                            </Link>
                        ))}
                        {topByLeads.length === 0 && (
                            <p className="text-zinc-600">No events with leads yet</p>
                        )}
                    </div>
                </Card>

                {/* Top Events by Budget */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Top Events by Budget</h2>
                    <div className="space-y-4">
                        {topByBudget.map((event, index) => (
                            <Link key={event.id} href={`/events/${event.id}`}>
                                <div className="flex items-center gap-4 p-4 border border-zinc-200 rounded-lg hover:border-zinc-900 transition-colors">
                                    <div className="text-2xl font-medium text-zinc-400 w-8">#{index + 1}</div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-zinc-900">{event.name}</p>
                                        <p className="text-sm text-zinc-600">{event.location}</p>
                                    </div>
                                    <Badge variant="secondary">${(event.budget / 1000).toFixed(0)}k</Badge>
                                </div>
                            </Link>
                        ))}
                        {topByBudget.length === 0 && (
                            <p className="text-zinc-600">No events with budget yet</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
