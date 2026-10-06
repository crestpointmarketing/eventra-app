'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    MapPin, ExternalLink, Search, Trash2, Plus, FolderOpen, Download, X, AlertTriangle,
    Calendar, Users, ListChecks, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Globe,
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EngagementPill, EventLogo, PortfolioStatCard } from '@/components/events/portfolio-parts'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateOnly, formatMonthOnly, localDateKey } from '@/lib/date-only'
import { fetchAllRows } from '@/lib/api/pagination'
import { refreshEventData } from '@/lib/query-refresh'
import { exportEventsToCSV } from '@/lib/export'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EventPulseDetailSheet } from '@/components/events/eventpulse-detail-sheet'
import { FindEventsView } from '@/components/events/find-events-view'
import { ReviewQueueView } from '@/components/events/review-queue-view'
import { EVENT_PRIORITIES, EVENT_PRIORITY_PILL, normalizeEventPriority } from '@/lib/events/priority'
import { ENGAGEMENT_TYPES, EVENT_TYPES, normalizeEngagementType, normalizeEventType } from '@/lib/events/taxonomy'
import { findEventDuplicateGroups } from '@/lib/events/duplicates'

// Predefined sectors matching EventPulse categories
const SECTORS = [
    'GENERAL AI',
    'AI IN HEALTHCARE',
    'AI IN EDUCATION',
    'AI ETHICS / GOVERNANCE',
    'AI IN DATA / MLOPS',
    'AI IN FINANCE',
    'AI IN LIFE SCIENCES / BIO',
    'AI IN ROBOTICS',
    'AI INFRASTRUCTURE / SYSTEMS',
    'AI IN VISION / IMAGING',
    'AI IN INDUSTRY / ENTERPRISE',
    'AI IN INSURANCE',
    'AI IN SECURITY',
    'CONSUMER AI',
]

// Keyword mapping: sector to keywords to match in focus_area / name
const SECTOR_KEYWORDS: Record<string, string[]> = {
    'AI IN HEALTHCARE':           ['healthcare', 'medical', 'health', 'clinical', 'hospital', 'medicine', 'pharma', 'biomedical', 'himss', 'vive'],
    'AI IN EDUCATION':            ['education', 'learning', 'teaching', 'edtech', 'bett', 'fetc', 'iste'],
    'AI ETHICS / GOVERNANCE':     ['ethics', 'governance', 'fairness', 'accountability', 'transparency', 'policy', 'regulation', 'fat'],
    'AI IN DATA / MLOPS':         ['data', 'mlops', 'analytics', 'machine learning', 'ml', 'data engineering', 'databricks', 'mlsys'],
    'AI IN FINANCE':              ['finance', 'fintech', 'banking', 'insurance', 'financial', 'money', 'payment'],
    'AI IN LIFE SCIENCES / BIO':  ['life sciences', 'bio', 'bioinformatics', 'computational biology', 'drug', 'genomics', 'biological'],
    'AI IN ROBOTICS':             ['robotics', 'automation', 'robot', 'mechatronics', 'autonomous'],
    'AI INFRASTRUCTURE / SYSTEMS':['infrastructure', 'hpc', 'high-performance', 'computing', 'chip', 'hardware', 'cloud', 'kubernetes', 'server', 'accelerat', 'silicon', 'kubecon'],
    'AI IN VISION / IMAGING':     ['vision', 'imaging', 'image', 'visual', 'pattern recognition', 'computer vision', 'cvpr', 'eccv'],
    'CONSUMER AI':                ['consumer', 'google i/o', 'developer ecosystem', 'ces'],
    'AI IN SECURITY':             ['security', 'privacy', 'cyber'],
    'AI IN INSURANCE':            ['insurance'],
    'AI IN INDUSTRY / ENTERPRISE':['industry', 'enterprise', 'industrial', 'manufacturing', 'supply chain'],
    'GENERAL AI':                 [], // fallback
}

