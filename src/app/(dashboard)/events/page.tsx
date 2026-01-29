'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { Search, ArrowUpDown, Filter, AlertCircle, RefreshCcw, MapPin, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { getEventStatus, formatEventDateRange } from '@/lib/utils/event-status'
import { PageTransition } from '@/components/animations/page-transition'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'

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

// Helper functions
const generateEventId = (event: any) => {
    const year = new Date(event.created_at || Date.now()).getFullYear()
    const idNumber = String(event.id).slice(-3).padStart(3, '0')
    return `#EV-${year}-${idNumber}`
}

const getOwnerAvatar = (event: any) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(event.created_by || 'User')}&background=random`
}

const calculateProgress = (event: any) => {
    if (event.progress) return event.progress

    const statusProgress: { [key: string]: number } = {
        draft: 10,
        planning: 40,
        in_progress: 70,
        completed: 100,
        cancelled: 0,
    }

    return statusProgress[event.status?.toLowerCase()] || 0
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const styles: { [key: string]: string } = {
        planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        completed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }

    const labels: { [key: string]: string } = {
        planning: 'Planning',
        in_progress: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled',
    }

    return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${styles[status?.toLowerCase()] || styles.planning}`}>
            {labels[status?.toLowerCase()] || status}
        </span>
    )
}

export default function EventsPage() {
    const router = useRouter()
    const { data: events, isLoading, error } = useEvents()
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('date-desc')
    const debouncedSearch = useDebounce(searchQuery, 300)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

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
        setSearchQuery('')
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

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage)
    const paginatedEvents = filteredAndSortedEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

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

    // Bulk selection
    const {
        selectedIds,
        selectedItems,
        selectedCount,
        isAllSelected,
        toggleItem,
        toggleAll,
        clearSelection
    } = useBulkSelection(paginatedEvents)

    // Handle bulk export
    const handleBulkExport = () => {
        try {
            exportEventsToCSV(selectedItems)
            toast.success(`Exported ${selectedCount} event${selectedCount > 1 ? 's' : ''} to CSV`)
            clearSelection()
        } catch (error) {
            toast.error('Failed to export events')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded mb-8 animate-pulse"></div>
                    <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-8 animate-pulse"></div>
                    <EventsLoadingGrid />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    <Card className="p-12 text-center border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                        <div className="mb-4">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                            Failed to Load Events
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
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
            </div>
        )
    }

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch

    return (
        <PageTransition>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-xs text-zinc-500 uppercase mb-6">
                        <span>Workspace</span>
                        <span>›</span>
                        <span className="text-zinc-900 dark:text-white font-medium">Events</span>
                    </nav>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                                Events
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Manage and track your global event portfolio.
                            </p>
                        </div>
                        <Link href="/events/new">
                            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Event
                            </Button>
                        </Link>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex gap-4 mb-6">
                        {/* Advanced Filters Popup */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filters
                                    {activeFilterCount > 0 && (
                                        <Badge variant="secondary" className="ml-2 bg-[#CBFB45] text-zinc-900 hover:bg-[#CBFB45]">
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
                                        <Label className="text-sm font-medium text-zinc-900 dark:text-white">Event Date Range</Label>
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                type="date"
                                                value={filters.dateFrom}
                                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                                className="dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                                            />
                                            <span className="text-zinc-600 dark:text-zinc-400">to</span>
                                            <Input
                                                type="date"
                                                value={filters.dateTo}
                                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                                className="dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                                            />
                                        </div>
                                    </div>

                                    {/* Status Filter */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-zinc-900 dark:text-white">Status</Label>
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
                                                        className="text-sm capitalize cursor-pointer text-zinc-700 dark:text-zinc-300"
                                                    >
                                                        {status.replace('_', ' ')}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Event Type Filter */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-zinc-900 dark:text-white">Event Type</Label>
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
                                                        className="text-sm capitalize cursor-pointer text-zinc-700 dark:text-zinc-300"
                                                    >
                                                        {type.replace('_', ' ')}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t dark:border-zinc-700">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="flex-1"
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Sort */}
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Sort by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                                <SelectItem value="budget-desc">Budget (High)</SelectItem>
                                <SelectItem value="budget-asc">Budget (Low)</SelectItem>
                                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear all
                            </Button>
                        )}

                        {/* Search - Right Side */}
                        <div className="flex-1"></div>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                type="text"
                                placeholder="Search events..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {filteredAndSortedEvents.length > 0 ? (
                        <>
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="w-12 p-4">
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    onCheckedChange={toggleAll}
                                                    aria-label="Select all events"
                                                />
                                            </th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Event Name
                                            </th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Date
                                            </th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Location
                                            </th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Status
                                            </th>
                                            <th className="text-right p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Progress
                                            </th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">
                                                Owner
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedEvents.map((event: any) => (
                                            <tr
                                                key={event.id}
                                                onClick={() => router.push(`/events/${event.id}`)}
                                                className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                                            >
                                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(event.id)}
                                                        onCheckedChange={() => toggleItem(event.id)}
                                                        aria-label={`Select ${event.name}`}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-zinc-900 dark:text-white">
                                                        {event.name}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        ID: {generateEventId(event)}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {formatEventDateRange(event.start_date, event.end_date)}
                                                </td>
                                                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>{event.location || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge status={event.status} />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#CBFB45] rounded-full transition-all"
                                                                style={{ width: `${calculateProgress(event)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-zinc-600 dark:text-zinc-400 w-10 text-right">
                                                            {calculateProgress(event)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                                                        <img
                                                            src={getOwnerAvatar(event)}
                                                            alt="Owner"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex items-center justify-between mt-6">
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Showing {paginatedEvents.length} of {filteredAndSortedEvents.length} entries
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
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
            </div>

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
                count={selectedCount}
                itemType="event"
                onExport={handleBulkExport}
                onClear={clearSelection}
            />
        </PageTransition>
    )
}
