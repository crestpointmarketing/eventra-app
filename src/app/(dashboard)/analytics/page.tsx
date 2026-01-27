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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
    lime: '#a3e635',
    yellow: '#facc15',
    zinc: '#d4d4d8',
    blue: '#60a5fa',
    green: '#34d399',
    purple: '#c084fc',
    pink: '#f472b6',
    orange: '#fb923c'
}

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

    // Prepare data for charts
    const eventsByTypeData = Object.entries(eventsByType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
    }))

    const leadsByPriorityData = [
        { name: 'Hot', value: leadsByPriority.hot, fill: COLORS.lime },
        { name: 'Warm', value: leadsByPriority.warm, fill: COLORS.yellow },
        { name: 'Cold', value: leadsByPriority.cold, fill: COLORS.zinc }
    ]

    const topEventsData = topByLeads.map(event => ({
        name: event.name.length > 15 ? event.name.substring(0, 15) + '...' : event.name,
        leads: event.leads
    }))

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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {/* Events by Type - Pie Chart */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Events by Type</h2>
                    {eventsByTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={eventsByTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {eventsByTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-zinc-600 text-center py-12">No event types to display</p>
                    )}
                </Card>

                {/* Leads by Priority - Pie Chart */}
                <Card className="p-8 border border-zinc-200">
                    <h2 className="text-2xl font-medium text-zinc-900 mb-6">Leads by Priority</h2>
                    {analytics.totalLeads > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={leadsByPriorityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    dataKey="value"
                                >
                                    {leadsByPriorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-zinc-600 text-center py-12">No leads to display</p>
                    )}
                </Card>
            </div>

            {/* Top Events Chart */}
            {topEventsData.length > 0 && (
                <div className="mb-12">
                    <Card className="p-8 border border-zinc-200">
                        <h2 className="text-2xl font-medium text-zinc-900 mb-6">Top Events by Leads</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topEventsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis dataKey="name" stroke="#71717a" />
                                <YAxis stroke="#71717a" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e4e4e7',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="leads" fill={COLORS.lime} radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Top Performers Lists */}
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