interface DiscoverEvent {
    id: string
    name: string
    start_date: string | null
    end_date?: string | null
    location: string | null
    website_url?: string | null
    event_type?: string | null
    status?: string | null
    focus_area?: string | null
    target_audience?: string | null
    expected_attendees?: number | null
    description?: string | null
    discovery_priority?: string | null
    engagement_type?: string | null
    source?: string | null
}

function classifyEvent(event: DiscoverEvent): string {
    const text = `${event.focus_area ?? ''} ${event.name ?? ''} ${event.target_audience ?? ''}`.toLowerCase()
    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
        if (sector === 'GENERAL AI') continue
        if (keywords.some(k => text.includes(k))) return sector
    }
    return 'GENERAL AI'
}

function getErrorMessage(error: unknown, fallback: string) {
    // Supabase errors are plain objects with a message, not always Error instances.
    const message = (error as { message?: unknown } | null)?.message
    return typeof message === 'string' && message ? message : fallback
}

type View = 'portfolio' | 'discover' | 'review' | 'insights'

const TAB_LABELS: { id: View; label: string }[] = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'discover',  label: 'Discover' },
    { id: 'review',    label: 'Review' },
    { id: 'insights',  label: 'Insights' },
]

const EVENT_STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'planned', label: 'Planned' },
    { value: 'planning', label: 'Planning' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' },
]

