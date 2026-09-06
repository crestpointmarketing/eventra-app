'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Search,
    Loader2,
    ExternalLink,
    X,
    CalendarDays,
    MapPin,
    Bookmark,
    Sparkles,
    Target,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { buildDefaultEventTasks } from '@/lib/events/default-tasks'
import { SearchFilters } from '@/components/events/search-filters'
import {
    SEARCH_FIELDS,
    searchCriteriaSchema,
    type SearchCriteria,
    type SearchJob,
    type SearchResult,
} from '@/lib/events/search-contract'
import { normalized } from '@/lib/events/search-evaluation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const control =
    'w-full min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm'
const button =
    'rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50'
const initial = () => searchCriteriaSchema.parse({ mode: 'discover' })
const taskCount = buildDefaultEventTasks('').length
interface PortfolioItem {
    id: string
    name: string
    start_date: string | null
    website_url: string | null
    metadata: { search?: { editionKey?: string; seriesKey?: string } } | null
}
async function request(path: string, body?: unknown) {
    const response = await fetch(
        `/api/discover-events${path}`,
        body
            ? {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
              }
            : { cache: 'no-store' },
    )
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Request failed')
    return data
}
function sameEdition(result: SearchResult, event: PortfolioItem) {
    if (
        result.editionKey &&
        result.editionKey === event.metadata?.search?.editionKey
    )
        return true
    // Legacy records without organizer metadata are possible matches, never silently merged.
    return (
        !!event.start_date &&
        result.resolved.start_date.value === event.start_date &&
        normalized(result.name) === normalized(event.name)
    )
}
export function FindEventsView() {
    const [criteria, setCriteria] = useState<SearchCriteria>(initial)
    const [busy, setBusy] = useState(false)
    const [sort, setSort] = useState('matches')
    const [jobs, setJobs] = useState<SearchJob[]>([])
    const [jobId, setJobId] = useState<string | null>(null)
    const [selectedCategory, setCategory] = useState<
        'strict' | 'verification' | 'excluded' | null
    >(null)
    const [details, setDetails] = useState<SearchResult | null>(null)
    const [selected, setSelected] = useState<string[]>([])
    const [importing, setImporting] = useState(false)
    const [confirmImport, setConfirmImport] = useState(false)
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
    const [imported, setImported] = useState<string[]>([])
    const [loadError, setLoadError] = useState('')
    const job = jobs.find((j) => j.id === jobId) ?? jobs[0]
    const category =
        selectedCategory ??
        (job?.counts.strict
            ? 'strict'
            : job?.counts.verification
              ? 'verification'
              : 'strict')
    const running = jobs.some(
        (j) => j.status === 'queued' || j.status === 'running',
    )
    const refresh = useCallback(async () => {
        try {
            const data = await request('')
            setJobs(data.jobs)
            setLoadError('')
        } catch (error) {
            setLoadError(
                error instanceof Error
                    ? error.message
                    : 'Search history unavailable',
            )
        }
    }, [])
    const refreshPortfolio = useCallback(async () => {
        const { data, error } = await createClient()
            .from('events')
            .select('id,name,start_date,website_url,metadata')
            .is('deleted_at', null)
        if (error) throw new Error('Portfolio duplicate check unavailable')
        setPortfolio((data ?? []) as PortfolioItem[])
    }, [])
    useEffect(() => {
        void refresh()
        void refreshPortfolio().catch(() => {})
        const saved = localStorage.getItem('eventra-search-criteria-v1')
        if (saved) {
            try {
                const parsed = searchCriteriaSchema.safeParse(JSON.parse(saved))
                if (parsed.success) setCriteria(parsed.data)
            } catch {}
        }
    }, [refresh, refreshPortfolio])
    useEffect(() => {
        if (!running) return
        const timer = setInterval(() => void refresh(), 3000)
        return () => clearInterval(timer)
    }, [running, refresh])
    function set<K extends keyof SearchCriteria>(
        key: K,
        value: SearchCriteria[K],
    ) {
        setCriteria((c) => ({ ...c, [key]: value }))
    }
    async function search(next = criteria) {
        const valid = searchCriteriaSchema.safeParse(next)
        if (!valid.success) {
            toast.error(valid.error.issues[0]?.message || 'Review your filters')
            return
        }
        setBusy(true)
        try {
            const data = await request('', valid.data)
            setJobId(data.id)
            setSelected([])
            setImported([])
            setCategory(null)
            await refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Search failed',
            )
        } finally {
            setBusy(false)
        }
    }
    async function parse() {
        setBusy(true)
        try {
            const data = await request('/parse', {
                text: criteria.query,
                mode: criteria.mode,
            })
            setCriteria(data.criteria)
            toast.success('Review the parsed conditions, then start search')
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Parsing failed',
            )
        } finally {
            setBusy(false)
        }
    }
    async function prepareImport(ids: string[]) {
        try {
            await refreshPortfolio()
            setSelected(ids)
            setConfirmImport(true)
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Duplicate check failed',
            )
        }
    }
    async function importResults(
        destination: 'queue' | 'portfolio',
        createTasks: boolean,
    ) {
        if (!job) return
        setImporting(true)
        try {
            for (const id of selected) {
                await request('/import', {
                    jobId: job.id,
                    resultId: id,
                    destination,
                    createTasks,
                })
                setImported((prev) => [...prev, id])
            }
            setConfirmImport(false)
            setSelected([])
            await refreshPortfolio()
            toast.success(
                destination === 'queue'
                    ? 'Added to Review Queue. No tasks created.'
                    : 'Portfolio import completed',
            )
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Import failed; completed items are safe to retry',
            )
        } finally {
            setImporting(false)
        }
    }
    const conditionChips: { id: string; label: string; remove: () => void }[] =
        []
    for (const key of [
        'industries',
        'technologies',
        'eventTypes',
        'includeAny',
        'includeAll',
        'exclude',
    ] as const) {
        for (const value of criteria[key])
            conditionChips.push({
                id: `${key}:${value}`,
                label: `${key === 'exclude' ? 'Exclude: ' : key === 'includeAll' ? 'Required: ' : key === 'includeAny' ? 'Any: ' : ''}${value}`,
                remove: () =>
                    set(
                        key,
                        criteria[key].filter((v) => v !== value),
                    ),
            })
    }
    for (const key of [
        'country',
        'state',
        'city',
        'organizer',
        'audience',
        'pageUrl',
    ] as const) {
        if (criteria[key])
            conditionChips.push({
                id: key,
                label: `${key === 'pageUrl' ? 'Source: ' : key === 'organizer' ? 'Organizer: ' : key === 'audience' ? 'Audience: ' : ''}${criteria[key]}`,
                remove: () => set(key, ''),
            })
    }
    if (criteria.startDate || criteria.endDate)
        conditionChips.push({
            id: 'dates',
            label: `${criteria.startDate || 'Any date'} – ${criteria.endDate || 'Onward'}`,
            remove: () =>
                setCriteria((c) => ({ ...c, startDate: null, endDate: null })),
        })
    if (criteria.attendance !== 'any')
        conditionChips.push({
            id: 'attendance',
            label:
                criteria.attendance === 'in_person'
                    ? 'In person'
                    : criteria.attendance === 'online'
                      ? 'Online'
                      : 'Hybrid',
            remove: () => set('attendance', 'any'),
        })
    if (criteria.includePast)
        conditionChips.push({
            id: 'past',
            label: 'Include past editions',
            remove: () => set('includePast', false),
        })
    if (criteria.topicOperator === 'AND')
        conditionChips.push({
            id: 'operator',
            label: 'Match all topics',
            remove: () => set('topicOperator', 'OR'),
        })
    const visibleResults = (
        job?.results.filter((r) => r.category === category) ?? []
    )
        .slice()
        .sort((a, b) => {
            if (sort === 'date')
                return (a.resolved.start_date.value || '9999').localeCompare(
                    b.resolved.start_date.value || '9999',
                )
            if (sort === 'name') return a.name.localeCompare(b.name)
            return (
                b.criteria.filter((c) => c.status === 'matched').length -
                a.criteria.filter((c) => c.status === 'matched').length
            )
        })
    const stages = [
        'Building search queries',
        'Finding candidate events',
        'Checking official sources',
        'Extracting event details',
        'Applying required filters',
        'Removing duplicates',
        'Results ready',
    ]
    const stageIndex = job ? stages.indexOf(job.stage) : -1
    const chosen = job?.results.filter((r) => selected.includes(r.id)) ?? []
    return (
        <div className="space-y-6">
            <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <SearchFilters
                    criteria={criteria}
                    onChange={setCriteria}
                    onSearch={() => search()}
                    disabled={busy || running}
                />
                <main className="min-w-0 space-y-5">
                    <section
                        aria-label="Search query"
                        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Search mode"
                        >
                            {(['discover', 'specific'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    aria-pressed={criteria.mode === mode}
                                    onClick={() => set('mode', mode)}
                                    className={`${button} inline-flex items-center gap-2 ${criteria.mode === mode ? 'border-lime-300 bg-lime-50 dark:bg-lime-950' : ''}`}
                                >
                                    {mode === 'discover' ? (
                                        <Search size={17} />
                                    ) : (
                                        <Target size={17} />
                                    )}
                                    {mode === 'discover'
                                        ? 'Discover events'
                                        : 'Find a specific event'}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-200 px-3 dark:border-zinc-700">
                                <Search
                                    size={17}
                                    className="shrink-0 text-zinc-500"
                                />
                                <input
                                    aria-label={
                                        criteria.mode === 'specific'
                                            ? 'Event name / exact phrase'
                                            : 'Search description'
                                    }
                                    value={criteria.query}
                                    onChange={(e) =>
                                        set('query', e.target.value)
                                    }
                                    placeholder={
                                        criteria.mode === 'specific'
                                            ? 'Enter an event name, organizer, or edition'
                                            : 'e.g. Healthcare AI conferences in Canada over the next 6 months'
                                    }
                                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                                />
                                {criteria.query && (
                                    <button
                                        aria-label="Clear search text"
                                        onClick={() => set('query', '')}
                                        className="p-1 text-zinc-500"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </label>
                            <button
                                disabled={busy || running}
                                onClick={() => search()}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                            >
                                {busy && (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                )}
                                Search events
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {conditionChips.map((chip) => (
                                <button
                                    key={chip.id}
                                    onClick={chip.remove}
                                    aria-label={`Remove condition: ${chip.label}`}
                                    className="inline-flex max-w-full items-center gap-2 rounded-md border border-lime-200 bg-lime-50 px-2.5 py-1.5 text-xs dark:border-lime-900 dark:bg-lime-950"
                                >
                                    <span className="break-words">
                                        {chip.label}
                                    </span>
                                    <X size={12} className="shrink-0" />
                                </button>
                            ))}
                            {!conditionChips.length && (
                                <p className="text-xs text-zinc-500">
                                    Upcoming events · Any location · All topics
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <button
                                disabled={busy || !criteria.query.trim()}
                                onClick={parse}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 disabled:opacity-50"
                            >
                                <Sparkles size={14} />
                                Extract filters from text
                            </button>
                            <span className="text-xs text-zinc-500">
                                Review extracted filters before searching.
                            </span>
                            <button
                                className="inline-flex items-center gap-1.5 text-xs font-medium"
                                onClick={() => {
                                    localStorage.setItem(
                                        'eventra-search-criteria-v1',
                                        JSON.stringify(criteria),
                                    )
                                    toast.success(
                                        'Search conditions saved on this device',
                                    )
                                }}
                            >
                                <Bookmark size={14} />
                                Save conditions
                            </button>
                        </div>
                    </section>

                    {loadError && (
                        <div
                            role="alert"
                            className="rounded-lg border p-4 text-sm"
                        >
                            {loadError}
                            <button className={button} onClick={refresh}>
                                Retry
                            </button>
                        </div>
                    )}
                    {!!jobs.length && (
                        <label className="flex items-center gap-3 text-sm">
                            Search history
                            <select
                                className={control}
                                value={job?.id ?? ''}
                                onChange={(e) => {
                                    setJobId(e.target.value)
                                    setCategory(null)
                                    setSelected([])
                                    setImported([])
                                }}
                            >
                                {jobs.map((j) => (
                                    <option key={j.id} value={j.id}>
                                        {new Date(
                                            j.created_at,
                                        ).toLocaleString()}{' '}
                                        ·{' '}
                                        {j.criteria.query ||
                                            j.criteria.industries.join(', ') ||
                                            'Event search'}{' '}
                                        · {j.status}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {job && (
                        <section
                            className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-3"
                            aria-live="polite"
                        >
                            <div className="flex flex-wrap justify-between gap-3">
                                <h2 className="font-medium">
                                    {job.status === 'warnings'
                                        ? 'Search completed with warnings'
                                        : job.status === 'completed'
                                          ? 'Search completed'
                                          : job.status === 'cancelled'
                                            ? 'Search cancelled'
                                            : job.stage}
                                </h2>
                                <button
                                    className={button}
                                    onClick={() => setCriteria(job.criteria)}
                                >
                                    Restore these conditions
                                </button>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {job.counts.candidates} candidates found ·{' '}
                                {job.counts.checked} source checks ·{' '}
                                {job.counts.strict} strict matches ·{' '}
                                {job.counts.verification} need verification ·{' '}
                                {job.counts.excluded} excluded
                            </p>
                            {['failed', 'warnings'].includes(job.status) && (
                                <button
                                    className={button}
                                    disabled={running}
                                    onClick={async () => {
                                        try {
                                            await request('/retry', {
                                                id: job.id,
                                            })
                                            await refresh()
                                        } catch (error) {
                                            toast.error(
                                                error instanceof Error
                                                    ? error.message
                                                    : 'Retry failed',
                                            )
                                        }
                                    }}
                                >
                                    Retry sources needing verification
                                </button>
                            )}
                            <ol
                                aria-label="Search stages"
                                className="flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800"
                            >
                                {stages.map((stage, index) => (
                                    <li
                                        key={stage}
                                        aria-current={
                                            job?.stage === stage
                                                ? 'step'
                                                : undefined
                                        }
                                        className={`inline-flex items-center gap-1.5 ${index === stageIndex ? 'font-medium text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                                    >
                                        {index < stageIndex ||
                                        (stage === 'Results ready' &&
                                            ['completed', 'warnings'].includes(
                                                job.status,
                                            )) ? (
                                            <CheckCircle2
                                                size={13}
                                                className="text-green-600"
                                            />
                                        ) : index === stageIndex &&
                                          job.status === 'running' ? (
                                            <Loader2
                                                size={13}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <span className="inline-flex size-4 items-center justify-center rounded-full border text-[10px]">
                                                {index + 1}
                                            </span>
                                        )}
                                        {
                                            [
                                                'Queries',
                                                'Candidates',
                                                'Source checks',
                                                'Details',
                                                'Filters',
                                                'Duplicates',
                                                'Ready',
                                            ][index]
                                        }
                                    </li>
                                ))}
                            </ol>
                            {job.error && (
                                <p
                                    role="alert"
                                    className="text-sm text-red-600"
                                >
                                    {job.error}
                                </p>
                            )}
                            {job.warnings.map((w) => (
                                <p key={w} className="text-sm text-amber-700">
                                    {w}
                                </p>
                            ))}
                            {['queued', 'running'].includes(job.status) && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        className={button}
                                        onClick={async () => {
                                            try {
                                                await request('/cancel', {
                                                    id: job.id,
                                                })
                                                await refresh()
                                            } catch {
                                                toast.error(
                                                    'Cancellation failed',
                                                )
                                            }
                                        }}
                                    >
                                        Cancel search
                                    </button>
                                    <Link className={button} href="/dashboard">
                                        Continue in background
                                    </Link>
                                    <p className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                                        Progress is saved on the server. You can
                                        leave or refresh this page.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}
                    {!job && (
                        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
                            <Search className="mx-auto text-zinc-500 dark:text-zinc-400" />
                            <h2 className="text-lg font-medium">
                                Make the search specific to your needs
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Choose dates, location and topics. Results
                                explain both matching conditions and supporting
                                evidence.
                            </p>
                        </div>
                    )}
                    {job && (
                        <>
                            <div
                                className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-700"
                                role="group"
                                aria-label="Result category"
                            >
                                {(
                                    [
                                        {
                                            key: 'strict',
                                            label: 'Strict matches',
                                            icon: CheckCircle2,
                                        },
                                        {
                                            key: 'verification',
                                            label: 'Needs Verification',
                                            icon: AlertTriangle,
                                        },
                                        {
                                            key: 'excluded',
                                            label: 'Excluded',
                                            icon: XCircle,
                                        },
                                    ] as const
                                ).map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${category === key ? 'border-lime-400 font-semibold text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500'}`}
                                        aria-pressed={category === key}
                                        onClick={() => setCategory(key)}
                                    >
                                        <Icon size={16} />
                                        {label} (
                                        {
                                            job.results.filter(
                                                (r) => r.category === key,
                                            ).length
                                        }
                                        )
                                    </button>
                                ))}
                            </div>
                            {!!selected.length && (
                                <button
                                    className={button}
                                    onClick={() => prepareImport(selected)}
                                >
                                    Review {selected.length} selected events for
                                    import
                                </button>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span>{visibleResults.length} events</span>
                                <label className="flex items-center gap-2 text-zinc-500">
                                    Sort by{' '}
                                    <select
                                        className={`${control} w-auto`}
                                        value={sort}
                                        onChange={(e) =>
                                            setSort(e.target.value)
                                        }
                                    >
                                        <option value="matches">
                                            Criteria matched
                                        </option>
                                        <option value="date">Start date</option>
                                        <option value="name">Event name</option>
                                    </select>
                                </label>
                            </div>
                            {visibleResults.map((result) => {
                                const f = result.resolved
                                const existing = portfolio.find((p) =>
                                    sameEdition(result, p),
                                )
                                const otherEdition =
                                    !existing && result.seriesKey
                                        ? portfolio.find(
                                              (p) =>
                                                  p.metadata?.search
                                                      ?.seriesKey ===
                                                  result.seriesKey,
                                          )
                                        : null
                                return (
                                    <article
                                        key={result.id}
                                        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                                    >
                                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                                            <div className="flex min-w-0 items-start gap-3">
                                                {result.category !==
                                                    'excluded' && (
                                                    <input
                                                        aria-label={`Select ${result.name}`}
                                                        className="mt-1 size-4 shrink-0 accent-lime-600"
                                                        type="checkbox"
                                                        disabled={imported.includes(
                                                            result.id,
                                                        )}
                                                        checked={selected.includes(
                                                            result.id,
                                                        )}
                                                        onChange={(e) =>
                                                            setSelected(
                                                                (ids) =>
                                                                    e.target
                                                                        .checked
                                                                        ? [
                                                                              ...ids,
                                                                              result.id,
                                                                          ]
                                                                        : ids.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
                                                                                  id !==
                                                                                  result.id,
                                                                          ),
                                                            )
                                                        }
                                                    />
                                                )}
                                                <div className="hidden w-16 shrink-0 rounded-md bg-blue-50 px-2 py-2 text-center dark:bg-blue-950 sm:block">
                                                    <span className="block text-xs font-medium text-blue-600">
                                                        {f.start_date.value
                                                            ? new Date(
                                                                  f.start_date
                                                                      .value +
                                                                      'T12:00:00Z',
                                                              ).toLocaleDateString(
                                                                  'en-US',
                                                                  {
                                                                      month: 'short',
                                                                      timeZone:
                                                                          'UTC',
                                                                  },
                                                              )
                                                            : 'Date'}
                                                    </span>
                                                    <span className="block text-lg font-semibold">
                                                        {f.start_date.value
                                                            ? f.start_date.value.slice(
                                                                  8,
                                                                  10,
                                                              )
                                                            : '—'}
                                                    </span>
                                                    <span className="block text-xs text-zinc-500">
                                                        {f.start_date.value
                                                            ? f.start_date.value.slice(
                                                                  0,
                                                                  4,
                                                              )
                                                            : 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 space-y-1.5">
                                                    <h3 className="break-words text-base font-semibold">
                                                        {f.name.value ||
                                                            result.name}
                                                    </h3>
                                                    <p className="break-words text-xs text-zinc-500">
                                                        {f.organizer.value ||
                                                            'Organizer unknown'}
                                                    </p>
                                                    <p className="flex items-start gap-1.5 text-xs text-zinc-500">
                                                        <CalendarDays
                                                            size={13}
                                                            className="shrink-0"
                                                        />
                                                        {f.start_date.value ||
                                                            'Date unknown'}{' '}
                                                        —{' '}
                                                        {f.end_date.value ||
                                                            'Date unknown'}
                                                    </p>
                                                    <p className="flex items-start gap-1.5 text-xs text-zinc-500">
                                                        <MapPin
                                                            size={13}
                                                            className="shrink-0"
                                                        />
                                                        {[
                                                            f.city.value,
                                                            f.state.value,
                                                            f.country.value,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') ||
                                                            'Location unknown'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5 text-xs">
                                                        <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                                                            {f.event_type
                                                                .value ||
                                                                'Type unknown'}
                                                        </span>
                                                        <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                                                            {f.attendance
                                                                .value ===
                                                            'in_person'
                                                                ? 'In person'
                                                                : f.attendance
                                                                      .value ||
                                                                  'Attendance unknown'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="min-w-0 space-y-2 text-xs xl:border-l xl:border-zinc-100 xl:pl-4 dark:xl:border-zinc-800">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${result.evidenceStatus === 'Verified' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}
                                                >
                                                    {result.evidenceStatus ===
                                                    'Verified' ? (
                                                        <CheckCircle2
                                                            size={13}
                                                        />
                                                    ) : (
                                                        <AlertTriangle
                                                            size={13}
                                                        />
                                                    )}
                                                    {result.evidenceStatus ===
                                                    'Partial'
                                                        ? 'Partial evidence'
                                                        : result.evidenceStatus}
                                                </span>
                                                <p>
                                                    Criteria match:{' '}
                                                    <strong>
                                                        {
                                                            result.criteria.filter(
                                                                (c) =>
                                                                    c.status ===
                                                                    'matched',
                                                            ).length
                                                        }
                                                        /
                                                        {result.criteria.length}
                                                    </strong>{' '}
                                                    required checks ·{' '}
                                                    {result.unknownCount}{' '}
                                                    unconfirmed fields
                                                </p>
                                                <p className="text-zinc-500">
                                                    {result.reasons
                                                        .slice(0, 2)
                                                        .join(' · ') ||
                                                        'Required conditions match the available evidence.'}
                                                </p>
                                                {result.website_url &&
                                                    /^https?:\/\//i.test(
                                                        result.website_url,
                                                    ) && (
                                                        <a
                                                            href={
                                                                result.website_url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex max-w-full items-center gap-1 text-blue-600"
                                                        >
                                                            <span className="truncate">
                                                                {
                                                                    result.website_url
                                                                }
                                                            </span>
                                                            <ExternalLink
                                                                size={13}
                                                                className="shrink-0"
                                                            />
                                                        </a>
                                                    )}
                                                <p className="text-zinc-500">
                                                    Last source check:{' '}
                                                    {result.sources[0]
                                                        ?.checkedAt
                                                        ? new Date(
                                                              result.sources[0]
                                                                  .checkedAt,
                                                          ).toLocaleString()
                                                        : 'Not checked'}
                                                </p>
                                            </div>
                                        </div>
                                        {existing && (
                                            <p className="mt-3 text-xs text-amber-700">
                                                Possible Portfolio duplicate:{' '}
                                                <Link
                                                    href={`/events/${existing.id}`}
                                                    className="underline"
                                                >
                                                    {existing.name}
                                                </Link>
                                                . Review before adding.
                                            </p>
                                        )}
                                        {otherEdition && (
                                            <p className="mt-3 text-xs">
                                                Another edition already exists:{' '}
                                                {otherEdition.name} (
                                                {otherEdition.start_date}). This
                                                edition stays separate.
                                            </p>
                                        )}
                                        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                            <button
                                                className={button}
                                                onClick={() =>
                                                    setDetails(result)
                                                }
                                            >
                                                View field evidence
                                            </button>
                                            {result.category !== 'excluded' &&
                                                [
                                                    'completed',
                                                    'warnings',
                                                ].includes(job.status) && (
                                                    <button
                                                        className={`${button} bg-zinc-900 text-white dark:bg-white dark:text-zinc-900`}
                                                        disabled={imported.includes(
                                                            result.id,
                                                        )}
                                                        onClick={() =>
                                                            prepareImport([
                                                                result.id,
                                                            ])
                                                        }
                                                    >
                                                        {imported.includes(
                                                            result.id,
                                                        )
                                                            ? 'Imported'
                                                            : 'Review for import'}
                                                    </button>
                                                )}
                                        </div>
                                    </article>
                                )
                            })}
                            {!job.results.some(
                                (r) => r.category === category,
                            ) && (
                                <div className="rounded-xl border p-6 space-y-3">
                                    <p>
                                        {['queued', 'running'].includes(
                                            job.status,
                                        )
                                            ? 'Still searching — no '
                                            : 'No '}{' '}
                                        {category === 'strict'
                                            ? 'strict matches'
                                            : category === 'verification'
                                              ? 'results awaiting verification'
                                              : 'excluded results'}{' '}
                                        {['queued', 'running'].includes(
                                            job.status,
                                        )
                                            ? 'confirmed yet.'
                                            : 'in this search.'}
                                    </p>
                                    {category === 'strict' &&
                                        job.counts.verification > 0 && (
                                            <button
                                                className={button}
                                                onClick={() =>
                                                    setCategory('verification')
                                                }
                                            >
                                                Inspect missing evidence
                                            </button>
                                        )}
                                    {Array.from(
                                        new Set(
                                            job.results.flatMap((r) =>
                                                r.criteria
                                                    .filter(
                                                        (c) =>
                                                            c.status ===
                                                            'failed',
                                                    )
                                                    .map((c) => c.key),
                                            ),
                                        ),
                                    ).map((key) => (
                                        <button
                                            key={key}
                                            className={button}
                                            disabled={running || busy}
                                            onClick={() => {
                                                const next = { ...job.criteria }
                                                if (key === 'dateRange') {
                                                    next.startDate = null
                                                    next.endDate = null
                                                } else if (key === 'upcoming')
                                                    next.includePast = true
                                                else if (key === 'attendance')
                                                    next.attendance = 'any'
                                                else if (
                                                    key === 'country' ||
                                                    key === 'state' ||
                                                    key === 'city' ||
                                                    key === 'organizer' ||
                                                    key === 'audience'
                                                )
                                                    next[key] = ''
                                                else if (key === 'topics') {
                                                    next.industries = []
                                                    next.technologies = []
                                                } else if (
                                                    key === 'includeAll' ||
                                                    key === 'includeAny' ||
                                                    key === 'exclude' ||
                                                    key === 'eventTypes'
                                                )
                                                    next[key] = []
                                                else return
                                                setCriteria(next)
                                                void search(next)
                                            }}
                                        >
                                            Relax {key} and search again
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
            <Dialog
                open={!!details}
                onOpenChange={(open) => !open && setDetails(null)}
            >
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{details?.name}</DialogTitle>
                        <DialogDescription>
                            Field values, exact supporting excerpts and
                            unresolved conflicts.
                        </DialogDescription>
                    </DialogHeader>
                    {details && (
                        <>
                            {details.warnings.map((warning) => (
                                <p
                                    key={warning}
                                    className="text-sm text-amber-700"
                                >
                                    {warning}
                                </p>
                            ))}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th className="p-2">Field</th>
                                            <th className="p-2">
                                                Current value
                                            </th>
                                            <th className="p-2">Evidence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SEARCH_FIELDS.map((field) => (
                                            <tr
                                                key={field}
                                                className="border-t align-top"
                                            >
                                                <th className="p-2 font-medium">
                                                    {field.replaceAll('_', ' ')}
                                                </th>
                                                <td className="p-2">
                                                    {details.resolved[field]
                                                        .value ?? 'Unknown'}
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {
                                                            details.resolved[
                                                                field
                                                            ].status
                                                        }
                                                    </div>
                                                </td>
                                                <td className="p-2 space-y-2">
                                                    {details.resolved[
                                                        field
                                                    ].evidence.map(
                                                        (e, index) => (
                                                            <div key={index}>
                                                                <p>
                                                                    {e.value} ·{' '}
                                                                    {e.status}
                                                                </p>
                                                                <blockquote className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    {e.quote}
                                                                </blockquote>
                                                                {/^https?:\/\//i.test(
                                                                    e.sourceUrl,
                                                                ) && (
                                                                    <a
                                                                        className="underline text-xs"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        href={
                                                                            e.sourceUrl
                                                                        }
                                                                    >
                                                                        Source ·{' '}
                                                                        {new Date(
                                                                            e.checkedAt,
                                                                        ).toLocaleString()}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ),
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <h3 className="font-medium">Required conditions</h3>
                            {details.criteria.map((c) => (
                                <p key={c.key} className="text-sm">
                                    {c.status} — {c.label}
                                </p>
                            ))}
                            <h3 className="font-medium">Source ownership</h3>
                            {details.sources.map((s, i) => (
                                <p key={i} className="text-sm break-words">
                                    {s.kind} ·{' '}
                                    {s.accessible
                                        ? 'Page accessible'
                                        : 'Page unavailable'}{' '}
                                    · {s.identityReason}
                                </p>
                            ))}
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={confirmImport}
                onOpenChange={(open) => !importing && setConfirmImport(open)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Portfolio import</DialogTitle>
                        <DialogDescription>
                            Adding {chosen.length} event(s) with starter tasks
                            will create up to {chosen.length * taskCount} tasks
                            ({taskCount} per new event), based on confirmed
                            event dates. Search alone creates no events or
                            tasks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                        {chosen.map((r) => (
                            <p key={r.id} className="text-sm">
                                {r.name} —{' '}
                                {portfolio.some((p) => sameEdition(r, p))
                                    ? 'Possible duplicate — review existing event'
                                    : 'New candidate'}{' '}
                                · {r.evidenceStatus}
                            </p>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Exact known duplicates are skipped. Unconfirmed names or
                        types must go through Review Queue. Unknown fields stay
                        unknown. Batch selections go to Review Queue first.
                    </p>
                    <button
                        className={button}
                        disabled={importing}
                        onClick={() => importResults('queue', false)}
                    >
                        Add to Review Queue — no tasks
                    </button>
                    {chosen.length === 1 && (
                        <>
                            <button
                                className={button}
                                disabled={
                                    importing ||
                                    chosen[0]?.resolved.name.status !==
                                        'verified' ||
                                    !chosen[0]?.resolved.event_type.value
                                }
                                onClick={() =>
                                    importResults('portfolio', false)
                                }
                            >
                                Add event without tasks
                            </button>
                            <button
                                className={button}
                                disabled={
                                    importing ||
                                    chosen[0]?.resolved.name.status !==
                                        'verified' ||
                                    !chosen[0]?.resolved.event_type.value
                                }
                                onClick={() => importResults('portfolio', true)}
                            >
                                Add event and create {taskCount} tasks
                            </button>
                        </>
                    )}
                    <button
                        className={button}
                        disabled={importing}
                        onClick={() => setConfirmImport(false)}
                    >
                        Cancel
                    </button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
