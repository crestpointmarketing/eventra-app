'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
    Search,
    Loader2,
    ExternalLink,
    SlidersHorizontal,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { buildDefaultEventTasks } from '@/lib/events/default-tasks'
import { EVENT_TYPES } from '@/lib/events/taxonomy'
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
function DelimitedInput({
    value,
    onChange,
}: {
    value: string[]
    onChange: (value: string[]) => void
}) {
    const [text, setText] = useState(value.join(', '))
    const joined = value.join(', ')
    useEffect(() => setText(joined), [joined])
    return (
        <input
            className={control}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() =>
                onChange(
                    text
                        .split(/[,，]/)
                        .map((v) => v.trim())
                        .filter(Boolean),
                )
            }
            placeholder="Separate with commas"
        />
    )
}
function FilterSection({
    title,
    summary,
    children,
    defaultOpen = false,
}: {
    title: string
    summary: string
    children: ReactNode
    defaultOpen?: boolean
}) {
    return (
        <details
            open={defaultOpen}
            className="group border-t border-zinc-200 dark:border-zinc-700"
        >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-lime-500">
                <span className="min-w-0">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block break-words text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        {summary}
                    </span>
                </span>
                <ChevronDown
                    size={16}
                    className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                />
            </summary>
            <div className="space-y-4 pb-5">{children}</div>
        </details>
    )
}
export function FindEventsView() {
    const [criteria, setCriteria] = useState<SearchCriteria>(initial)
    const [naturalText, setNaturalText] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(true)
    const [busy, setBusy] = useState(false)
    const [jobs, setJobs] = useState<SearchJob[]>([])
    const [jobId, setJobId] = useState<string | null>(null)
    const [category, setCategory] = useState<
        'strict' | 'verification' | 'excluded'
    >('strict')
    const [details, setDetails] = useState<SearchResult | null>(null)
    const [selected, setSelected] = useState<string[]>([])
    const [importing, setImporting] = useState(false)
    const [confirmImport, setConfirmImport] = useState(false)
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
    const [imported, setImported] = useState<string[]>([])
    const [loadError, setLoadError] = useState('')
    const job = jobs.find((j) => j.id === jobId) ?? jobs[0]
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
            setCategory('strict')
            if (window.matchMedia('(max-width: 1279px)').matches)
                setFiltersOpen(false)
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
                text: naturalText,
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
    const listInput = (
        key:
            | 'industries'
            | 'technologies'
            | 'includeAny'
            | 'includeAll'
            | 'exclude',
        label: string,
    ) => (
        <label className="block space-y-1 text-sm" key={key}>
            <span>{label}</span>
            <DelimitedInput
                value={criteria[key]}
                onChange={(value) => set(key, value)}
            />
        </label>
    )
    const chosen = job?.results.filter((r) => selected.includes(r.id)) ?? []
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Find events</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Search broadly. Verify each field. Choose what enters
                        your Portfolio.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className={`${button} bg-zinc-900 text-white dark:bg-white dark:text-zinc-900`}
                        disabled={busy || running}
                        onClick={() => search()}
                    >
                        Start search
                    </button>
                    <button
                        className={button}
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
                        Save conditions
                    </button>
                </div>
            </header>
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="min-w-0 self-start rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold">
                            <SlidersHorizontal size={17} /> Search filters
                        </h2>
                        <button
                            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white"
                            onClick={() => {
                                setCriteria(initial())
                                setNaturalText('')
                            }}
                        >
                            Reset all
                        </button>
                    </div>
                    <button
                        className={`${button} mb-3 xl:hidden`}
                        onClick={() => setFiltersOpen((v) => !v)}
                    >
                        {filtersOpen ? 'Hide filters' : 'Edit search filters'}
                    </button>
                    <div
                        className={`${filtersOpen ? 'block' : 'hidden'} xl:block space-y-4`}
                    >
                        <div
                            className="grid grid-cols-2 gap-2"
                            role="group"
                            aria-label="Search mode"
                        >
                            {(['discover', 'specific'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    aria-pressed={criteria.mode === mode}
                                    className={`${button} ${criteria.mode === mode ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : ''}`}
                                    onClick={() => set('mode', mode)}
                                >
                                    {mode === 'discover'
                                        ? 'Discover events'
                                        : 'Find a specific event'}
                                </button>
                            ))}
                        </div>
                        <label className="block space-y-1 text-sm">
                            <span>
                                {criteria.mode === 'specific'
                                    ? 'Event name / exact phrase'
                                    : 'Search description'}
                            </span>
                            <input
                                className={control}
                                value={criteria.query}
                                placeholder={
                                    criteria.mode === 'specific'
                                        ? 'e.g. HIMSS 2027'
                                        : 'e.g. Healthcare AI conferences'
                                }
                                onChange={(e) => set('query', e.target.value)}
                            />
                        </label>
                        <FilterSection
                            title="Dates & location"
                            summary={
                                [
                                    criteria.startDate &&
                                        `From ${criteria.startDate}`,
                                    criteria.endDate &&
                                        `Through ${criteria.endDate}`,
                                    criteria.city,
                                    criteria.state,
                                    criteria.country,
                                ]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                (criteria.includePast
                                    ? 'Any dates · Anywhere'
                                    : 'Upcoming events · Anywhere')
                            }
                            defaultOpen
                        >
                            <div className="grid grid-cols-2 gap-3">
                                {(['startDate', 'endDate'] as const).map(
                                    (key) => (
                                        <label
                                            key={key}
                                            className="text-sm space-y-1"
                                        >
                                            <span>
                                                {key === 'startDate'
                                                    ? 'From'
                                                    : 'Through'}
                                            </span>
                                            <input
                                                type="date"
                                                className={control}
                                                value={criteria[key] ?? ''}
                                                onChange={(e) =>
                                                    set(
                                                        key,
                                                        e.target.value || null,
                                                    )
                                                }
                                            />
                                        </label>
                                    ),
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Events must overlap this date range. Both event
                                dates are checked.
                            </p>
                            {(['country', 'state', 'city'] as const).map(
                                (key) => (
                                    <label
                                        key={key}
                                        className="block space-y-1 text-sm"
                                    >
                                        <span>
                                            {
                                                {
                                                    country: 'Country',
                                                    state: 'State / province',
                                                    city: 'City',
                                                    organizer: 'Organizer',
                                                    audience:
                                                        'Officially stated audience',
                                                }[key]
                                            }
                                        </span>
                                        <input
                                            className={control}
                                            value={criteria[key]}
                                            onChange={(e) =>
                                                set(key, e.target.value)
                                            }
                                        />
                                    </label>
                                ),
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-lime-600"
                                    checked={criteria.includePast}
                                    onChange={(e) =>
                                        set('includePast', e.target.checked)
                                    }
                                />{' '}
                                Include past editions
                            </label>
                        </FilterSection>
                        <FilterSection
                            title="Format & event type"
                            summary={[
                                criteria.attendance === 'any'
                                    ? 'Any format'
                                    : criteria.attendance.replace('_', ' '),
                                criteria.eventTypes.join(', ') ||
                                    'Any event type',
                            ].join(' · ')}
                        >
                            <label className="block space-y-1 text-sm">
                                <span>Attendance</span>
                                <select
                                    className={control}
                                    value={criteria.attendance}
                                    onChange={(e) =>
                                        set(
                                            'attendance',
                                            e.target
                                                .value as SearchCriteria['attendance'],
                                        )
                                    }
                                >
                                    <option value="any">Any</option>
                                    <option value="in_person">In person</option>
                                    <option value="online">Online</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </label>
                            <fieldset className="space-y-2">
                                <legend className="text-sm">
                                    Event types · match any
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {EVENT_TYPES.map((type) => (
                                        <button
                                            key={type}
                                            className={`${button} text-xs ${criteria.eventTypes.includes(type) ? 'border-lime-500 bg-lime-50 text-zinc-900 dark:bg-lime-950 dark:text-lime-100' : ''} text-left`}
                                            aria-pressed={criteria.eventTypes.includes(
                                                type,
                                            )}
                                            onClick={() =>
                                                set(
                                                    'eventTypes',
                                                    criteria.eventTypes.includes(
                                                        type,
                                                    )
                                                        ? criteria.eventTypes.filter(
                                                              (t) => t !== type,
                                                          )
                                                        : [
                                                              ...criteria.eventTypes,
                                                              type,
                                                          ],
                                                )
                                            }
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        </FilterSection>
                        <FilterSection
                            title="Industries & technologies"
                            summary={
                                [
                                    ...criteria.industries,
                                    ...criteria.technologies,
                                ].join(` ${criteria.topicOperator} `) ||
                                'All topics'
                            }
                        >
                            {listInput('industries', 'Industries')}
                            {listInput('technologies', 'Technologies')}
                            <label className="block text-sm space-y-1">
                                <span>Industry / technology relationship</span>
                                <select
                                    className={control}
                                    value={criteria.topicOperator}
                                    onChange={(e) =>
                                        set(
                                            'topicOperator',
                                            e.target.value as 'AND' | 'OR',
                                        )
                                    }
                                >
                                    <option value="OR">
                                        OR — match any selected topic
                                    </option>
                                    <option value="AND">
                                        AND — match all selected topics
                                    </option>
                                </select>
                            </label>
                        </FilterSection>
                        <FilterSection
                            title="Keywords & exclusions"
                            summary={`${criteria.includeAny.length + criteria.includeAll.length} included · ${criteria.exclude.length} excluded`}
                        >
                            {listInput('includeAny', 'Include any keyword')}
                            {listInput('includeAll', 'Include all keywords')}
                            {listInput('exclude', 'Exclude keywords')}
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Keywords apply to title, description and
                                organizer. Unknown facts stay unconfirmed.
                            </p>
                        </FilterSection>
                        <FilterSection
                            title="Organizer & audience"
                            summary={
                                [criteria.organizer, criteria.audience]
                                    .filter(Boolean)
                                    .join(' · ') ||
                                'Any organizer · Any audience'
                            }
                        >
                            {(['organizer', 'audience'] as const).map((key) => (
                                <label
                                    key={key}
                                    className="block space-y-1 text-sm"
                                >
                                    <span>
                                        {key === 'organizer'
                                            ? 'Organizer'
                                            : 'Officially stated audience'}
                                    </span>
                                    <input
                                        className={control}
                                        value={criteria[key]}
                                        placeholder={
                                            key === 'organizer'
                                                ? 'e.g. HIMSS'
                                                : 'e.g. Hospital CIOs'
                                        }
                                        onChange={(e) =>
                                            set(key, e.target.value)
                                        }
                                    />
                                </label>
                            ))}
                        </FilterSection>
                        <FilterSection
                            title="Verify a page"
                            summary={
                                criteria.pageUrl ||
                                'Optional · Check a source URL'
                            }
                        >
                            <label className="block space-y-1 text-sm">
                                <span>Verify from this page</span>
                                <input
                                    type="url"
                                    className={control}
                                    value={criteria.pageUrl}
                                    onChange={(e) =>
                                        set('pageUrl', e.target.value)
                                    }
                                    placeholder="https://…"
                                />
                                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                    A submitted URL is checked for official
                                    ownership.
                                </span>
                            </label>
                        </FilterSection>
                        <FilterSection
                            title="Describe your search with AI"
                            summary="Optional · Turn a sentence into editable filters"
                        >
                            <label className="block space-y-1 text-sm">
                                <span>Describe your search</span>
                                <textarea
                                    className={control}
                                    rows={3}
                                    value={naturalText}
                                    onChange={(e) =>
                                        setNaturalText(e.target.value)
                                    }
                                    placeholder="Healthcare AI conferences in Toronto, October–December 2026, excluding webinars"
                                />
                            </label>
                            <button
                                className={button}
                                disabled={busy || !naturalText.trim()}
                                onClick={parse}
                            >
                                Parse into editable conditions
                            </button>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Parsing never changes your search mode or starts
                                a search.
                            </p>
                        </FilterSection>
                        <button
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 font-medium text-white dark:text-zinc-900 disabled:opacity-50"
                            disabled={busy || running}
                            onClick={() => search()}
                        >
                            {busy ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}{' '}
                            Start search
                        </button>
                    </div>
                </aside>
                <main className="min-w-0 space-y-5">
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
                                className="flex flex-wrap gap-2"
                                role="group"
                                aria-label="Result category"
                            >
                                {(
                                    [
                                        {
                                            key: 'strict',
                                            label: 'Strict Match',
                                            icon: CheckCircle2,
                                        },
                                        {
                                            key: 'verification',
                                            label: 'Needs Verification',
                                            icon: AlertTriangle,
                                        },
                                        {
                                            key: 'excluded',
                                            label: 'View excluded results',
                                            icon: XCircle,
                                        },
                                    ] as const
                                ).map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        className={`${button} flex gap-2 items-center ${category === key ? 'bg-lime-50 dark:bg-zinc-800 ring-1 ring-lime-500' : ''}`}
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
                            {job.results
                                .filter((r) => r.category === category)
                                .map((result) => {
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
                                            className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                {result.category !==
                                                    'excluded' && (
                                                    <input
                                                        aria-label={`Select ${result.name}`}
                                                        className="mt-1"
                                                        type="checkbox"
                                                        disabled={imported.includes(
                                                            result.id,
                                                        )}
                                                        checked={selected.includes(
                                                            result.id,
                                                        )}
                                                        onChange={(e) =>
                                                            setSelected((s) =>
                                                                e.target.checked
                                                                    ? [
                                                                          ...s,
                                                                          result.id,
                                                                      ]
                                                                    : s.filter(
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
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-semibold">
                                                        {f.name.value ||
                                                            result.name}
                                                    </h3>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                        {f.start_date.value ||
                                                            'Date unknown'}{' '}
                                                        —{' '}
                                                        {f.end_date.value ||
                                                            'Date unknown'}{' '}
                                                        ·{' '}
                                                        {[
                                                            f.city.value,
                                                            f.state.value,
                                                            f.country.value,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') ||
                                                            'Location unknown'}
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        {f.attendance.value ||
                                                            'Attendance unknown'}{' '}
                                                        ·{' '}
                                                        {f.event_type.value ||
                                                            'Type unknown'}{' '}
                                                        ·{' '}
                                                        {f.organizer.value ||
                                                            'Organizer unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm space-y-1">
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
                                                    required checks
                                                </p>
                                                <p>
                                                    Evidence status:{' '}
                                                    <strong>
                                                        {result.evidenceStatus}
                                                    </strong>{' '}
                                                    · {result.unknownCount}{' '}
                                                    fields not confirmed
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                                            <ul className="text-sm space-y-1">
                                                {(result.reasons.length
                                                    ? result.reasons
                                                    : result.criteria
                                                          .filter(
                                                              (c) =>
                                                                  c.status ===
                                                                  'matched',
                                                          )
                                                          .map((c) => c.label)
                                                )
                                                    .slice(0, 3)
                                                    .map((reason) => (
                                                        <li key={reason}>
                                                            {reason}
                                                        </li>
                                                    ))}
                                            </ul>
                                            {existing && (
                                                <p className="text-sm text-amber-700">
                                                    Possible Portfolio
                                                    duplicate:{' '}
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
                                                <p className="text-sm">
                                                    Another edition already
                                                    exists: {otherEdition.name}{' '}
                                                    ({otherEdition.start_date}).
                                                    This edition will remain
                                                    separate.
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    className={button}
                                                    onClick={() =>
                                                        setDetails(result)
                                                    }
                                                >
                                                    View field evidence
                                                </button>
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
                                                            className={`${button} inline-flex items-center gap-2`}
                                                        >
                                                            Source page{' '}
                                                            <ExternalLink
                                                                size={14}
                                                            />
                                                        </a>
                                                    )}
                                                {result.category !==
                                                    'excluded' &&
                                                    [
                                                        'completed',
                                                        'warnings',
                                                    ].includes(job.status) && (
                                                        <button
                                                            className={button}
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
                                        No{' '}
                                        {category === 'strict'
                                            ? 'strict matches'
                                            : category === 'verification'
                                              ? 'results awaiting verification'
                                              : 'excluded results'}{' '}
                                        in this search.
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
