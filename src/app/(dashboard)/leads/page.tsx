'use client'

import { useState, useMemo } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useEvents } from '@/hooks/useEvents'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { exportLeadsToCSV } from '@/lib/export'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, ArrowUp, ArrowDown, Filter } from 'lucide-react'

type SortField = 'name' | 'email' | 'company' | 'score' | 'status' | null
type SortDirection = 'asc' | 'desc'

interface AdvancedFilters {
    scoreRange: [number, number]
    statuses: string[]
    eventId: string
    dateFrom: string
    dateTo: string
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted']

export default function LeadsPage() {
    const { data: leads, isLoading, error } = useLeads()
    const { data: events } = useEvents()
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortField, setSortField] = useState<SortField>('score')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Advanced filters state
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
        scoreRange: [0, 100],
        statuses: [],
        eventId: 'all',
        dateFrom: '',
        dateTo: ''
    })

    // Count active advanced filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (advancedFilters.scoreRange[0] > 0 || advancedFilters.scoreRange[1] < 100) count++
        if (advancedFilters.statuses.length > 0) count++
        if (advancedFilters.eventId !== 'all') count++
        if (advancedFilters.dateFrom || advancedFilters.dateTo) count++
        return count
    }, [advancedFilters])

    // Clear advanced filters
    const clearAdvancedFilters = () => {
        setAdvancedFilters({
            scoreRange: [0, 100],
            statuses: [],
            eventId: 'all',
            dateFrom: '',
            dateTo: ''
        })
    }

    // Handle column header click
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction or clear sort
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortField(null) // Clear sort
            }
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Sort icon component
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null
        return sortDirection === 'asc' ? (
            <ArrowUp className="inline h-4 w-4 ml-1" />
        ) : (
            <ArrowDown className="inline h-4 w-4 ml-1" />
        )
    }

    // Filter, search, and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        if (!leads) return []

        let result = leads

        // Apply priority filter (Hot/Warm/Cold tabs)
        result = result.filter((lead: any) => {
            if (filter === 'all') return true
            if (filter === 'hot') return lead.lead_score >= 80
            if (filter === 'warm') return lead.lead_score >= 50 && lead.lead_score < 80
            if (filter === 'cold') return lead.lead_score < 50
            return true
        })

        // Apply advanced filters

        // Score range
        if (advancedFilters.scoreRange[0] > 0 || advancedFilters.scoreRange[1] < 100) {
            result = result.filter((lead: any) => {
                const score = lead.lead_score || 0
                return score >= advancedFilters.scoreRange[0] && score <= advancedFilters.scoreRange[1]
            })
        }

        // Status filter
        if (advancedFilters.statuses.length > 0) {
            result = result.filter((lead: any) =>
                advancedFilters.statuses.includes(lead.status?.toLowerCase())
            )
        }

        // Event filter
        if (advancedFilters.eventId !== 'all') {
            result = result.filter((lead: any) =>
                lead.event_id === advancedFilters.eventId
            )
        }

        // Date range filter
        if (advancedFilters.dateFrom) {
            result = result.filter((lead: any) =>
                lead.created_at && new Date(lead.created_at) >= new Date(advancedFilters.dateFrom)
            )
        }
        if (advancedFilters.dateTo) {
            result = result.filter((lead: any) =>
                lead.created_at && new Date(lead.created_at) <= new Date(advancedFilters.dateTo)
            )
        }

        // Apply search
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase()
            result = result.filter((lead: any) =>
                lead.first_name?.toLowerCase().includes(query) ||
                lead.last_name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.company?.toLowerCase().includes(query)
            )
        }

        // Apply sort
        if (sortField) {
            result = [...result].sort((a: any, b: any) => {
                let aValue, bValue

                switch (sortField) {
                    case 'name':
                        aValue = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase()
                        bValue = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase()
                        break
                    case 'email':
                        aValue = (a.email || '').toLowerCase()
                        bValue = (b.email || '').toLowerCase()
                        break
                    case 'company':
                        aValue = (a.company || '').toLowerCase()
                        bValue = (b.company || '').toLowerCase()
                        break
                    case 'score':
                        aValue = a.lead_score || 0
                        bValue = b.lead_score || 0
                        break
                    case 'status':
                        aValue = (a.status || '').toLowerCase()
                        bValue = (b.status || '').toLowerCase()
                        break
                    default:
                        return 0
                }

                // Handle number vs string comparison
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
                }

                const comparison = String(aValue).localeCompare(String(bValue))
                return sortDirection === 'asc' ? comparison : -comparison
            })
        }

        return result
    }, [leads, filter, debouncedSearch, sortField, sortDirection, advancedFilters])

    // Count leads by priority
    const leadCounts = useMemo(() => {
        if (!leads) return { all: 0, hot: 0, warm: 0, cold: 0 }
        return {
            all: leads.length,
            hot: leads.filter((l: any) => l.lead_score >= 80).length,
            warm: leads.filter((l: any) => l.lead_score >= 50 && l.lead_score < 80).length,
            cold: leads.filter((l: any) => l.lead_score < 50).length
        }
    }, [leads])

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-5xl font-medium text-zinc-900">Leads</h1>
                    <Button variant="outline" disabled>
                        Export to CSV
                    </Button>
                </div>
                <div className="flex gap-4 mb-8">
                    <button className="text-base font-medium text-zinc-900 border-b-2 border-zinc-900 pb-2">
                        All
                    </button>
                </div>
                <TableLoadingSkeleton />
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Error loading leads: {error.message}</p>
            </div>
        )
    }

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch || filter !== 'all'

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-5xl font-medium text-zinc-900">Leads</h1>
                <Button
                    variant="outline"
                    onClick={() => exportLeadsToCSV(filteredAndSortedLeads)}
                    disabled={!leads || leads.length === 0}
                >
                    Export to CSV
                </Button>
            </div>

            {/* Priority Filter Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'all'
                            ? 'text-zinc-900 border-zinc-900'
                            : 'text-zinc-600 border-transparent hover:text-zinc-900'
                        }`}
                >
                    All ({leadCounts.all})
                </button>
                <button
                    onClick={() => setFilter('hot')}
                    className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'hot'
                            ? 'text-lime-400 border-lime-400'
                            : 'text-zinc-600 border-transparent hover:text-lime-400'
                        }`}
                >
                    🔥 Hot ({leadCounts.hot})
                </button>
                <button
                    onClick={() => setFilter('warm')}
                    className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'warm'
                            ? 'text-yellow-400 border-yellow-400'
                            : 'text-zinc-600 border-transparent hover:text-yellow-400'
                        }`}
                >
                    ☀️ Warm ({leadCounts.warm})
                </button>
                <button
                    onClick={() => setFilter('cold')}
                    className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'cold'
                            ? 'text-zinc-400 border-zinc-400'
                            : 'text-zinc-600 border-transparent hover:text-zinc-400'
                        }`}
                >
                    ❄️ Cold ({leadCounts.cold})
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        type="text"
                        placeholder="Search by name, email, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Advanced Filters */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            <Filter className="h-4 w-4 mr-2" />
                            Advanced
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96">
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-medium text-sm mb-4">Advanced Filters</h4>
                            </div>

                            {/* Score Range */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Lead Score Range</Label>
                                <div className="text-sm text-zinc-600 mb-2">
                                    {advancedFilters.scoreRange[0]} - {advancedFilters.scoreRange[1]}
                                </div>
                                <Slider
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={advancedFilters.scoreRange}
                                    onValueChange={(value) =>
                                        setAdvancedFilters({ ...advancedFilters, scoreRange: value as [number, number] })
                                    }
                                />
                            </div>

                            {/* Event Filter */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Associated Event</Label>
                                <Select
                                    value={advancedFilters.eventId}
                                    onValueChange={(value) =>
                                        setAdvancedFilters({ ...advancedFilters, eventId: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Events" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Events</SelectItem>
                                        {events?.map((event: any) => (
                                            <SelectItem key={event.id} value={event.id}>
                                                {event.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Created Date Range */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Created Date Range</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        type="date"
                                        value={advancedFilters.dateFrom}
                                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                    />
                                    <span className="text-zinc-600">to</span>
                                    <Input
                                        type="date"
                                        value={advancedFilters.dateTo}
                                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
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
                                                checked={advancedFilters.statuses.includes(status)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setAdvancedFilters({
                                                            ...advancedFilters,
                                                            statuses: [...advancedFilters.statuses, status]
                                                        })
                                                    } else {
                                                        setAdvancedFilters({
                                                            ...advancedFilters,
                                                            statuses: advancedFilters.statuses.filter(s => s !== status)
                                                        })
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`status-${status}`}
                                                className="text-sm capitalize cursor-pointer"
                                            >
                                                {status}
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
                                    onClick={clearAdvancedFilters}
                                    className="flex-1"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Results Count */}
            {hasActiveFilters && (
                <div className="mb-4 text-sm text-zinc-600">
                    Found {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? 's' : ''}
                    {(activeFilterCount > 0 || filter !== 'all') && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                                setFilter('all')
                                clearAdvancedFilters()
                            }}
                            className="ml-2 h-auto p-0 text-zinc-600 hover:text-zinc-900"
                        >
                            Clear all filters
                        </Button>
                    )}
                </div>
            )}

            {/* Leads Table */}
            {filteredAndSortedLeads.length > 0 ? (
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className="font-medium cursor-pointer hover:bg-zinc-50 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    Name <SortIcon field="name" />
                                </TableHead>
                                <TableHead
                                    className="font-medium cursor-pointer hover:bg-zinc-50 select-none"
                                    onClick={() => handleSort('email')}
                                >
                                    Email <SortIcon field="email" />
                                </TableHead>
                                <TableHead
                                    className="font-medium cursor-pointer hover:bg-zinc-50 select-none"
                                    onClick={() => handleSort('company')}
                                >
                                    Company <SortIcon field="company" />
                                </TableHead>
                                <TableHead
                                    className="font-medium cursor-pointer hover:bg-zinc-50 select-none"
                                    onClick={() => handleSort('score')}
                                >
                                    Score <SortIcon field="score" />
                                </TableHead>
                                <TableHead
                                    className="font-medium cursor-pointer hover:bg-zinc-50 select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    Status <SortIcon field="status" />
                                </TableHead>
                                <TableHead className="font-medium">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedLeads.map((lead: any) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium">
                                        {lead.first_name} {lead.last_name}
                                    </TableCell>
                                    <TableCell>{lead.email}</TableCell>
                                    <TableCell>{lead.company || '-'}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                lead.lead_score >= 80
                                                    ? 'lime'
                                                    : lead.lead_score >= 50
                                                        ? 'default'
                                                        : 'secondary'
                                            }
                                        >
                                            {lead.lead_score || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{lead.status || 'new'}</TableCell>
                                    <TableCell>
                                        <Link href={`/leads/${lead.id}`}>
                                            <Button variant="outline" size="sm">
                                                View
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="border border-zinc-200 rounded-lg p-12 text-center">
                    <p className="text-zinc-600 mb-4">
                        {hasActiveFilters ? 'No leads match your filters' : 'No leads yet'}
                    </p>
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilter('all')
                                clearAdvancedFilters()
                                setSearchQuery('')
                            }}
                        >
                            Clear Filters
                        </Button>
                    )}
                    {!hasActiveFilters && (
                        <Button>Import Leads</Button>
                    )}
                </div>
            )}
        </div>
    )
}