export default function EventPulsePage() {
    const queryClient = useQueryClient()
    const [view, setView]                   = useState<View>('portfolio')
    useEffect(() => { const requested = new URLSearchParams(window.location.search).get('view'); if (TAB_LABELS.some(tab => tab.id === requested)) setView(requested as View) }, [])
    const [search, setSearch]               = useState('')
    const [priorityFilter, setPriority]     = useState('all')
    const [engagementFilter, setEngagement] = useState('all')
    const [sectorFilter, setSector]         = useState('all')
    const [monthFilter, setMonth]           = useState('all')
    const [sourceFilter, setSourceFilter]   = useState('all')
    const [statusFilter, setStatusFilter]   = useState('all')
    const [typeFilter, setTypeFilter]       = useState('all')
    const [followUpOnly, setFollowUpOnly]   = useState(false)
    const [sort, setSort]                   = useState<{ key: 'name' | 'start_date'; dir: 1 | -1 }>({ key: 'start_date', dir: 1 })
    const [selectedEvent, setSelectedEvent] = useState<DiscoverEvent | null>(null)
    const [sheetOpen, setSheetOpen]         = useState(false)
    const [checkedIds, setCheckedIds]       = useState<Set<string>>(new Set())
    const [bulkLoading, setBulkLoading]     = useState(false)

    function switchView(next: View) {
        setView(next)
        const url = new URL(window.location.href)
        url.searchParams.set('view', next)
        window.history.replaceState(null, '', url)
    }

    async function deleteEventsByIds(ids: string[]) {
        const res = await fetch('/api/events/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            throw new Error(data.error ?? 'Failed to delete events')
        }
        return data as { success: boolean; deleted: number }
    }

    const { data: events, isLoading } = useQuery({
        queryKey: ['eventpulse-events'],
        queryFn: async () => {
            const supabase = createClient()
            return fetchAllRows<DiscoverEvent>((from, to) => supabase
                .from('events')
                .select('*')
                .is('deleted_at', null)
                .order('start_date', { ascending: true })
                .order('id')
                .range(from, to))
        },
    })

    const { data: pendingReviewCount = 0 } = useQuery({
        queryKey: ['eventpulse-review-count'],
        queryFn: async () => {
            const supabase = createClient()
            const { count, error } = await supabase
                .from('event_discovery_queue')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'PENDING')
            if (error) throw error
            return count ?? 0
        },
    })

    const { data: eventTasks = [] } = useQuery({
        queryKey: ['eventpulse-task-summary'],
        queryFn: async () => {
            const supabase = createClient()
            // More than 1000 tasks is normal (each event can get ~30 starter tasks), so page through them.
            return fetchAllRows<any>((from, to) => supabase
                .from('tasks')
                .select('id, title, status, priority, due_date, event_id')
                .not('event_id', 'is', null)
                .order('id')
                .range(from, to))
        },
    })


    const { mutate: deleteEvent } = useMutation({
        mutationFn: async (eventId: string) => {
            await deleteEventsByIds([eventId])
        },
        onSuccess: () => {
            refreshEventData(queryClient)
            toast.success('Event deleted')
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to delete event')),
    })

    const { mutate: updatePriority } = useMutation({
        mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('events').update({ discovery_priority: priority }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => refreshEventData(queryClient),
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to update event')),
    })

    const { mutate: updateEngagement } = useMutation({
        mutationFn: async ({ id, engagement }: { id: string; engagement: string }) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('events').update({ engagement_type: engagement }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => refreshEventData(queryClient),
        onError: (err: unknown) => toast.error(getErrorMessage(err, 'Failed to update event')),
    })

    async function bulkUpdateEvents(values: Partial<Pick<DiscoverEvent, 'status' | 'discovery_priority' | 'engagement_type'>>) {
        if (checkedIds.size === 0) return
        setBulkLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('events')
                .update(values)
                .in('id', Array.from(checkedIds))
            if (error) throw error
            refreshEventData(queryClient)
            toast.success(`${checkedIds.size} events updated`)
            setCheckedIds(new Set())
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bulk update failed'))
        } finally {
            setBulkLoading(false)
        }
    }

    function toggleCheck(id: string) {
        setCheckedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    function toggleAll(ids: string[]) {
        setCheckedIds(prev => {
            const allVisibleSelected = ids.length > 0 && ids.every(id => prev.has(id))
            if (allVisibleSelected) {
                const next = new Set(prev)
                ids.forEach(id => next.delete(id))
                return next
            }
            return new Set([...Array.from(prev), ...ids])
        })
    }

    async function bulkDelete() {
        if (!confirm(`Delete ${checkedIds.size} events? This cannot be undone.`)) return
        setBulkLoading(true)
        try {
            const result = await deleteEventsByIds(Array.from(checkedIds))
            refreshEventData(queryClient)
            toast.success(`${result.deleted} events deleted`)
            setCheckedIds(new Set())
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bulk delete failed'))
        }
        finally { setBulkLoading(false) }
    }

    async function exportSelected() {
        const selectedEvents = (events ?? []).filter(event => checkedIds.has(event.id))
        if (selectedEvents.length === 0) return
        try {
            await exportEventsToCSV(selectedEvents)
            toast.success(`Exported ${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}`)
        } catch {
            toast.error('Export failed')
        }
    }

    async function exportFiltered() {
        if (filtered.length === 0) return
        try {
            await exportEventsToCSV(filtered)
            toast.success(`Exported ${filtered.length} event${filtered.length > 1 ? 's' : ''}`)
        } catch {
            toast.error('Export failed')
        }
    }

    function clearFilters() {
        setSearch('')
        setPriority('all')
        setEngagement('all')
        setSector('all')
        setMonth('all')
        setSourceFilter('all')
        setStatusFilter('all')
        setTypeFilter('all')
        setFollowUpOnly(false)
    }

    const today = localDateKey()
    // Events with at least one open task past its due date.
    const followUpIds = useMemo(() => new Set(eventTasks
        .filter((task: any) => task.status !== 'done' && task.status !== 'archived' && task.due_date && task.due_date.slice(0, 10) < today)
        .map((task: any) => task.event_id as string)), [eventTasks, today])

    const months = useMemo(() => {
        if (!events) return []
        const vals = events
            .map((e) => e.start_date
                ? formatMonthOnly(e.start_date)
                : null)
            .filter(Boolean)
        return Array.from(new Set(vals)) as string[]
    }, [events])

    const statuses = useMemo(() => {
        if (!events) return []
        return Array.from(new Set(events.map(e => e.status).filter(Boolean))) as string[]
    }, [events])

    const filtered = (() => {
        if (!events) return []
        return events.filter((e) => {
            if (followUpOnly && !followUpIds.has(e.id)) return false
            if (priorityFilter !== 'all' && normalizeEventPriority(e.discovery_priority) !== priorityFilter) return false
            if (engagementFilter !== 'all' && normalizeEngagementType(e.engagement_type ?? e.discovery_priority) !== engagementFilter) return false
            if (sectorFilter !== 'all' && classifyEvent(e) !== sectorFilter) return false
            if (sourceFilter !== 'all' && (e.source ?? 'manual') !== sourceFilter) return false
            if (statusFilter !== 'all' && e.status !== statusFilter) return false
            if (typeFilter !== 'all' && normalizeEventType(e.event_type) !== typeFilter) return false
            if (monthFilter !== 'all') {
                const m = e.start_date
                    ? formatMonthOnly(e.start_date)
                    : ''
                if (m !== monthFilter) return false
            }
            if (search) {
                const q = search.toLowerCase()
                return [e.name, e.location, e.focus_area, e.description, e.target_audience]
                    .some(field => field?.toLowerCase().includes(q))
            }
            return true
        }).sort((a, b) => {
            const av = (sort.key === 'name' ? a.name : a.start_date) ?? ''
            const bv = (sort.key === 'name' ? b.name : b.start_date) ?? ''
            // Undated or unnamed events always sort last.
            if (!av || !bv) return av ? -1 : bv ? 1 : 0
            return av.localeCompare(bv) * sort.dir
        })
    })()

    function toggleSort(key: 'name' | 'start_date') {
        setSort(prev => ({ key, dir: prev.key === key ? (prev.dir === 1 ? -1 : 1) : 1 }))
    }

    function sortIcon(column: 'name' | 'start_date') {
        if (sort.key !== column) return <ArrowUpDown className="h-3.5 w-3.5" />
        return sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
    }

    const highCount = events?.filter((e) => normalizeEventPriority(e.discovery_priority) === 'High').length ?? 0
    const aiCount = events?.filter((e) => e.source === 'ai_discovered').length ?? 0
    const sponsorCount = events?.filter((e) => normalizeEngagementType(e.engagement_type ?? e.discovery_priority) === 'Sponsor').length ?? 0
    const next30 = localDateKey(new Date(Date.now() + 30 * 86_400_000))
    const upcomingCount = events?.filter((e) => e.start_date && e.start_date >= today).length ?? 0
    const next30Events = (events ?? []).filter(e => e.start_date && e.start_date >= today && e.start_date <= next30).slice(0, 5)
    const duplicateGroups = useMemo(() => findEventDuplicateGroups(events ?? []), [events])
    const duplicatePreview = duplicateGroups.slice(0, 5)
    const duplicateAlertById = useMemo(() => {
        const alerts = new Map<string, { matchId: string; matchName: string; reason: string }>()
        duplicateGroups.forEach(({ event, match }) => {
            if (!alerts.has(event.id)) {
                alerts.set(event.id, { matchId: match.id, matchName: match.name, reason: match.reason })
            }
            if (!alerts.has(match.id)) {
                alerts.set(match.id, { matchId: event.id, matchName: event.name ?? 'Untitled Event', reason: match.reason })
            }
        })
        return alerts
    }, [duplicateGroups])
    const selectedCount = checkedIds.size
    const visibleSelectedCount = filtered.filter(event => checkedIds.has(event.id)).length
    const hasActiveFilters = search || priorityFilter !== 'all' || engagementFilter !== 'all' || sectorFilter !== 'all' || monthFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || followUpOnly

    return (
        <div className="min-h-screen bg-background px-4 py-6 sm:px-8">
            <div className="max-w-[1600px] mx-auto">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-zinc-500 uppercase mb-6">
                    <span>Workspace</span>
                    <span>/</span>
                    <span>EventPulse</span>
                    <span>/</span>
                    <span className="text-zinc-900 dark:text-white font-medium">
                        {TAB_LABELS.find(tab => tab.id === view)?.label}
                    </span>
                </nav>

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">{view === 'discover' ? 'Discover Events' : 'EventPulse'}</h1>
                            {highCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { switchView('portfolio'); clearFilters(); setPriority('High') }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {highCount} High Priority
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Discover, review, and manage your event portfolio from one workspace.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {view === 'portfolio' && (
                            <button
                                onClick={exportFiltered}
                                disabled={filtered.length === 0}
                                className="workspace-secondary"
                                title="Export the filtered events as CSV"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </button>
                        )}
                        <button
                            type="button"
                            aria-pressed={view === 'discover'}
                            onClick={() => switchView('discover')}
                            className={view === 'discover' ? 'workspace-action' : 'workspace-secondary'}
                        >
                            <Search className="h-4 w-4" aria-hidden="true" />
                            Discover
                        </button>
                        <Link href="/events/new" className="workspace-action">
                            <Plus className="h-4 w-4" />
                            Add Event
                        </Link>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex flex-wrap items-center gap-y-2 border-b border-zinc-200 dark:border-zinc-700 mb-6">
                    <Link href="/dashboard" className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-300 sm:px-5">Overview</Link>
                    {TAB_LABELS.filter(tab => tab.id !== 'discover').map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => switchView(tab.id)}
                            className={`shrink-0 px-3 sm:px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                view === tab.id
                                    ? 'border-lime-400 text-zinc-900 dark:text-white'
                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {tab.label}
                            {tab.id === 'review' && pendingReviewCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{pendingReviewCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Discover view */}
                {view === 'discover' && <FindEventsView />}

                {/* Review view */}
                {view === 'review' && <ReviewQueueView />}

                {/* Insights view */}
                {view === 'insights' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Portfolio</p>
                                <p className="text-3xl font-semibold text-zinc-900 dark:text-white">{events?.length ?? 0}</p>
                                <p className="text-sm text-zinc-500 mt-1">events tracked</p>
                            </div>
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Pending Review</p>
                                <p className={`text-3xl font-semibold ${pendingReviewCount > 0 ? 'text-amber-600' : 'text-zinc-900 dark:text-white'}`}>{pendingReviewCount}</p>
                                <p className="text-sm text-zinc-500 mt-1">discoveries waiting for approval</p>
                            </div>
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">High Priority</p>
                                <p className="text-3xl font-semibold text-rose-600">{highCount}</p>
                                <p className="text-sm text-zinc-500 mt-1">high-priority opportunities</p>
                            </div>
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Potential Duplicates</p>
                                <p className={`text-3xl font-semibold ${duplicateGroups.length > 0 ? 'text-amber-600' : 'text-zinc-900 dark:text-white'}`}>{duplicateGroups.length}</p>
                                <p className="text-sm text-zinc-500 mt-1">similar event pairs detected</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                                <div className="border-b border-zinc-200 dark:border-zinc-700 px-5 py-4">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">Next 30 Days</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{next30Events.length} upcoming events need attention soon.</p>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                    {next30Events.length > 0 ? next30Events.map(event => (
                                        <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{event.name}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{event.location || 'No location'}</p>
                                            </div>
                                            <span className="shrink-0 text-xs font-medium text-zinc-500">
                                                {event.start_date ? formatDateOnly(event.start_date, { month: 'short', day: 'numeric' }) : 'No date'}
                                            </span>
                                        </Link>
                                    )) : (
                                        <div className="px-5 py-6 text-sm text-zinc-500">No events in the next 30 days.</div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Portfolio Mix</h3>
                                <div className="mt-5 space-y-4">
                                    {[
                                        { label: 'AI Discovered', value: aiCount, total: events?.length ?? 0, color: 'bg-violet-500' },
                                        { label: 'Manually Created', value: (events?.length ?? 0) - aiCount, total: events?.length ?? 0, color: 'bg-zinc-500' },
                                        { label: 'Upcoming', value: upcomingCount, total: events?.length ?? 0, color: 'bg-lime-400' },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-zinc-600 dark:text-zinc-300">{item.label}</span>
                                                <span className="font-medium text-zinc-900 dark:text-white">{item.value}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${item.color}`}
                                                    style={{ width: `${item.total > 0 ? Math.min((item.value / item.total) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                                <div className="border-b border-zinc-200 dark:border-zinc-700 px-5 py-4">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white">Potential Duplicates</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Review similar events before cleaning the portfolio.</p>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                                    {duplicatePreview.length > 0 ? duplicatePreview.map(({ event, match }) => (
                                        <div key={`${event.id}-${match.id}`} className="px-5 py-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{event.name}</p>
                                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                        Matches: {match.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{match.reason}</p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Link href={`/events/${event.id}`} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                                        Open
                                                    </Link>
                                                    <Link href={`/events/${match.id}`} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                                                        Match
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="px-5 py-6 text-sm text-zinc-400 dark:text-zinc-500">No likely duplicates detected.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Portfolio view */}
                {view === 'portfolio' && <>

                {/* Summary cards (click to filter) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <PortfolioStatCard icon={Calendar} tone="blue" label="All Events" value={events?.length ?? 0}
                        hint={`${upcomingCount} upcoming`} active={!hasActiveFilters} onClick={clearFilters} />
                    <PortfolioStatCard icon={AlertTriangle} tone="rose" label="High Priority" value={highCount}
                        hint="Priority set to High" active={priorityFilter === 'High'}
                        onClick={() => setPriority(priorityFilter === 'High' ? 'all' : 'High')} />
                    <PortfolioStatCard icon={Users} tone="green" label="Sponsors" value={sponsorCount}
                        hint="Engagement: Sponsor" active={engagementFilter === 'Sponsor'}
                        onClick={() => setEngagement(engagementFilter === 'Sponsor' ? 'all' : 'Sponsor')} />
                    <PortfolioStatCard icon={ListChecks} tone="violet" label="Follow-up Needed" value={followUpIds.size}
                        hint="Events with overdue tasks" active={followUpOnly}
                        onClick={() => setFollowUpOnly(v => !v)} />
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { label: 'All Events', value: 'all' },
                            { label: 'My Events', value: 'manual' },
                            { label: 'AI Discovered', value: 'ai_discovered' },
                        ].map(option => (
                            <button
                                key={option.value}
                                onClick={() => setSourceFilter(option.value)}
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                    sourceFilter === option.value
                                        ? 'border-lime-400 bg-lime-400 text-zinc-900'
                                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter bar */}
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Search events, locations, or keywords..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 pl-9 text-sm"
                        />
                    </div>

                    <Select value={sectorFilter} onValueChange={setSector}>
                        <SelectTrigger className="h-9 w-[8.5rem] text-sm">
                            <SelectValue placeholder="All Sectors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sectors</SelectItem>
                            {SECTORS.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriority}>
                        <SelectTrigger className="h-9 w-32 text-sm">
                            <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            {EVENT_PRIORITIES.map(priority => (
                                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={engagementFilter} onValueChange={setEngagement}>
                        <SelectTrigger className="h-9 w-36 text-sm">
                            <SelectValue placeholder="All Engagements" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Engagements</SelectItem>
                            {ENGAGEMENT_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-32 text-sm">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {statuses.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 w-[7.5rem] text-sm">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {EVENT_TYPES.map(type => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={monthFilter} onValueChange={setMonth}>
                        <SelectTrigger className="h-9 w-32 text-sm">
                            <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {months.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex h-9 items-center gap-1 px-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" />
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="space-y-3 md:hidden">
                    {isLoading ? <Skeleton className="h-40" /> : filtered.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No events match these filters.</p> : <>
                        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={filtered.every(e => checkedIds.has(e.id))} onChange={() => toggleAll(filtered.map(e => e.id))} />Select all events</label>
                        {filtered.map(event => <article key={event.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-3" aria-label={`Select ${event.name}`} checked={checkedIds.has(event.id)} onChange={() => toggleCheck(event.id)} />
                                <EventLogo name={event.name} url={event.website_url} />
                                <button className="min-w-0 text-left" onClick={() => { setSelectedEvent(event); setSheetOpen(true) }}>
                                    <span className="block font-semibold">{event.name}</span>
                                    {(event.description || event.focus_area) && <span className="block truncate text-xs text-muted-foreground">{event.description || event.focus_area}</span>}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">{event.start_date ? formatDateOnly(event.start_date) : 'Date unknown'} · {event.location || 'Location unknown'}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`rounded-full px-3 py-1 font-semibold ${EVENT_PRIORITY_PILL[normalizeEventPriority(event.discovery_priority)]}`}>{normalizeEventPriority(event.discovery_priority)}</span>
                                <EngagementPill type={normalizeEngagementType(event.engagement_type ?? event.discovery_priority)} />
                                <span className="rounded-md bg-muted px-2 py-1">{normalizeEventType(event.event_type)}</span>
                            </div>
                            <Link className="workspace-secondary w-full" href={`/events/${event.id}`}>Open event</Link>
                        </article>)}
                    </>}
                </div>
                <div className="hidden md:block bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed">
                        <colgroup>
                            <col className="w-12" />
                            <col className="w-[28%]" />
                            <col className="w-[11%]" />
                            <col className="w-[9%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[20%]" />
                            <col className="w-28" />
                        </colgroup>
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                <th className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={filtered.length > 0 && visibleSelectedCount === filtered.length}
                                        onChange={() => toggleAll(filtered.map((e) => e.id))}
                                        className="rounded border-zinc-300 accent-indigo-600 cursor-pointer"
                                    />
                                </th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium" aria-sort={sort.key === 'name' ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                                    <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 whitespace-nowrap uppercase hover:text-zinc-900 dark:hover:text-white">
                                        Event Name {sortIcon('name')}
                                    </button>
                                </th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Sector</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Priority</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Engagement</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium" aria-sort={sort.key === 'start_date' ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                                    <button type="button" onClick={() => toggleSort('start_date')} className="inline-flex items-center gap-1.5 whitespace-nowrap uppercase hover:text-zinc-900 dark:hover:text-white">
                                        Start Date {sortIcon('start_date')}
                                    </button>
                                </th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Location / Audience</th>
                                <th className="text-center p-4 text-xs uppercase text-zinc-500 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-700/50">
                                        <td className="p-4 w-10"><Skeleton className="h-4 w-4" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-52" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                                        <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                                        <td className="p-4 text-right"><Skeleton className="h-8 w-28 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center text-zinc-400 dark:text-zinc-500">
                                        No events match your filters
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((event) => {
                                    const checked = checkedIds.has(event.id)
                                    const duplicateAlert = duplicateAlertById.get(event.id)
                                    return (
                                    <tr
                                        key={event.id}
                                        className={`border-b border-zinc-100 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors cursor-pointer ${checked ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                        onClick={() => { setSelectedEvent(event); setSheetOpen(true) }}
                                    >
                                        {/* Checkbox */}
                                        <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleCheck(event.id)}
                                                className="rounded border-zinc-300 accent-indigo-600 cursor-pointer"
                                            />
                                        </td>

                                        {/* Event Name */}
                                        <td className="p-4 min-w-0">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <EventLogo name={event.name} url={event.website_url} />
                                            <div className="min-w-0 flex-1">
                                            <button
                                                type="button"
                                                className="block w-full truncate text-left font-medium text-zinc-900 dark:text-white leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                title={event.name}
                                            >
                                                {event.name}
                                            </button>
                                            <div className="flex items-center gap-2 mt-1 min-w-0">
                                                {duplicateAlert && (
                                                    <Link
                                                        href={`/events/${duplicateAlert.matchId}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                                                        title={`Possible duplicate: ${duplicateAlert.matchName}. ${duplicateAlert.reason}`}
                                                    >
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Duplicate
                                                    </Link>
                                                )}
                                                {event.source === 'ai_discovered' && (
                                                    <span className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">
                                                        AI
                                                    </span>
                                                )}
                                                {(event.description || event.focus_area) && (
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={event.description || event.focus_area || undefined}>
                                                        {event.description || event.focus_area}
                                                    </span>
                                                )}
                                            </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Sector */}
                                        <td className="p-4">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium leading-tight block max-w-[160px]">
                                                {classifyEvent(event)}
                                            </span>
                                        </td>

                                        {/* Priority inline editable */}
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                value={normalizeEventPriority(event.discovery_priority)}
                                                onValueChange={(priority) => updatePriority({ id: event.id, priority })}
                                            >
                                                <SelectTrigger
                                                    aria-label="Change priority"
                                                    className="h-auto w-auto gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden"
                                                >
                                                    <span className={`!inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${EVENT_PRIORITY_PILL[normalizeEventPriority(event.discovery_priority)]}`}>
                                                        {normalizeEventPriority(event.discovery_priority)}
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent className="min-w-32">
                                                    {EVENT_PRIORITIES.map((priority) => (
                                                        <SelectItem key={priority} value={priority}>
                                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVENT_PRIORITY_PILL[priority]}`}>
                                                                {priority}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>

                                        {/* Engagement inline editable */}
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                value={normalizeEngagementType(event.engagement_type ?? event.discovery_priority)}
                                                onValueChange={(engagement) => updateEngagement({ id: event.id, engagement })}
                                            >
                                                <SelectTrigger
                                                    aria-label="Change engagement"
                                                    className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden"
                                                >
                                                    <EngagementPill type={normalizeEngagementType(event.engagement_type ?? event.discovery_priority)} />
                                                </SelectTrigger>
                                                <SelectContent className="min-w-36">
                                                    {ENGAGEMENT_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}><EngagementPill type={type} /></SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>

                                        {/* Start Date */}
                                        <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                            {event.start_date
                                                ? formatDateOnly(event.start_date, { year: 'numeric', month: '2-digit', day: '2-digit' })
                                                : '-'}
                                        </td>

                                        {/* Location / Audience */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300 min-w-0">
                                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
                                                <span className="truncate">{event.location ?? '-'}</span>
                                            </div>
                                            {(event.expected_attendees || event.target_audience) && (
                                                <div
                                                    className="pl-5 text-xs text-zinc-400 truncate mt-0.5"
                                                    title={event.target_audience ?? undefined}
                                                >
                                                    {[
                                                        event.expected_attendees && `Size: ${event.expected_attendees.toLocaleString()}+`,
                                                        event.target_audience && `Target: ${event.target_audience}`,
                                                    ].filter(Boolean).join(' · ')}
                                                </div>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Link
                                                    href={`/events/${event.id}`}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                                                    title="Open event workspace"
                                                    aria-label={`Open ${event.name}`}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                                                        aria-label={`More actions for ${event.name}`}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/events/${event.id}`}><FolderOpen className="h-4 w-4" /> Open workspace</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => { setSelectedEvent(event); setSheetOpen(true) }}>
                                                            <Search className="h-4 w-4" /> Quick view
                                                        </DropdownMenuItem>
                                                        {event.website_url && (
                                                            <DropdownMenuItem asChild>
                                                                <a href={event.website_url} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Event website</a>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                                                            onSelect={() => { if (confirm(`Delete "${event.name}"?`)) deleteEvent(event.id) }}
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && filtered.length > 0 && (
                    <p className="text-xs text-zinc-400 mt-3 text-right">
                        Showing {filtered.length} of {events?.length ?? 0} events
                    </p>
                )}
                </>}
            </div>

            <EventPulseDetailSheet
                event={selectedEvent}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />

            <BulkActionsToolbar
                count={selectedCount}
                itemType="event"
                onExport={exportSelected}
                onUpdateStatus={(status) => bulkUpdateEvents({ status })}
                onUpdatePriority={(priority) => bulkUpdateEvents({ discovery_priority: priority })}
                onUpdateEngagement={(engagement) => bulkUpdateEvents({ engagement_type: engagement })}
                onDelete={bulkDelete}
                onClear={() => setCheckedIds(new Set())}
                statusOptions={EVENT_STATUS_OPTIONS}
                priorityOptions={EVENT_PRIORITIES.map(priority => ({ value: priority, label: priority }))}
                engagementOptions={ENGAGEMENT_TYPES.map(type => ({ value: type, label: type }))}
            />
        </div>
    )
}
