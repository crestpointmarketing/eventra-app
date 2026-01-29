'use client'

import Link from 'next/link'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useEvents } from '@/hooks/useEvents'
import {
    Calendar, CheckCircle2, Users, LayoutGrid,
    PlusCircle, Image, BarChart3, MapPin, ArrowRight
} from 'lucide-react'

export default function DashboardPage() {
    // Fetch events data
    const { data: events, isLoading, error } = useEvents()

    // Calculate KPIs
    const totalEvents = events?.length || 0
    const activeEvents = events?.filter(e =>
        e.status === 'planning' || e.status === 'in_progress'
    )?.length || 0
    const totalLeads = events?.reduce((sum, e) => sum + (e.lead_count || 0), 0) || 0
    const upcomingTasks = events?.reduce((sum, e) => sum + (e.task_count || 0), 0) || 0

    // Get upcoming events (sorted by date, max 6)
    const upcomingEvents = events
        ?.filter(e => e.start_date)
        ?.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        ?.slice(0, 6)

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            <TopNav />

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950">
                                <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{totalEvents}</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Events</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{activeEvents}</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Active Events</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{totalLeads}</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Leads</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                                <LayoutGrid className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{upcomingTasks}</p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Upcoming Tasks</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Event Cards Grid */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Upcoming Events</h2>
                        <Link href="/events">
                            <Button variant="outline" size="sm">View All</Button>
                        </Link>
                    </div>

                    {isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <Card key={i} className="p-6 animate-pulse">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-4"></div>
                                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-2"></div>
                                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {error && (
                        <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50">
                            <p className="text-red-600 dark:text-red-400">Error loading events: {error.message}</p>
                        </Card>
                    )}

                    {events && events.length === 0 && (
                        <Card className="p-12 text-center">
                            <Calendar className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                            <p className="text-zinc-600 dark:text-zinc-400 mb-4">No events yet</p>
                            <Link href="/events">
                                <Button>Create Your First Event</Button>
                            </Link>
                        </Card>
                    )}

                    {upcomingEvents && upcomingEvents.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingEvents.map((event, index) => (
                                <Link key={event.id} href={`/events/${event.id}`}>
                                    <Card className={`p-6 hover:shadow-lg transition-all cursor-pointer ${index === 0 ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
                                        }`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{event.name}</h3>
                                            <Badge variant={
                                                event.status === 'in_progress' ? 'default' :
                                                    event.status === 'completed' ? 'outline' :
                                                        'secondary'
                                            }>
                                                {event.status}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                            {event.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    <span>{event.location}</span>
                                                </div>
                                            )}
                                            {event.start_date && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                {event.lead_count || 0} leads
                                            </span>
                                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                Open Event <ArrowRight className="h-4 w-4" />
                                            </span>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Link href="/events">
                            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 w-fit mb-4 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                                    <PlusCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Create Event</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Start planning a new event</p>
                            </Card>
                        </Link>

                        <Link href="/leads">
                            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 w-fit mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">View Leads</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage your contacts</p>
                            </Card>
                        </Link>

                        <Link href="/assets">
                            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 w-fit mb-4 group-hover:bg-green-100 dark:group-hover:bg-green-900 transition-colors">
                                    <Image className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Browse Assets</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Access your resources</p>
                            </Card>
                        </Link>

                        <Link href="/analytics">
                            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 w-fit mb-4 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
                                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Analytics</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">View insights</p>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Supabase Connection Status */}
                <div className="text-center">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        ✓ Connected to Supabase • {totalEvents} events synced
                    </p>
                </div>
            </main>
        </div>
    )
}
