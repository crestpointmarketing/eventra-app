'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/supabase/auth'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { formatDateOnly } from '@/lib/date-only'
import { findEventDuplicate, type EventDuplicateMatch } from '@/lib/events/duplicates'
import { seedDefaultEventTasks } from '@/lib/events/default-tasks'
import { EVENT_PRIORITIES, normalizeEventPriority } from '@/lib/events/priority'
import { ENGAGEMENT_TYPES, normalizeEngagementType, EVENT_TYPES, normalizeEventType } from '@/lib/events/taxonomy'

const TYPE_BADGE: Record<string, string> = {
    'NEW':       'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    'DUPLICATE': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    'UPDATE':    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

interface ReviewQueueItem {
    id: string
    type: string
    event_data?: {
        name?: string
        event_type?: string
        start_date?: string | null
        end_date?: string | null
        location?: string | null
        website_url?: string | null
        focus_area?: string | null
        target_audience?: string | null
        expected_attendees?: number | null
        description?: string | null
        discovery_priority?: string
        engagement_type?: string
    }
    created_at?: string | null
}

type QueueEventData = NonNullable<ReviewQueueItem['event_data']>

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

function buildEventPayload(eventData: QueueEventData, ownerId: string) {
    return {
        owner_id: ownerId,
        name: eventData.name ?? 'Untitled Event',
        event_type: normalizeEventType(eventData.event_type),
        start_date: eventData.start_date ?? null,
        end_date: eventData.end_date ?? null,
        location: eventData.location ?? null,
        website_url: eventData.website_url ?? null,
        focus_area: eventData.focus_area ?? null,
        target_audience: eventData.target_audience ?? null,
        expected_attendees: eventData.expected_attendees ?? null,
        description: eventData.description ?? null,
        discovery_priority: normalizeEventPriority(eventData.discovery_priority),
        engagement_type: normalizeEngagementType(eventData.engagement_type),
        source: 'ai_discovered',
        status: 'upcoming',
    }
}

export function ReviewQueueView() {
    const queryClient = useQueryClient()
    const [actionId, setActionId] = useState<string | null>(null)
    const [detailItem, setDetailItem] = useState<ReviewQueueItem | null>(null)
    const [detailDraft, setDetailDraft] = useState<QueueEventData>({})
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [duplicateApproval, setDuplicateApproval] = useState<{
        item: ReviewQueueItem
        match: EventDuplicateMatch
    } | null>(null)
    const [bulkDuplicateApproval, setBulkDuplicateApproval] = useState<{
        items: ReviewQueueItem[]
        matches: Array<{ item: ReviewQueueItem; match: EventDuplicateMatch }>
    } | null>(null)

    const { data: queue, isLoading } = useQuery<ReviewQueueItem[]>({
        queryKey: ['discovery-queue'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('event_discovery_queue')
                .select('*')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false })
            if (error) throw error
            return (data ?? []) as ReviewQueueItem[]
        },
    })

    useEffect(() => {
        setDetailDraft(detailItem?.event_data ?? {})
    }, [detailItem])

    function setDraftField<K extends keyof QueueEventData>(key: K, value: QueueEventData[K]) {
        setDetailDraft(prev => ({ ...prev, [key]: value }))
    }

    function getDetailDraftItem() {
        if (!detailItem) return null
        return { ...detailItem, event_data: detailDraft }
    }

    function requestApproveDetail() {
        const item = getDetailDraftItem()
        if (!item) return
        setDetailItem(null)
        requestApprove(item)
    }

    function rejectDetail() {
        if (!detailItem) return
        const item = detailItem
        setDetailItem(null)
        rejectItem(item)
    }

    const { mutate: approveItem } = useMutation({
        mutationFn: async (item: ReviewQueueItem) => {
            const supabase = createClient()
            const eventData = item.event_data ?? {}

            const user = await safeGetUser(supabase)
            if (!user) throw new Error('Not authenticated')

            const { data: insertedEvent, error: insertError } = await supabase
                .from('events')
                .insert(buildEventPayload(eventData, user.id))
                .select('id, start_date')
                .single()
            if (insertError) throw insertError
            if (insertedEvent?.id) {
                await seedDefaultEventTasks(supabase, insertedEvent.id, insertedEvent.start_date)
            }

            const { error: updateError } = await supabase
                .from('event_discovery_queue')
                .update({ status: 'APPROVED', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
                .eq('id', item.id)
            if (updateError) throw updateError
        },
        onMutate: (item: ReviewQueueItem) => setActionId(item.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discovery-queue'] })
            queryClient.invalidateQueries({ queryKey: ['discover-events'] })
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
            toast.success('Event approved with starter tasks')
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Failed to approve event'))
        },
        onSettled: () => setActionId(null),
    })

    async function requestApprove(item: ReviewQueueItem) {
        const supabase = createClient()
        const match = await findEventDuplicate(supabase, item.event_data ?? {})

        if (match) {
            setDuplicateApproval({ item, match })
            return
        }

        approveItem(item)
    }

    function approveDuplicateAnyway() {
        if (!duplicateApproval) return
        const item = duplicateApproval.item
        setDuplicateApproval(null)
        approveItem(item)
    }

    const { mutate: rejectItem } = useMutation({
        mutationFn: async (item: ReviewQueueItem) => {
            const supabase = createClient()
            const user = await safeGetUser(supabase)
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('event_discovery_queue')
                .update({ status: 'REJECTED', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
                .eq('id', item.id)
            if (error) throw error
        },
        onMutate: (item: ReviewQueueItem) => setActionId(item.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discovery-queue'] })
            toast.success('Event rejected')
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Failed to reject event'))
        },
        onSettled: () => setActionId(null),
    })

    const { mutate: approveItems } = useMutation({
        mutationFn: async (items: ReviewQueueItem[]) => {
            if (items.length === 0) return

            const supabase = createClient()
            const user = await safeGetUser(supabase)
            if (!user) throw new Error('Not authenticated')

            const payloads = items.map(item => buildEventPayload(item.event_data ?? {}, user.id))
            const { data: insertedEvents, error: insertError } = await supabase
                .from('events')
                .insert(payloads)
                .select('id, start_date')
            if (insertError) throw insertError
            for (const event of insertedEvents ?? []) {
                await seedDefaultEventTasks(supabase, event.id, event.start_date)
            }

            const { error: updateError } = await supabase
                .from('event_discovery_queue')
                .update({ status: 'APPROVED', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
                .in('id', items.map(item => item.id))
            if (updateError) throw updateError
        },
        onMutate: () => setActionId('bulk'),
        onSuccess: (_, items) => {
            setSelectedIds(new Set())
            queryClient.invalidateQueries({ queryKey: ['discovery-queue'] })
            queryClient.invalidateQueries({ queryKey: ['discover-events'] })
            queryClient.invalidateQueries({ queryKey: ['eventpulse-events'] })
            toast.success(`${items.length} events approved with starter tasks`)
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Failed to approve selected events'))
        },
        onSettled: () => setActionId(null),
    })

    const { mutate: rejectItems } = useMutation({
        mutationFn: async (items: ReviewQueueItem[]) => {
            if (items.length === 0) return

            const supabase = createClient()
            const user = await safeGetUser(supabase)
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('event_discovery_queue')
                .update({ status: 'REJECTED', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
                .in('id', items.map(item => item.id))
            if (error) throw error
        },
        onMutate: () => setActionId('bulk'),
        onSuccess: (_, items) => {
            setSelectedIds(new Set())
            queryClient.invalidateQueries({ queryKey: ['discovery-queue'] })
            toast.success(`${items.length} events rejected`)
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Failed to reject selected events'))
        },
        onSettled: () => setActionId(null),
    })

    const detailData = detailItem ? detailDraft : null
    const detailDate = detailData?.start_date
        ? `${formatDateOnly(detailData.start_date)}${detailData.end_date && detailData.end_date !== detailData.start_date ? ` - ${formatDateOnly(detailData.end_date)}` : ''}`
        : null
    const selectedItems = (queue ?? []).filter(item => selectedIds.has(item.id))
    const allSelected = !!queue?.length && selectedItems.length === queue.length
    const isBulkActing = actionId === 'bulk'

    function toggleSelected(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function toggleAllSelected() {
        if (!queue?.length) return
        setSelectedIds(allSelected ? new Set() : new Set(queue.map(item => item.id)))
    }

    async function requestBulkApprove() {
        if (selectedItems.length === 0) return
        const ok = confirm(`Approve ${selectedItems.length} selected events? This will create events in Portfolio and add starter tasks without opening each item.`)
        if (!ok) return

        const supabase = createClient()
        const matches: Array<{ item: ReviewQueueItem; match: EventDuplicateMatch }> = []

        for (const item of selectedItems) {
            const match = await findEventDuplicate(supabase, item.event_data ?? {})
            if (match) matches.push({ item, match })
        }

        if (matches.length > 0) {
            setBulkDuplicateApproval({ items: selectedItems, matches })
            return
        }

        approveItems(selectedItems)
    }

    function requestBulkReject() {
        if (selectedItems.length === 0) return
        const ok = confirm(`Reject ${selectedItems.length} selected events?`)
        if (!ok) return
        rejectItems(selectedItems)
    }

    function approveBulkDuplicatesAnyway() {
        if (!bulkDuplicateApproval) return
        const items = bulkDuplicateApproval.items
        setBulkDuplicateApproval(null)
        approveItems(items)
    }

    return (
        <div>
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{detailData?.name ?? 'Event Details'}</DialogTitle>
                        <DialogDescription>
                            Review the discovered event details before approving it into Eventra.
                        </DialogDescription>
                    </DialogHeader>

                    {detailData && (
                        <div className="space-y-5 text-sm">
                            <div>
                                <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Event Name</label>
                                <input
                                    value={detailData.name ?? ''}
                                    onChange={(e) => setDraftField('name', e.target.value)}
                                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        value={detailData.start_date ?? ''}
                                        onChange={(e) => setDraftField('start_date', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        value={detailData.end_date ?? ''}
                                        onChange={(e) => setDraftField('end_date', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Location</label>
                                    <input
                                        value={detailData.location ?? ''}
                                        onChange={(e) => setDraftField('location', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Event Type</label>
                                    <select
                                        value={normalizeEventType(detailData.event_type)}
                                        onChange={(e) => setDraftField('event_type', e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    >
                                        {EVENT_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Priority</label>
                                    <select
                                        value={normalizeEventPriority(detailData.discovery_priority)}
                                        onChange={(e) => setDraftField('discovery_priority', e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    >
                                        {EVENT_PRIORITIES.map(priority => (
                                            <option key={priority} value={priority}>{priority}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Engagement Type</label>
                                    <select
                                        value={normalizeEngagementType(detailData.engagement_type)}
                                        onChange={(e) => setDraftField('engagement_type', e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    >
                                        {ENGAGEMENT_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Website</label>
                                    <input
                                        value={detailData.website_url ?? ''}
                                        onChange={(e) => setDraftField('website_url', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Expected Attendees</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={detailData.expected_attendees ?? ''}
                                        onChange={(e) => setDraftField('expected_attendees', e.target.value ? Number(e.target.value) : null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Focus Area</label>
                                    <input
                                        value={detailData.focus_area ?? ''}
                                        onChange={(e) => setDraftField('focus_area', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Target Audience</label>
                                    <input
                                        value={detailData.target_audience ?? ''}
                                        onChange={(e) => setDraftField('target_audience', e.target.value || null)}
                                        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mb-1 block">Description</label>
                                <textarea
                                    value={detailData.description ?? ''}
                                    onChange={(e) => setDraftField('description', e.target.value || null)}
                                    rows={4}
                                    className="w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white"
                                />
                            </div>

                            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                Approving will create this event in Portfolio and add starter tasks. Dates are stored as local event dates.
                                {detailDate ? ` Current date range: ${detailDate}.` : ''}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={rejectDetail}
                                    disabled={actionId === detailItem?.id}
                                    className="px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 rounded-lg hover:border-zinc-400 disabled:opacity-40"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={requestApproveDetail}
                                    disabled={actionId === detailItem?.id || !detailData.name?.trim()}
                                    className="px-3 py-2 text-sm font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg disabled:opacity-40"
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!duplicateApproval} onOpenChange={(open) => !open && setDuplicateApproval(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Possible Duplicate
                        </DialogTitle>
                        <DialogDescription>
                            This queue item looks similar to an event already in Eventra.
                        </DialogDescription>
                    </DialogHeader>

                    {duplicateApproval && (
                        <div className="space-y-4 text-sm">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Matched on: <span className="font-medium text-zinc-700 dark:text-zinc-300">{duplicateApproval.match.reason}</span>
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
                                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">Queue Item</p>
                                    <p className="font-semibold text-zinc-900 dark:text-white leading-snug">{duplicateApproval.item.event_data?.name ?? 'Untitled Event'}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{duplicateApproval.item.event_data?.start_date ? formatDateOnly(duplicateApproval.item.event_data.start_date) : 'No date'}</p>
                                    <p className="text-xs text-zinc-500">{duplicateApproval.item.event_data?.location ?? 'No location'}</p>
                                </div>
                                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                                    <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-1.5">Existing</p>
                                    <p className="font-semibold text-zinc-900 dark:text-white leading-snug">{duplicateApproval.match.name}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{duplicateApproval.match.start_date ? formatDateOnly(duplicateApproval.match.start_date) : 'No date'}</p>
                                    <p className="text-xs text-zinc-500">{duplicateApproval.match.location ?? 'No location'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setDuplicateApproval(null)}
                                    className="px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 rounded-lg hover:border-zinc-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={approveDuplicateAnyway}
                                    className="px-3 py-2 text-sm font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg"
                                >
                                    Approve Anyway
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!bulkDuplicateApproval} onOpenChange={(open) => !open && setBulkDuplicateApproval(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Possible Duplicates
                        </DialogTitle>
                        <DialogDescription>
                            Some selected queue items look similar to events already in Eventra.
                        </DialogDescription>
                    </DialogHeader>

                    {bulkDuplicateApproval && (
                        <div className="space-y-4 text-sm">
                            <div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-700">
                                {bulkDuplicateApproval.matches.map(({ item, match }) => (
                                    <div key={item.id} className="p-3">
                                        <p className="font-semibold text-zinc-900 dark:text-white">{item.event_data?.name ?? 'Untitled Event'}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            Similar to {match.name} · {match.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setBulkDuplicateApproval(null)}
                                    className="px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 rounded-lg hover:border-zinc-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={approveBulkDuplicatesAnyway}
                                    className="px-3 py-2 text-sm font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg"
                                >
                                    Approve Selected Anyway
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Review
                </h3>
                {!isLoading && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {queue?.length ?? 0} pending
                    </span>
                )}
            </div>

            {selectedItems.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 shadow-sm">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {selectedItems.length} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={requestBulkReject}
                            disabled={isBulkActing}
                            className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-40"
                        >
                            Reject Selected
                        </button>
                        <button
                            onClick={requestBulkApprove}
                            disabled={isBulkActing}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg disabled:opacity-40"
                        >
                            Approve Selected
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            disabled={isBulkActing}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white disabled:opacity-40"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                            <th className="w-12 p-4">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleAllSelected}
                                    disabled={!queue?.length || isBulkActing}
                                    aria-label="Select all pending events"
                                />
                            </th>
                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Event Name</th>
                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Date</th>
                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Type</th>
                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Created At</th>
                            <th className="text-right p-4 text-xs uppercase text-zinc-500 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-700/50">
                                    <td className="p-4"><Skeleton className="h-4 w-4" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-52" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-36 ml-auto" /></td>
                                </tr>
                            ))
                        ) : !queue || queue.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-16 text-center text-zinc-400 dark:text-zinc-500">
                                    No events pending review
                                </td>
                            </tr>
                        ) : (
                            queue.map((item) => {
                                const eventName = item.event_data?.name ?? 'Untitled Event'
                                const isActing = actionId === item.id || isBulkActing
                                return (
                                    <tr
                                        key={item.id}
                                        onClick={() => setDetailItem(item)}
                                        className="border-b border-zinc-100 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors cursor-pointer"
                                    >
                                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={() => toggleSelected(item.id)}
                                                disabled={isBulkActing}
                                                aria-label={`Select ${eventName}`}
                                            />
                                        </td>

                                        {/* Event Name */}
                                        <td className="p-4">
                                            <div className="font-medium text-zinc-900 dark:text-white text-sm hover:underline">
                                                {eventName}
                                            </div>
                                            {item.event_data?.location && (
                                                <div className="text-xs text-zinc-400 mt-0.5">
                                                    {item.event_data.location}
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                            {item.event_data?.start_date
                                                ? `${formatDateOnly(item.event_data.start_date)}${item.event_data.end_date && item.event_data.end_date !== item.event_data.start_date ? ` - ${formatDateOnly(item.event_data.end_date)}` : ''}`
                                                : 'Not confirmed'}
                                        </td>

                                        {/* Type badge */}
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[item.type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                                {item.type}
                                            </span>
                                        </td>

                                        {/* Created At */}
                                        <td className="p-4 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                            {item.created_at
                                                ? new Date(item.created_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })
                                                : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => rejectItem(item)}
                                                    disabled={isActing}
                                                    className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                                                >
                                                    {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => setDetailItem(item)}
                                                    disabled={isActing}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                                                >
                                                    {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                                    Review
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
        </div>
    )
}
