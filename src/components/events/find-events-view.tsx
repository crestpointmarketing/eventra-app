'use client'

import { useState } from 'react'
import { Search, Filter, Plus, MapPin, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/supabase/auth'
import { dateOnlyTime, formatDateOnly } from '@/lib/date-only'
import { findEventDuplicate, type EventDuplicateMatch } from '@/lib/events/duplicates'
import { seedDefaultEventTasks } from '@/lib/events/default-tasks'
import { EVENT_PRIORITY_PILL, type EventPriority, normalizeEventPriority } from '@/lib/events/priority'
import { normalizeEngagementType, normalizeEventType } from '@/lib/events/taxonomy'
import { toast } from 'sonner'

const DEFAULT_TOPICS = [
    'Artificial Intelligence',
    'Generative AI',
    'Machine Learning',
    'Computer Vision',
    'Robotics',
    'AI Infrastructure',
    'AI in Healthcare',
    'AI in Finance',
    'AI Systems / MLOps',
    'AI Ethics',
    'Foundation Models',
    'Autonomous Systems',
]

interface DiscoveredEvent {
    name: string
    event_type?: string
    start_date: string
    end_date: string
    location: string
    website_url: string | null
    focus_area: string
    target_audience: string
    expected_attendees: number | null
    description: string
    discovery_priority: EventPriority | string
    engagement_type?: string
    confidence?: number
    match_notes?: string | null
}

type DupeMatch = EventDuplicateMatch

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

const STOP_WORDS = new Set(['conference', 'summit', 'expo', 'forum', 'congress', 'symposium', 'workshop', 'annual', 'global', 'international', 'world', '2025', '2026', '2027'])

function coreTokens(name: string): string[] {
    return normalize(name).split(' ').filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

function tokenOverlap(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0
    const setB = new Set(b)
    const common = a.filter(t => setB.has(t)).length
    return common / Math.max(a.length, b.length)
}

function datesClose(d1: string | null, d2: string | null, days = 21): boolean {
    if (!d1 || !d2) return false
    return Math.abs(dateOnlyTime(d1) - dateOnlyTime(d2)) <= days * 86_400_000
}

function locationsOverlap(l1: string | null, l2: string | null): boolean {
    if (!l1 || !l2) return false
    const words1 = normalize(l1).split(' ').filter(w => w.length > 3)
    const n2 = normalize(l2)
    return words1.some(w => n2.includes(w))
}

// Strip generic words that appear in many event names so "AI Summit 2026" ≈ "AI Summit"
function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback
}

async function findDuplicate(event: DiscoveredEvent): Promise<DupeMatch | null> {
    const supabase = createClient()
    const sharedMatch = await findEventDuplicate(supabase, event)
    if (sharedMatch) return sharedMatch

    const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, location, source')
        .order('created_at', { ascending: false })

    if (error || !data) return null

    const incomingTokens = coreTokens(event.name)

    for (const existing of data) {
        const existingTokens = coreTokens(existing.name ?? '')
        const overlap   = tokenOverlap(incomingTokens, existingTokens)
        const dateClose = datesClose(event.start_date, existing.start_date)
        const locClose  = locationsOverlap(event.location, existing.location)

        // Different location or different dates → definitely a different event
        const isDupe = locClose && dateClose && overlap >= 0.5

        if (isDupe) {
            const reasons: string[] = []
            reasons.push(`similar name (${Math.round(overlap * 100)}% match)`)
            reasons.push('same location')
            reasons.push('overlapping dates')

            return {
                id:         existing.id,
                name:       existing.name,
                start_date: existing.start_date,
                location:   existing.location,
                source:     existing.source,
                reason:     reasons.join(', '),
                score:      overlap,
            }
        }
    }

    return null
}

const YEARS = ['2025', '2026', '2027', '2028']

const REGIONS = [
    'Global',
    'North America',
    'Europe',
    'Asia Pacific',
    'Middle East',
    'Latin America',
    'Africa',
]

export function FindEventsView() {
    const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
    const [customTopic, setCustomTopic]       = useState('')
    const [knownDetails, setKnownDetails]     = useState('')
    const [topics, setTopics]                 = useState<string[]>(DEFAULT_TOPICS)
    const [directSync, setDirectSync]         = useState(false)
    const [scanning, setScanning]             = useState(false)
    const [results, setResults]               = useState<DiscoveredEvent[] | null>(null)
    const [addedIds, setAddedIds]             = useState<Set<number>>(new Set())
    const [addingIdx, setAddingIdx]           = useState<number | null>(null)

    // Year & region constraints
    const [selectedYears,   setSelectedYears]   = useState<Set<string>>(new Set(['2026']))
    const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())

    // Duplicate confirmation state
    const [dupePending, setDupePending] = useState<{ event: DiscoveredEvent; idx: number } | null>(null)
    const [dupeMatch, setDupeMatch]     = useState<DupeMatch | null>(null)
    const [dupeChecking, setDupeChecking] = useState<number | null>(null)

    // Expanded card
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

    function toggleYear(y: string) {
        setSelectedYears(prev => {
            const n = new Set(prev)
            if (n.has(y)) n.delete(y)
            else n.add(y)
            return n
        })
    }
    function toggleRegion(r: string) {
        setSelectedRegions(prev => {
            const n = new Set(prev)
            if (n.has(r)) n.delete(r)
            else n.add(r)
            return n
        })
    }

    function toggleTopic(t: string) {
        setSelectedTopics(prev => {
            const next = new Set(prev)
            if (next.has(t)) next.delete(t)
            else next.add(t)
            return next
        })
    }

    function selectAll() { setSelectedTopics(new Set(topics)) }
    function clearAll()  { setSelectedTopics(new Set()) }

    function addCustomTopic() {
        const val = customTopic.trim()
        if (!val) return
        if (!topics.includes(val)) setTopics(prev => [...prev, val])
        setSelectedTopics(prev => new Set([...prev, val]))
        setCustomTopic('')
    }

    function toggleDirectSync() {
        if (!directSync) {
            const ok = confirm('Direct Cloud Sync will bypass Review and create events immediately. Use this only when you trust the result. Continue?')
            if (!ok) return
        }
        setDirectSync(v => !v)
    }

    async function runScan() {
        const details = knownDetails.trim()
        if (selectedTopics.size === 0 && !details) return
        setScanning(true)
        setResults(null)
        try {
            const res = await fetch('/api/discover-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topics:  Array.from(selectedTopics),
                    years:   Array.from(selectedYears),
                    regions: Array.from(selectedRegions),
                    knownDetails: details,
                    directSync,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Scan failed')
            setResults(data.events ?? [])
            setAddedIds(new Set())
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to run discovery scan'))
        } finally {
            setScanning(false)
        }
    }

    // Called when user clicks Add button — runs duplicate check first
    async function handleAdd(event: DiscoveredEvent, idx: number) {
        setDupeChecking(idx)
        try {
            const match = await findDuplicate(event)
            if (match) {
                setDupePending({ event, idx })
                setDupeMatch(match)
                return
            }
        } finally {
            setDupeChecking(null)
        }
        await commitAdd(event, idx)
    }

    // Actually write to DB (called after dupe check passes or user confirms)
    async function commitAdd(event: DiscoveredEvent, idx: number) {
        setAddingIdx(idx)
        try {
            const supabase = createClient()
            const user = await safeGetUser(supabase)
            if (!user) throw new Error('Not authenticated')
            const payload = {
                owner_id:           user.id,
                name:               event.name,
                event_type:         normalizeEventType(event.event_type),
                start_date:         event.start_date || null,
                end_date:           event.end_date   || null,
                location:           event.location   || null,
                website_url:        event.website_url || null,
                focus_area:         event.focus_area  || null,
                target_audience:    event.target_audience || null,
                expected_attendees: event.expected_attendees ?? null,
                description:        event.description || null,
                discovery_priority: normalizeEventPriority(event.discovery_priority),
                engagement_type:    normalizeEngagementType(event.engagement_type),
                source:             'ai_discovered',
                status:             'upcoming',
            }

            if (directSync) {
                const ok = confirm(`Add "${event.name}" directly to Portfolio and create starter tasks?`)
                if (!ok) return
                const { data: insertedEvent, error } = await supabase
                    .from('events')
                    .insert(payload)
                    .select('id, start_date')
                    .single()
                if (error) throw error
                if (insertedEvent?.id) {
                    await seedDefaultEventTasks(supabase, insertedEvent.id, insertedEvent.start_date)
                }
                toast.success('Event added directly with starter tasks')
            } else {
                const { error } = await supabase.from('event_discovery_queue').insert({
                    type: 'NEW',
                    status: 'PENDING',
                    event_data: {
                        ...event,
                        event_type: normalizeEventType(event.event_type),
                        discovery_priority: normalizeEventPriority(event.discovery_priority),
                        engagement_type: normalizeEngagementType(event.engagement_type),
                    },
                })
                if (error) throw error
                toast.success('Event added to review queue')
            }

            setAddedIds(prev => new Set([...prev, idx]))
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to add event'))
        } finally {
            setAddingIdx(null)
        }
    }

    function confirmDupe() {
        if (!dupePending) return
        const { event, idx } = dupePending
        setDupePending(null)
        setDupeMatch(null)
        commitAdd(event, idx)
    }

    function cancelDupe() {
        setDupePending(null)
        setDupeMatch(null)
    }

    const hasKnownDetails = knownDetails.trim().length > 0
    const canScan = (selectedTopics.size > 0 || hasKnownDetails) && !scanning

    return (
        <div className="space-y-6">
            {/* Duplicate confirmation modal */}
            {dupePending && dupeMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">Possible Duplicate Detected</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Matched on: <span className="font-medium text-zinc-700 dark:text-zinc-300">{dupeMatch.reason}</span>
                                </p>
                            </div>
                        </div>

                        {/* Side-by-side comparison */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
                                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">Incoming</p>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-snug mb-1">{dupePending.event.name}</p>
                                <p className="text-[11px] text-zinc-500">{dupePending.event.start_date ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500">{dupePending.event.location ?? '—'}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-1.5">Existing ({dupeMatch.source})</p>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-snug mb-1">{dupeMatch.name}</p>
                                <p className="text-[11px] text-zinc-500">{dupeMatch.start_date ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500">{dupeMatch.location ?? '—'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={cancelDupe}
                                className="flex-1 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDupe}
                                className="flex-1 py-2 text-sm font-semibold bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 rounded-lg transition-colors"
                            >
                                Add Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main card */}
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 max-w-3xl mx-auto">
                {/* Icon + Title */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
                        <Search className="h-10 w-10 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Discovery Engine</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                        Select focus areas for your intelligence scan. Choose between human review or direct automated sync.
                    </p>
                </div>

                {/* Direct Cloud Sync toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700/40 rounded-lg border border-zinc-200 dark:border-zinc-600 mb-6">
                    <div className="flex-1 mr-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 mb-0.5">
                            Direct Cloud Sync
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Bypass the review queue and write discovered events directly to Eventra.
                        </p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={directSync}
                        onClick={toggleDirectSync}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            directSync ? 'bg-[#CBFB45]' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            directSync ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>

                {/* Scan Constraints box */}
                <div className="border border-zinc-200 dark:border-zinc-600 rounded-lg overflow-hidden mb-6">
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-700/50 border-b border-zinc-200 dark:border-zinc-600">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                                Scan Constraints
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <button onClick={() => setTopics(DEFAULT_TOPICS)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Refresh</button>
                            <span className="text-zinc-300 dark:text-zinc-600">|</span>
                            <button onClick={selectAll} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Select All</button>
                            <span className="text-zinc-300 dark:text-zinc-600">|</span>
                            <button onClick={clearAll} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Clear</button>
                        </div>
                    </div>

                    <div className="p-4 flex flex-wrap gap-2">
                        {topics.map(topic => {
                            const selected = selectedTopics.has(topic)
                            return (
                                <span
                                    key={topic}
                                    className={`group inline-flex items-center gap-1 rounded-full text-xs font-medium border transition-all ${
                                        selected
                                            ? 'border-[#CBFB45] bg-[#CBFB45]/10 text-zinc-900 dark:text-zinc-100'
                                            : 'border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-400'
                                    }`}
                                >
                                    <button onClick={() => toggleTopic(topic)} className="pl-3 pr-1 py-1.5">
                                        {topic}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTopics(prev => prev.filter(t => t !== topic))
                                            setSelectedTopics(prev => { const n = new Set(prev); n.delete(topic); return n })
                                        }}
                                        className="pr-2 py-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Remove ${topic}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            )
                        })}
                    </div>

                    {/* Year constraint */}
                    <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-700 pt-3">
                        <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-2">Year</p>
                        <div className="flex flex-wrap gap-2">
                            {YEARS.map(y => {
                                const active = selectedYears.has(y)
                                return (
                                    <button key={y} onClick={() => toggleYear(y)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                            active
                                                ? 'border-[#CBFB45] bg-[#CBFB45]/10 text-zinc-900 dark:text-zinc-100'
                                                : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'
                                        }`}
                                    >{y}</button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Region constraint */}
                    <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-700 pt-3">
                        <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-2">
                            Region <span className="normal-case font-normal text-zinc-300">(optional — leave blank for global)</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {REGIONS.map(r => {
                                const active = selectedRegions.has(r)
                                return (
                                    <button key={r} onClick={() => toggleRegion(r)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                            active
                                                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                                : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'
                                        }`}
                                    >{r}</button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Known details */}
                    <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 pt-3">
                        <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-2">
                            Known Details <span className="normal-case font-normal text-zinc-300">(optional)</span>
                        </p>
                        <input
                            type="text"
                            value={knownDetails}
                            onChange={e => setKnownDetails(e.target.value)}
                            placeholder="e.g., AI Summit 2026 London June"
                            className="w-full text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-transparent text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#CBFB45]"
                        />
                    </div>

                    {/* Custom topic */}
                    <div className="px-4 pb-4 flex gap-2 border-t border-zinc-100 dark:border-zinc-700 pt-3">
                        <input
                            type="text"
                            value={customTopic}
                            onChange={e => setCustomTopic(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCustomTopic()}
                            placeholder="Add custom topic..."
                            className="flex-1 text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-transparent text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#CBFB45]"
                        />
                        <button
                            onClick={addCustomTopic}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <button
                    onClick={runScan}
                    disabled={!canScan}
                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        canScan
                            ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-200'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 opacity-50 cursor-not-allowed'
                    }`}
                >
                    {scanning ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                    ) : (
                        hasKnownDetails ? 'Find matching event ->' : selectedTopics.size === 0 ? 'Select topics to scan ->' : `Scan ${selectedTopics.size} topic${selectedTopics.size !== 1 ? 's' : ''} ->`
                    )}
                </button>
            </div>

            {/* Results */}
            {results !== null && (
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Scan Results</h3>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {results.length} event{results.length !== 1 ? 's' : ''} found
                        </span>
                    </div>

                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4 text-xs text-amber-800 dark:text-amber-300">
                        <span className="mt-0.5 flex-shrink-0">⚠</span>
                        <span>
                            AI suggestions are based on known recurring events and may contain inaccurate dates or details. Verify before adding.
                        </span>
                    </div>

                    {results.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-12 text-center text-zinc-400 dark:text-zinc-500">
                            No events found for selected topics
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {results.map((event, idx) => {
                                const expanded = expandedIdx === idx
                                return (
                                <div
                                    key={idx}
                                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden"
                                >
                                    {/* Clickable header row */}
                                    <div
                                        className="p-5 flex items-start gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                                        onClick={() => setExpandedIdx(expanded ? null : idx)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 flex-wrap mb-1">
                                                <h4 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug">
                                                    {event.name}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_PRIORITY_PILL[normalizeEventPriority(event.discovery_priority)]}`}>
                                                    {normalizeEventPriority(event.discovery_priority)}
                                                </span>
                                                {typeof event.confidence === 'number' && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        event.confidence >= 85
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : event.confidence >= 65
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                                                    }`}>
                                                        {event.confidence}% match
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                                                {event.start_date && (
                                                    <span className="flex items-center gap-1.5">
                                                        {formatDateOnly(event.start_date)}
                                                        {event.end_date && event.end_date !== event.start_date && (
                                                            <> - {formatDateOnly(event.end_date)}</>
                                                        )}
                                                        <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-600">est.</span>
                                                    </span>
                                                )}
                                                {event.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            {event.website_url && (
                                                <a
                                                    href={event.website_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleAdd(event, idx)}
                                                disabled={addedIds.has(idx) || addingIdx === idx || dupeChecking === idx}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                    addedIds.has(idx)
                                                        ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 cursor-default'
                                                        : 'bg-[#CBFB45] hover:bg-[#b8e33d] text-zinc-900 disabled:opacity-50'
                                                }`}
                                            >
                                                {(addingIdx === idx || dupeChecking === idx) ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : addedIds.has(idx) ? (
                                                    'Added ✓'
                                                ) : directSync ? (
                                                    'Add Directly'
                                                ) : (
                                                    'Add to Queue'
                                                )}
                                            </button>
                                            <span className="text-zinc-400 text-sm select-none">{expanded ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    {/* Expanded detail panel */}
                                    {expanded && (
                                        <div className="border-t border-zinc-100 dark:border-zinc-700 px-5 py-4 grid grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-900/40">
                                            {event.description && (
                                                <div className="col-span-2">
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Description</p>
                                                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{event.description}</p>
                                                </div>
                                            )}
                                            {event.match_notes && (
                                                <div className="col-span-2">
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Match Notes</p>
                                                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{event.match_notes}</p>
                                                </div>
                                            )}
                                            {event.focus_area && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Focus Area</p>
                                                    <p className="text-zinc-700 dark:text-zinc-300">{event.focus_area}</p>
                                                </div>
                                            )}
                                            {event.target_audience && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Target Audience</p>
                                                    <p className="text-zinc-700 dark:text-zinc-300">{event.target_audience}</p>
                                                </div>
                                            )}
                                            {event.expected_attendees && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Expected Attendees</p>
                                                    <p className="text-zinc-700 dark:text-zinc-300">{event.expected_attendees.toLocaleString()}+</p>
                                                </div>
                                            )}
                                            {event.website_url && (
                                                <div>
                                                    <p className="text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mb-1">Website</p>
                                                    <a href={event.website_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                                                        {event.website_url}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
