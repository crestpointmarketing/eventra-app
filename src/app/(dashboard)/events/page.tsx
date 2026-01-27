'use client'

import { useState, useMemo } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { exportEventsToCSV } from '@/lib/export'
import { EventsLoadingGrid } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, ArrowUpDown, Filter, AlertCircle, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

type SortOption = 'date-asc' | 'date-desc' | 'budget-asc' | 'budget-desc' | 'name-asc' | 'name-desc'

interface AdvancedFilters {
    budgetRange: [number, number]
    statuses: string[]
    eventTypes: string[]
    dateFrom: string
    dateTo: string
}

const STATUS_OPTIONS = ['planning', 'in_progress', 'completed', 'cancelled']
const EVENT_TYPE_OPTIONS = ['conference', 'workshop', 'webinar', 'trade_show', 'networking']

export default function EventsPage() {
    const { data: events, isLoading, error } = useEvents()
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('date-desc')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Advanced filters state
    const [filters, setFilters] = useState<AdvancedFilters>({
        budgetRange: [0, 1000000],
        statuses: [],
        eventTypes: [],
        dateFrom: '',
        dateTo: ''
    })

    // Calculate max budget for slider
    const maxBudget = useMemo(() => {
        if (!events || events.length === 0) return 1000000
        return Math.max(...events.map((e: any) => e.total_budget || 0), 100000)
    }, [events])

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.budgetRange[0] > 0 || filters.budgetRange[1] < maxBudget) count++
        if (filters.statuses.length > 0) count++
        if (filters.eventTypes.length > 0) count++
        if (filters.dateFrom || filters.dateTo) count++
        return count
    }, [filters, maxBudget])

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            budgetRange: [0, maxBudget],
            statuses: [],
            eventTypes: [],
            dateFrom: '',
            dateTo: ''
        })
    }

    // Filter and sort events
    const filteredAndSortedEvents = useMemo(() => {
        if (!events) return []

        // Apply search
        let result = events
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase()
            result = result.filter((event: any) =>
                event.name?.toLowerCase().includes(query) ||
                event.location?.toLowerCase().includes(query)
            )
        }

        // Apply budget filter
        if (filters.budgetRange[0] > 0 || filters.budgetRange[1] < maxBudget) {
            result = result.filter((event: any) => {
                const budget = event.total_budget || 0
                return budget >= filters.budgetRange[0] && budget <= filters.budgetRange[1]
            })
        }

        // Apply status filter
        if (filters.statuses.length > 0) {
            result = result.filter((event: any) =>
                filters.statuses.includes(event.status?.toLowerCase())
            )
        }

        // Apply event type filter
        if (filters.eventTypes.length > 0) {
            result = result.filter((event: any) =>
                filters.eventTypes.includes(event.event_type?.toLowerCase())
            )
        }

        // Apply date range filter
        if (filters.dateFrom) {
            result = result.filter((event: any) =>
                event.start_date && new Date(event.start_date) >= new Date(filters.dateFrom)
            )
        }
        if (filters.dateTo) {
            result = result.filter((event: any) =>
                event.start_date && new Date(event.start_date) <= new Date(filters.dateTo)
            )
        }

        // Sort
        const sorted = [...result].sort((a: any, b: any) => {
            switch (sortBy) {
                case 'date-asc':
                    return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()
                case 'date-desc':
                    return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
                case 'budget-asc':
                    return (a.total_budget || 0) - (b.total_budget || 0)
                case 'budget-desc':
                    return (b.total_budget || 0) - (a.total_budget || 0)
                case 'name-asc':
                    return (a.name || '').localeCompare(b.name || '')
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '')
                default:
                    return 0
            }
        })

        return sorted
    }, [events, debouncedSearch, sortBy, filters, maxBudget])

    // Handle export with toast feedback
    const handleExport = () => {
        try {
            exportEventsToCSV(filteredAndSortedEvents)
            toast.success(`Exported ${filteredAndSortedEvents.length} event${filteredAndSortedEvents.length !== 1 ? 's' : ''} to CSV`)
        } catch (error) {
            toast.error('Failed to export events', {
                description: 'Please try again or contact support'
            })
        }
    }

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-5xl font-medium text-zinc-900">My Events</h1>
                    <Button variant="outline" disabled>
                        Export to CSV
                    </Button>
                </div>
                <EventsLoadingGrid />
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <Card className="p-12 text-center border-red-200 bg-red-50">
                    <div className="mb-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">
                        Failed to Load Events
                    </h3>
                    <p className="text-zinc-600 mb-6">
                        {error.message || 'An unexpected error occurred'}
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                    >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </Card>
            </div>
        )
    }

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-5xl font-medium text-zinc-900 dark:text-white">My Events</h1>
                <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!events || events.length === 0}
                >
                    Export to CSV
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-8">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    <Input
                        type="text"
                        placeholder="Search events by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    />
                </div>

                {/* Advanced Filters */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="default" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900">
                            <Filter className="h-4 w-4 mr-2" />
                            Advanced Filters
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2 bg-lime-400 text-zinc-900 hover:bg-lime-400">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-lg">
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-medium text-sm mb-4 text-zinc-900 dark:text-white">Advanced Filters</h4>
                            </div>

                            {/* Budget Range */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-zinc-900 dark:text-white">Budget Range</Label>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                    ${filters.budgetRange[0].toLocaleString()} - ${filters.budgetRange[1].toLocaleString()}
                                </div>
                                <Slider
                                    min={0}
                                    max={maxBudget}
                                    step={10000}
                                    value={filters.budgetRange}
                                    onValueChange={(value) =>
                                        setFilters({ ...filters, budgetRange: value as [number, number] })
                                    }
                                />
                            </div>

                            {/* Date Range */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Event Date Range</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                    />
                                    <span className="text-zinc-600">to</span>
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="space-y-2">
                                    {STATUS_OPTIONS.map((status) => (
                                        <div key={status} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`status-${status}`}
                                                checked={filters.statuses.includes(status)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFilters({
                                                            ...filters,
                                                            statuses: [...filters.statuses, status]
                                                        })
                                                    } else {
                                                        setFilters({
                                                            ...filters,
                                                            statuses: filters.statuses.filter(s => s !== status)
                                                        })
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`status-${status}`}
                                                className="text-sm capitalize cursor-pointer"
                                            >
                                                {status.replace('_', ' ')}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Event Type Filter */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Event Type</Label>
                                <div className="space-y-2">
                                    {EVENT_TYPE_OPTIONS.map((type) => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`type-${type}`}
                                                checked={filters.eventTypes.includes(type)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFilters({
                                                            ...filters,
                                                            eventTypes: [...filters.eventTypes, type]
                                                        })
                                                    } else {
                                                        setFilters({
                                                            ...filters,
                                                            eventTypes: filters.eventTypes.filter(t => t !== type)
                                                        })
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`type-${type}`}
                                                className="text-sm capitalize cursor-pointer"
                                            >
                                                {type.replace('_', ' ')}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="flex-1"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Sort Selector */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-zinc-600" />
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-lg">
                            <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                            <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                            <SelectItem value="budget-desc">Budget (High to Low)</SelectItem>
                            <SelectItem value="budget-asc">Budget (Low to High)</SelectItem>
                            <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Results Count */}
            {hasActiveFilters && (
                <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Found {filteredAndSortedEvents.length} event{filteredAndSortedEvents.length !== 1 ? 's' : ''}
                    {activeFilterCount > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={clearFilters}
                            className="ml-2 h-auto p-0 text-zinc-600 hover:text-zinc-900"
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            {/* Events Grid */}
            {filteredAndSortedEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedEvents.map((event: any) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                            <Card className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-600 transition-colors h-full bg-white dark:bg-zinc-900">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-medium text-zinc-900 dark:text-white">{event.name}</h3>
                                    <Badge variant="lime">{event.actual_leads || 0} leads</Badge>
                                </div>
                                <div className="space-y-2 text-zinc-600 dark:text-zinc-400 text-sm">
                                    <p>📅 {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'}</p>
                                    <p>📍 {event.location || 'No location'}</p>
                                    <p>💰 ${event.total_budget?.toLocaleString() || '0'}</p>
                                    {event.event_type && (
                                        <p className="capitalize">🎪 {event.event_type.replace('_', ' ')}</p>
                                    )}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="p-12 border border-zinc-200 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900">
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        {hasActiveFilters ? 'No events match your filters' : 'No events yet'}
                    </p>
                    {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    )}
                    {!hasActiveFilters && (
                        <Link href="/events/new">
                            <Button>Create Your First Event</Button>
                        </Link>
                    )}
                </Card>
            )}
        </div>
    )
}
