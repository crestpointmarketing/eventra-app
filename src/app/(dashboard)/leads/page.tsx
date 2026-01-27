'use client'

import { useState, useMemo } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useEvents } from '@/hooks/useEvents'
import { Card } from '@/components/ui/card'
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
import { Search, ArrowUp, ArrowDown, Filter, AlertCircle, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'
import { bulkUpdateLeadStatus, type LeadStatus } from '@/lib/api/bulk-operations'

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

    // Filter and sort leads first
    const filteredAndSortedLeads = useMemo(() => {
        if (!leads) return []

        // Apply basic filter (priority)
        let result = filter === 'all'
            ? leads
            : leads.filter((lead: any) => {
                const score = lead.lead_score || 0
                if (filter === 'hot') return score >= 80
                if (filter === 'warm') return score >= 50 && score < 80
                if (filter === 'cold') return score < 50
                return true
            })

        // Apply search
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase()
            result = result.filter((lead: any) =>
                lead.name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.company?.toLowerCase().includes(query)
            )
        }

        // Apply advanced filters
        result = result.filter((lead: any) => {
            const score = lead.lead_score || 0
            if (score < advancedFilters.scoreRange[0] || score > advancedFilters.scoreRange[1]) {
                return false
            }

            if (advancedFilters.statuses.length > 0) {
                if (!advancedFilters.statuses.includes(lead.lead_status)) {
                    return false
                }
            }

            if (advancedFilters.eventId !== 'all') {
                if (lead.event_id !== advancedFilters.eventId) {
                    return false
                }
            }

            if (advancedFilters.dateFrom || advancedFilters.dateTo) {
                const leadDate = new Date(lead.created_at)
                if (advancedFilters.dateFrom && leadDate < new Date(advancedFilters.dateFrom)) {
                    return false
                }
                if (advancedFilters.dateTo) {
                    const endDate = new Date(advancedFilters.dateTo)
                    endDate.setHours(23, 59, 59, 999)
                    if (leadDate > endDate) {
                        return false
                    }
                }
            }

            return true
        })

        // Apply sorting
        if (sortField) {
            result.sort((a: any, b: any) => {
                let aVal = a[sortField]
                let bVal = b[sortField]

                if (sortField === 'score') {
                    aVal = a.lead_score || 0
                    bVal = b.lead_score || 0
                } else if (sortField === 'status') {
                    aVal = a.lead_status || ''
                    bVal = b.lead_status || ''
                }

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase()
                    bVal = bVal?.toLowerCase() || ''
                }

                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
                return 0
            })
        }

        return result
    }, [leads, filter, debouncedSearch, sortField, sortDirection, advancedFilters])

    // Bulk selection hook (must be after filteredAndSortedLeads)
    const {
        selectedIds,
        selectedItems,
        selectedCount,
        isAllSelected,
        isIndeterminate,
        toggleItem,
        toggleAll,
        clearSelection
    } = useBulkSelection(filteredAndSortedLeads)

    // Handle bulk status update
    const handleBulkStatusUpdate = async (newStatus: string) => {
        if (selectedCount === 0) return

        try {
            await bulkUpdateLeadStatus(
                Array.from(selectedIds),
                newStatus as LeadStatus
            )
            toast.success(`Updated ${selectedCount} lead${selectedCount > 1 ? 's' : ''} to ${newStatus}`)
            clearSelection()
            // Refresh leads data
            window.location.reload()
        } catch (error) {
            toast.error('Failed to update lead status', {
                description: 'Please try again or contact support'
            })
        }
    }

    // Handle bulk export
    const handleBulkExport = () => {
        try {
            exportLeadsToCSV(selectedItems)
            toast.success(`Exported ${selectedCount} lead${selectedCount > 1 ? 's' : ''} to CSV`)
            clearSelection()
        } catch (error) {
            toast.error('Failed to export leads', {
                description: 'Please try again or contact support'
            })
        }
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



    // Count leads by priority
    const leadCounts: { all: number; hot: number; warm: number; cold: number } = useMemo(() => {
        if (!leads) return { all: 0, hot: 0, warm: 0, cold: 0 }
        return {
            all: leads.length,
            hot: leads.filter((l: any) => l.lead_score >= 80).length,
            warm: leads.filter((l: any) => l.lead_score >= 50 && l.lead_score < 80).length,
            cold: leads.filter((l: any) => l.lead_score < 50).length
        }
    }, [leads])

    // Handle export with toast feedback
    const handleExport = () => {
        try {
            exportLeadsToCSV(filteredAndSortedLeads)
            toast.success(`Exported ${filteredAndSortedLeads.length} lead${filteredAndSortedLeads.length !== 1 ? 's' : ''} to CSV`)
        } catch (error) {
            toast.error('Failed to export leads', {
                description: 'Please try again or contact support'
            })
        }
    }

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
                <Card className="p-12 text-center border-red-200 bg-red-50">
                    <div className="mb-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">
                        Failed to Load Leads
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

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch || filter !== 'all'

    return (
        <PageTransition>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-5xl font-medium text-zinc-900 dark:text-white">Leads</h1>
                    <Button
                        variant="outline"
                        onClick={handleExport}
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
                            ? 'text-zinc-900 dark:text-white border-zinc-900 dark:border-white'
                            : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white'
                            }`}
                    >
                        All ({leadCounts.all})
                    </button>
                    <button
                        onClick={() => setFilter('hot')}
                        className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'hot'
                            ? 'text-lime-400 border-lime-400'
                            : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-lime-400'
                            }`}
                    >
                        🔥 Hot ({leadCounts.hot})
                    </button>
                    <button
                        onClick={() => setFilter('warm')}
                        className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'warm'
                            ? 'text-yellow-400 border-yellow-400'
                            : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-yellow-400'
                            }`}
                    >
                        ☀️ Warm ({leadCounts.warm})
                    </button>
                    <button
                        onClick={() => setFilter('cold')}
                        className={`text-base font-medium pb-2 border-b-2 transition-colors ${filter === 'cold'
                            ? 'text-zinc-400 border-zinc-400'
                            : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-400'
                            }`}
                    >
                        ❄️ Cold ({leadCounts.cold})
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Search by name, email, or company..."
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

                                {/* Score Range */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-zinc-900 dark:text-white">Lead Score Range</Label>
                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
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
                                    <Label className="text-sm font-medium text-zinc-900 dark:text-white">Associated Event</Label>
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
                                    <Label className="text-sm font-medium text-zinc-900 dark:text-white">Created Date Range</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            type="date"
                                            value={advancedFilters.dateFrom}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                            className="dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
                                        />
                                        <span className="text-zinc-600 dark:text-zinc-400">to</span>
                                        <Input
                                            type="date"
                                            value={advancedFilters.dateTo}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
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
                                                    className="text-sm capitalize cursor-pointer text-zinc-700 dark:text-zinc-300"
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
                    <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
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
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleAll}
                                            aria-label="Select all leads"
                                        />
                                    </TableHead>
                                    <TableHead
                                        className="font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 select-none text-zinc-700 dark:text-white"
                                        onClick={() => handleSort('name')}
                                    >
                                        Name <SortIcon field="name" />
                                    </TableHead>
                                    <TableHead
                                        className="font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 select-none text-zinc-700 dark:text-white"
                                        onClick={() => handleSort('email')}
                                    >
                                        Email <SortIcon field="email" />
                                    </TableHead>
                                    <TableHead
                                        className="font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 select-none text-zinc-700 dark:text-white"
                                        onClick={() => handleSort('company')}
                                    >
                                        Company <SortIcon field="company" />
                                    </TableHead>
                                    <TableHead
                                        className="font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 select-none text-zinc-700 dark:text-white"
                                        onClick={() => handleSort('score')}
                                    >
                                        Score <SortIcon field="score" />
                                    </TableHead>
                                    <TableHead
                                        className="font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 select-none text-zinc-700 dark:text-white"
                                        onClick={() => handleSort('status')}
                                    >
                                        Status <SortIcon field="status" />
                                    </TableHead>
                                    <TableHead className="font-medium text-zinc-700 dark:text-white">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedLeads.map((lead: any, index: number) => (
                                    <motion.tr
                                        key={lead.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.03 }}
                                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                                        className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(lead.id)}
                                                onCheckedChange={() => toggleItem(lead.id)}
                                                aria-label={`Select ${lead.first_name} ${lead.last_name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-zinc-900 dark:text-white">
                                            {lead.first_name} {lead.last_name}
                                        </TableCell>
                                        <TableCell className="text-zinc-700 dark:text-white">{lead.email}</TableCell>
                                        <TableCell className="text-zinc-700 dark:text-white">{lead.company || '-'}</TableCell>
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
                                        <TableCell className="capitalize text-zinc-700 dark:text-white">{lead.status || 'new'}</TableCell>
                                        <TableCell>
                                            <Link href={`/leads/${lead.id}`}>
                                                <Button variant="outline" size="sm">
                                                    View
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center bg-white dark:bg-zinc-900">
                        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
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

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
                count={selectedCount}
                itemType="lead"
                onExport={handleBulkExport}
                onUpdateStatus={handleBulkStatusUpdate}
                onClear={clearSelection}
                statusOptions={[
                    { value: 'new', label: 'New' },
                    { value: 'contacted', label: 'Contacted' },
                    { value: 'qualified', label: 'Qualified' },
                    { value: 'converted', label: 'Converted' },
                ]}
            />
        </PageTransition>
    )
}
