'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MapPin, ExternalLink, Search, Trash2, Plus, FolderOpen, Download, X, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateOnly, formatMonthOnly } from '@/lib/date-only'
import { exportEventsToCSV } from '@/lib/export'
import { BulkActionsToolbar } from '@/components/bulk-actions-toolbar'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EventPulseDetailSheet } from '@/components/events/eventpulse-detail-sheet'
import { FindEventsView } from '@/components/events/find-events-view'
import { ReviewQueueView } from '@/components/events/review-queue-view'
import { EVENT_PRIORITIES, EVENT_PRIORITY_BADGE, normalizeEventPriority } from '@/lib/events/priority'
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
    return error instanceof Error ? error.message : fallback
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
    const [search, setSearch]               = useState('')
    const [priorityFilter, setPriority]     = useState('all')
    const [engagementFilter, setEngagement] = useState('all')
    const [sectorFilter, setSector]         = useState('all')
    const [monthFilter, setMonth]           = useState('all')
    const [sourceFilter, setSourceFilter]   = useState('all')
    const [statusFilter, setStatusFilter]   = useState('all')
    const [typeFilter, setTypeFilter]       = useState('all')
    const [selectedEvent, setSelectedEvent] = useState<DiscoverEvent | null>(null)
    const [sheetOpen, setSheetOpen]         = useState(false)
    const [checkedIds, setCheckedIds]       = useState<Set<string>>(new Set())
    const [bulkLoading, setBulkLoading]     = useState(false)

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
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: true })
            if (error) throw error
            return (data ?? []) as DiscoverEvent[]
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
            const { data, error } = await supabase
                .from('tasks')
                .select('id, title, status, priority, due_date, event_id')
                .not('event_id', 'is', null)
            if (error) throw error
            return data ?? []
        },
    })


    const { mutate: deleteEvent } = useMutation({
        mutationFn: async (eventId: string) => {
            await deleteEventsByIds([eventId])
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
            queryClient.invalidateQueries({ queryKey: ['eventpulse-task-summary'] })
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
        },
    })

    const { mutate: updateEngagement } = useMutation({
        mutationFn: async ({ id, engagement }: { id: string; engagement: string }) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('events').update({ engagement_type: engagement }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
        },
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
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
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
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
            queryClient.invalidateQueries({ queryKey: ['eventpulse-task-summary'] })
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
    }

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

    const filtered = useMemo(() => {
        if (!events) return []
        return events.filter((e) => {
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
                return e.name?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)
            }
            return true
        })
    }, [events, priorityFilter, engagementFilter, sectorFilter, sourceFilter, statusFilter, typeFilter, monthFilter, search])

    const highCount = events?.filter((e) => normalizeEventPriority(e.discovery_priority) === 'High').length ?? 0
    const aiCount = events?.filter((e) => e.source === 'ai_discovered').length ?? 0
    const today = new Date().toISOString().slice(0, 10)
    const next30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
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
    const openTaskCount = eventTasks.filter((task: any) => task.status !== 'completed').length
    const overdueTaskCount = eventTasks.filter((task: any) => task.status !== 'completed' && task.due_date && task.due_date < today).length
    const selectedCount = checkedIds.size
    const visibleSelectedCount = filtered.filter(event => checkedIds.has(event.id)).length
    const hasActiveFilters = search || priorityFilter !== 'all' || engagementFilter !== 'all' || sectorFilter !== 'all' || monthFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all'

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="max-w-7xl mx-auto">
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
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">EventPulse</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Discover, review, and manage your event portfolio from one workspace.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium">
                            {highCount} High Priority
                        </span>
                        <Link
                            href="/events/new"
                            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                            <Plus className="h-4 w-4" />
                            Add Event
                        </Link>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b border-zinc-200 dark:border-zinc-700 mb-6">
                    {TAB_LABELS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                view === tab.id
                                    ? 'border-[#CBFB45] text-zinc-900 dark:text-white'
                                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {tab.label}
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
                                        <div className="px-5 py-8 text-sm text-zinc-500">No events in the next 30 days.</div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Portfolio Mix</h3>
                                <div className="mt-5 space-y-4">
                                    {[
                                        { label: 'AI Discovered', value: aiCount, total: events?.length ?? 0, color: 'bg-violet-500' },
                                        { label: 'Manually Created', value: (events?.length ?? 0) - aiCount, total: events?.length ?? 0, color: 'bg-zinc-500' },
                                        { label: 'Upcoming', value: upcomingCount, total: events?.length ?? 0, color: 'bg-[#CBFB45]' },
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
                                        <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500">No likely duplicates detected.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Portfolio view */}
                {view === 'portfolio' && <>

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
                                        ? 'border-[#CBFB45] bg-[#CBFB45] text-zinc-900'
                                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={exportFiltered}
                        disabled={filtered.length === 0}
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                        <Download className="h-4 w-4" />
                        Export Results
                    </button>
                </div>

                {/* Filter bar */}
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-44">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Search events..."
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
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[1180px] table-fixed">
                        <colgroup>
                            <col className="w-12" />
                            <col className="w-[25%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[11%]" />
                            <col className="w-[10%]" />
                            <col className="w-[20%]" />
                            <col className="w-32" />
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
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Event Name</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Sector</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Priority</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Engagement</th>
                                <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Start Date</th>
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
                                            <button
                                                type="button"
                                                className="block w-full truncate text-left font-medium text-zinc-900 dark:text-white leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                title={event.name}
                                            >
                                                {event.name}
                                            </button>
                                            <div className="flex items-center gap-2 mt-1">
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
                                                {event.focus_area && (
                                                    <span className="text-xs text-zinc-400 truncate max-w-[220px]">
                                                        {event.focus_area}
                                                    </span>
                                                )}
                                                {event.source === 'ai_discovered' && (
                                                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-600">
                                                        AI
                                                    </span>
                                                )}
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
                                                    className={`h-7 w-28 border-0 bg-transparent px-0 py-1 text-xs font-bold uppercase tracking-wide shadow-none focus:ring-0 ${EVENT_PRIORITY_BADGE[normalizeEventPriority(event.discovery_priority)]}`}
                                                >
                                                    <span>{normalizeEventPriority(event.discovery_priority)}</span>
                                                </SelectTrigger>
                                                <SelectContent className="min-w-32">
                                                    {EVENT_PRIORITIES.map((priority) => (
                                                        <SelectItem key={priority} value={priority}>
                                                            <span className={`text-xs font-bold uppercase tracking-wide ${EVENT_PRIORITY_BADGE[priority]}`}>
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
                                                <SelectTrigger className="h-7 w-28 border-0 bg-transparent px-0 py-1 text-xs font-semibold text-zinc-600 shadow-none focus:ring-0 dark:text-zinc-300">
                                                    <span>{normalizeEngagementType(event.engagement_type ?? event.discovery_priority)}</span>
                                                </SelectTrigger>
                                                <SelectContent className="min-w-32">
                                                    {ENGAGEMENT_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
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
                                            <div className="flex items-center gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                                                <MapPin className="h-3 w-3 flex-shrink-0 text-zinc-400" />
                                                <span className="truncate max-w-[200px]">{event.location ?? '-'}</span>
                                            </div>
                                            {event.expected_attendees && (
                                                <div className="text-xs text-zinc-400 mt-0.5">
                                                    Size: {event.expected_attendees.toLocaleString()}+
                                                </div>
                                            )}
                                            {event.target_audience && (
                                                <div className="text-xs text-zinc-400 truncate max-w-[200px]">
                                                    Target: {event.target_audience}
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
                                                    <FolderOpen className="h-4 w-4" />
                                                </Link>
                                                {event.website_url && (
                                                    <a
                                                        href={event.website_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                                                        title="Open event website"
                                                        aria-label={`Open ${event.name} website`}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Delete "${event.name}"?`)) deleteEvent(event.id)
                                                    }}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    title="Delete event"
                                                    aria-label={`Delete ${event.name}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
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
