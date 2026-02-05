'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLeads } from '@/hooks/useLeads'
import { useEvents } from '@/hooks/useEvents'
import { useSummarizeLead } from '@/hooks/useAI'
import { useQueryClient } from '@tanstack/react-query'
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
import Link from 'next/link'
import { exportLeadsToCSV, downloadCSVTemplate } from '@/lib/export'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, Filter, AlertCircle, RefreshCcw, Plus, ChevronLeft, ChevronRight, Upload, Download } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'
import { bulkUpdateLeadStatus, type LeadStatus } from '@/lib/api/bulk-operations'
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel'
import { AddLeadDialog } from '@/components/leads/add-lead-dialog'
import { ImportLeadsDialog } from '@/components/leads/import-leads-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types
type SortOption = 'date-asc' | 'date-desc' | 'score-asc' | 'score-desc' | 'name-asc' | 'name-desc'

interface AdvancedFilters {
    scoreRange: [number, number]
    statuses: string[]
    priorities: string[]
    eventId: string
    dateFrom: string
    dateTo: string
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted']
const PRIORITY_OPTIONS = ['high', 'medium', 'low']

export default function LeadsPage() {
    const { data: leads, isLoading, error } = useLeads()
    const { data: events } = useEvents()

    // Sort state mapped to single value for dropdown
    const [sortBy, setSortBy] = useState<SortOption>('score-desc')
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Detail Pane
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

    // Advanced filters state
    const [filters, setFilters] = useState<AdvancedFilters>({
        scoreRange: [0, 100],
        statuses: [],
        priorities: [],
        eventId: 'all',
        dateFrom: '',
        dateTo: ''
    })

    // Read eventId from URL parameters
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const eventIdParam = urlParams.get('eventId')
            if (eventIdParam) {
                setFilters(prev => ({ ...prev, eventId: eventIdParam }))
            }
        }
    }, [])

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100) count++
        if (filters.statuses.length > 0) count++
        if (filters.priorities.length > 0) count++
        if (filters.eventId !== 'all') count++
        if (filters.dateFrom || filters.dateTo) count++
        return count
    }, [filters])

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            scoreRange: [0, 100],
            statuses: [],
            priorities: [],
            eventId: 'all',
            dateFrom: '',
            dateTo: ''
        })
        setSearchQuery('')
    }

    // Filter and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        if (!leads) return []

        let result = leads

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

        // Apply filters
        result = result.filter((lead: any) => {
            const score = lead.lead_score || 0

            // Score Range
            if (score < filters.scoreRange[0] || score > filters.scoreRange[1]) return false

            // Status
            if (filters.statuses.length > 0 && !filters.statuses.includes(lead.lead_status)) return false

            // Priority
            if (filters.priorities.length > 0) {
                const priority = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'
                if (!filters.priorities.includes(priority)) return false
            }

            // Event
            if (filters.eventId !== 'all' && lead.event_id !== filters.eventId) return false

            // Date
            if (filters.dateFrom || filters.dateTo) {
                const leadDate = new Date(lead.created_at)
                if (filters.dateFrom && leadDate < new Date(filters.dateFrom)) return false
                if (filters.dateTo) {
                    const endDate = new Date(filters.dateTo)
                    endDate.setHours(23, 59, 59, 999)
                    if (leadDate > endDate) return false
                }
            }

            return true
        })

        // Sort
        result.sort((a: any, b: any) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.captured_at || b.created_at || 0).getTime() - new Date(a.captured_at || a.created_at || 0).getTime()
                case 'date-asc':
                    return new Date(a.captured_at || a.created_at || 0).getTime() - new Date(b.captured_at || b.created_at || 0).getTime()
                case 'score-desc':
                    return (b.lead_score || 0) - (a.lead_score || 0)
                case 'score-asc':
                    return (a.lead_score || 0) - (b.lead_score || 0)
                case 'name-asc':
                    return (a.first_name || '').localeCompare(b.first_name || '')
                case 'name-desc':
                    return (b.first_name || '').localeCompare(a.first_name || '')
                default:
                    return 0
            }
        })

        return result
    }, [leads, debouncedSearch, sortBy, filters])

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage)
    const paginatedLeads = filteredAndSortedLeads.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Bulk selection
    const {
        selectedIds,
        selectedItems,
        selectedCount,
        isAllSelected,
        toggleItem,
        toggleAll,
        clearSelection
    } = useBulkSelection(paginatedLeads)

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
            window.location.reload()
        } catch (error) {
            toast.error('Failed to update lead status')
        }
    }

    // AI Generation
    const { mutateAsync: summarizeLead } = useSummarizeLead()
    const queryClient = useQueryClient()
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false)

    // Handle batch AI generation
    const handleBatchAI = async () => {
        if (selectedCount === 0) return
        if (selectedCount > 10) {
            if (!confirm(`You are about to generate intelligence for ${selectedCount} leads. This may take a minute. Continue?`)) return
        }

        setIsGeneratingBatch(true)
        let successCount = 0
        let failCount = 0

        const toastId = toast.loading(`Generating intelligence for ${selectedCount} leads...`)

        try {
            // Process sequentially to avoid rate limits
            for (const item of selectedItems) {
                try {
                    await summarizeLead({ leadId: item.id })
                    successCount++
                } catch (err) {
                    console.error(`Failed for lead ${item.id}`, err)
                    failCount++
                }
                // Small delay to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            toast.dismiss(toastId)

            if (failCount > 0) {
                toast.warning(`Completed with checks: ${successCount} successful, ${failCount} failed.`)
            } else {
                toast.success(`Successfully analyzed all ${successCount} leads!`)
            }

            clearSelection()
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            // Soft refresh to ensure metadata updates show up if we display them in list later

        } catch (error) {
            toast.dismiss(toastId)
            toast.error('Batch process interrupted')
            setIsGeneratingBatch(false)
        }
        setIsGeneratingBatch(false)
    }

    // Handle bulk export
    const handleBulkExport = () => {
        try {
            exportLeadsToCSV(selectedItems)
            toast.success(`Exported ${selectedCount} lead${selectedCount > 1 ? 's' : ''} to CSV`)
            clearSelection()
        } catch (error) {
            toast.error('Failed to export leads')
        }
    }

    // Dialog state
    const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
    const [isImportLeadOpen, setIsImportLeadOpen] = useState(false)

    const hasActiveFilters = activeFilterCount > 0 || debouncedSearch

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    <TableLoadingSkeleton />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    <Card className="p-12 text-center border-red-200 bg-red-50">
                        <div className="mb-4">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 mb-2">Failed to Load Leads</h3>
                        <p className="text-zinc-600 mb-6">{error.message}</p>
                        <Button onClick={() => window.location.reload()} variant="outline">
                            <RefreshCcw className="h-4 w-4 mr-2" /> Retry
                        </Button>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-xs text-zinc-500 uppercase mb-6">
                        <span>Workspace</span>
                        <span>›</span>
                        <span className="text-zinc-900 dark:text-white font-medium">Leads</span>
                    </nav>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                                Leads
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Manage and track your sales pipeline.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => exportLeadsToCSV(filteredAndSortedLeads)}>
                                Export CSV
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add New Lead
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setIsAddLeadOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Manually
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsImportLeadOpen(true)}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import from CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadCSVTemplate()}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Template
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex gap-4 mb-6">
                        {/* Filters */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[180px] justify-start h-9">
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
                                    <div><h4 className="font-medium text-sm mb-4 text-zinc-900 dark:text-white">Advanced Filters</h4></div>

                                    {/* Score Range */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-zinc-900 dark:text-white">Lead Score Range</Label>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                            {filters.scoreRange[0]} - {filters.scoreRange[1]}
                                        </div>
                                        <Slider
                                            min={0} max={100} step={5}
                                            value={filters.scoreRange}
                                            onValueChange={(value) => setFilters({ ...filters, scoreRange: value as [number, number] })}
                                        />
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium text-zinc-900 dark:text-white">Priority</Label>
                                        <div className="space-y-2">
                                            {PRIORITY_OPTIONS.map((priority) => (
                                                <div key={priority} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`priority-${priority}`}
                                                        checked={filters.priorities.includes(priority)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setFilters({ ...filters, priorities: [...filters.priorities, priority] })
                                                            } else {
                                                                setFilters({ ...filters, priorities: filters.priorities.filter(p => p !== priority) })
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`priority-${priority}`} className="text-sm capitalize cursor-pointer text-zinc-700 dark:text-zinc-300">
                                                        {priority}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status */}
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
                                                                setFilters({ ...filters, statuses: [...filters.statuses, status] })
                                                            } else {
                                                                setFilters({ ...filters, statuses: filters.statuses.filter(s => s !== status) })
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`status-${status}`} className="text-sm capitalize cursor-pointer text-zinc-700 dark:text-zinc-300">
                                                        {status}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t dark:border-zinc-700">
                                        <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1">Clear All</Button>
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
                                <SelectItem value="date-desc">Captured (Newest)</SelectItem>
                                <SelectItem value="date-asc">Captured (Oldest)</SelectItem>
                                <SelectItem value="score-desc">Priority (High)</SelectItem>
                                <SelectItem value="score-asc">Priority (Low)</SelectItem>
                                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear all
                            </Button>
                        )}

                        {/* Search -> Right Side */}
                        <div className="flex-1"></div>
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <Input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    {filteredAndSortedLeads.length > 0 ? (
                        <div className="flex gap-6">
                            {/* List Pane */}
                            <div className={`flex-1 flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden transition-all duration-300 ${selectedLeadId ? 'hidden lg:flex' : 'flex'}`}>
                                <div className="flex-1 overflow-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                                            <tr>
                                                <th className="w-12 p-4">
                                                    <Checkbox
                                                        checked={isAllSelected}
                                                        onCheckedChange={toggleAll}
                                                        aria-label="Select all leads"
                                                    />
                                                </th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium whitespace-nowrap">Event</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium hidden md:table-cell whitespace-nowrap">Company</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium hidden md:table-cell whitespace-nowrap">Industry</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium whitespace-nowrap">Name</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium hidden lg:table-cell whitespace-nowrap">Title</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium hidden lg:table-cell whitespace-nowrap">Email</th>
                                                <th className="text-left p-4 text-[10px] uppercase text-zinc-500 font-medium whitespace-nowrap">Priority</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedLeads.map((lead: any) => (
                                                <motion.tr
                                                    key={lead.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    onClick={(e) => {
                                                        if (
                                                            (e.target as HTMLElement).closest('button') ||
                                                            (e.target as HTMLElement).closest('a') ||
                                                            (e.target as HTMLElement).closest('[role="checkbox"]')
                                                        ) return
                                                        setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id)
                                                    }}
                                                    className={`border-b border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors ${selectedLeadId === lead.id
                                                        ? 'bg-lime-50 dark:bg-lime-900/10'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                                        }`}
                                                >
                                                    <td className="p-4">
                                                        <Checkbox
                                                            checked={selectedIds.has(lead.id)}
                                                            onCheckedChange={() => toggleItem(lead.id)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-xs font-medium text-zinc-900 dark:text-white max-w-[150px] truncate" title={lead.events?.name}>
                                                        {lead.events?.name || 'Unassigned'}
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400 hidden md:table-cell max-w-[140px] truncate" title={lead.company}>
                                                        {lead.company || '-'}
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400 hidden md:table-cell max-w-[140px] truncate" title={lead.industry}>
                                                        {lead.industry || '-'}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs font-medium text-zinc-900 dark:text-white block">
                                                            {lead.first_name} {lead.last_name}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 lg:hidden">{lead.email}</span>
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-500 hidden lg:table-cell max-w-[140px] truncate" title={lead.job_title}>
                                                        {lead.job_title || '-'}
                                                    </td>
                                                    <td className="p-4 text-xs text-zinc-500 hidden lg:table-cell max-w-[180px] truncate" title={lead.email}>
                                                        {lead.email}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2 w-2 rounded-full ${lead.lead_score >= 80 ? 'bg-red-500' : lead.lead_score >= 50 ? 'bg-amber-500' : 'bg-blue-400'}`} />
                                                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                                                {lead.lead_score >= 80 ? 'High' : lead.lead_score >= 50 ? 'Medium' : 'Low'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-xs text-zinc-500 flex justify-between items-center">
                                    <span>Showing {paginatedLeads.length} of {filteredAndSortedLeads.length} leads</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline" size="sm"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center">Page {currentPage} of {totalPages}</span>
                                        <Button
                                            variant="outline" size="sm"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Pane */}
                            <AnimatePresence>
                                {selectedLeadId && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20, width: 0 }}
                                        animate={{ opacity: 1, x: 0, width: 'auto' }}
                                        exit={{ opacity: 0, x: 20, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-shrink-0 w-full lg:w-[450px] xl:w-[500px] h-full"
                                    >
                                        <LeadDetailPanel
                                            lead={leads?.find((l: any) => l.id === selectedLeadId)}
                                            onClose={() => setSelectedLeadId(null)}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center bg-white dark:bg-zinc-900">
                            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                                {hasActiveFilters ? 'No leads match your filters' : 'No leads yet'}
                            </p>
                            {hasActiveFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                            {!hasActiveFilters && (
                                <Button onClick={() => setIsAddLeadOpen(true)}>Add New Lead</Button>
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
                    onGenerateAI={handleBatchAI}
                    onClear={clearSelection}
                    statusOptions={[
                        { value: 'new', label: 'New' },
                        { value: 'contacted', label: 'Contacted' },
                        { value: 'qualified', label: 'Qualified' },
                        { value: 'converted', label: 'Converted' },
                    ]}
                />

                {/* Dialogs */}
                <AddLeadDialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} />
                <ImportLeadsDialog open={isImportLeadOpen} onOpenChange={setIsImportLeadOpen} />
            </div>
        </PageTransition>
    )
}
