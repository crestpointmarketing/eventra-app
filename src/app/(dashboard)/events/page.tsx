'use client'

import { useState, useMemo } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { exportEventsToCSV } from '@/lib/export'
import { EventsLoadingGrid } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search } from 'lucide-react'

export default function EventsPage() {
    const { data: events, isLoading, error } = useEvents()
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Filter events based on search
    const filteredEvents = useMemo(() => {
        if (!events) return []
        if (!debouncedSearch) return events

        const query = debouncedSearch.toLowerCase()
        return events.filter((event: any) =>
            event.name?.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query)
        )
    }, [events, debouncedSearch])

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-5xl font-medium text-zinc-900">My Events</h1>
                    <Button variant="outline" disabled>
                        Export to CSV
                    </Button>
                </div>

                <div className="flex gap-4 mb-8">
                    <button className="text-base font-medium text-zinc-900 border-b-2 border-zinc-900 pb-2">
                        All
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        Planning
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        In Progress
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        Completed
                    </button>
                </div>

                <EventsLoadingGrid />
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Error loading events: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-5xl font-medium text-zinc-900">My Events</h1>
                <Button
                    variant="outline"
                    onClick={() => exportEventsToCSV(filteredEvents || [])}
                    disabled={!filteredEvents || filteredEvents.length === 0}
                >
                    Export to CSV
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="Search events by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {debouncedSearch && (
                    <p className="text-sm text-zinc-600 mt-2">
                        Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <div className="flex gap-4 mb-8">
                <button className="text-base font-medium text-zinc-900 border-b-2 border-zinc-900 pb-2">
                    All
                </button>
                <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                    Planning
                </button>
                <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                    In Progress
                </button>
                <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                    Completed
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents?.map((event: any) => (
                    <Card key={event.id} className="h-full p-8 border border-zinc-200 hover:border-zinc-900 transition-colors text-center flex flex-col">
                        <div className="flex-grow">
                            <Badge variant="lime" className="mb-4">
                                Hot
                            </Badge>

                            <h3 className="text-2xl font-medium text-zinc-900 mb-2">
                                {event.name}
                            </h3>

                            <p className="text-zinc-600 mb-4">
                                {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'} - {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'No date'}
                                <br />
                                {event.location || 'No location'}
                            </p>

                            <div className="flex gap-4 text-sm text-zinc-600 mb-6 justify-center">
                                <span>${event.total_budget?.toLocaleString() || '0'}</span>
                                <span>{event.actual_leads || 0} Leads</span>
                            </div>
                        </div>

                        <Link href={`/events/${event.id}`}>
                            <Button className="w-full mt-auto">View Details</Button>
                        </Link>
                    </Card>
                ))}
            </div>

            {filteredEvents && filteredEvents.length === 0 && (
                <div className="text-center py-12">
                    {debouncedSearch ? (
                        <>
                            <p className="text-zinc-600 mb-4">No events found matching "{debouncedSearch}"</p>
                            <Button onClick={() => setSearchQuery('')} variant="outline">Clear Search</Button>
                        </>
                    ) : (
                        <>
                            <p className="text-zinc-600 mb-4">No events yet</p>
                            <Link href="/events/new">
                                <Button>Create Your First Event</Button>
                            </Link>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
