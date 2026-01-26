'use client'

import { use } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: event, isLoading, error } = useEvent(id)

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-zinc-600">Loading event...</p>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Event not found</p>
                <p className="text-zinc-600 mt-2">Error: {error?.message || 'Unknown error'}</p>
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
                <Link href="/events" className="text-zinc-600 hover:text-zinc-900 text-sm mb-4 inline-block">
                    ← Back to Events
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-5xl font-medium text-zinc-900 mb-4">{event.name}</h1>
                        <div className="flex gap-4 text-zinc-600">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="p-8 border border-zinc-200">
                            <p className="text-zinc-600 text-sm mb-2">Total Budget</p>
                            <p className="text-4xl font-medium text-zinc-900">${event.total_budget?.toLocaleString() || '0'}</p>
                        </Card>

                        <Card className="p-8 border border-zinc-200">
                            <p className="text-zinc-600 text-sm mb-2">Actual Leads</p>
                            <p className="text-4xl font-medium text-lime-400">{event.actual_leads || 0}</p>
                        </Card>

                        <Card className="p-8 border border-zinc-200">
                            <p className="text-zinc-600 text-sm mb-2">Target Leads</p>
                            <p className="text-4xl font-medium text-zinc-900">{event.target_leads || 0}</p>
                        </Card>
                    </div>

                    <Card className="p-8 border border-zinc-200 mt-6">
                        <h3 className="text-2xl font-medium text-zinc-900 mb-4">Event Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Start Date</p>
                                <p className="text-zinc-900">{event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">End Date</p>
                                <p className="text-zinc-900">{event.end_date ? new Date(event.end_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Location</p>
                                <p className="text-zinc-900">{event.location || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-sm mb-1">Event Type</p>
                                <p className="text-zinc-900">{event.event_type || 'Not set'}</p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Leads Tab */}
                <TabsContent value="leads">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {event.leads?.map((lead: any) => (
                            <Card key={lead.id} className="p-6 border border-zinc-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-medium text-zinc-900">{lead.first_name} {lead.last_name}</p>
                                        <p className="text-sm text-zinc-600">{lead.company || 'No company'}</p>
                                    </div>
                                    <Badge variant={lead.lead_score >= 80 ? 'lime' : 'secondary'}>
                                        {lead.lead_score || 0}
                                    </Badge>
                                </div>
                                <p className="text-sm text-zinc-600 mb-4">{lead.email}</p>
                                <Link href={`/leads/${lead.id}`}>
                                    <Button variant="outline" size="sm" className="w-full">View Lead</Button>
                                </Link>
                            </Card>
                        ))}
                        {(!event.leads || event.leads.length === 0) && (
                            <p className="text-zinc-600 col-span-3">No leads yet</p>
                        )}
                    </div>
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks">
                    <Card className="p-8 border border-zinc-200">
                        <p className="text-zinc-600">Tasks feature coming soon...</p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
