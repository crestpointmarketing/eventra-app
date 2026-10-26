'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Bookmark, Loader2, Plus, RefreshCw, Search, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { EvidencePanel, FieldEvidenceSheet } from '@/components/events/field-evidence-sheet'
import { SearchFilters } from '@/components/events/search-filters'
import {
    SEARCH_STAGES,
    searchCriteriaSchema,
    type SearchCriteria,
    type SearchJob,
    type SearchResult,
} from '@/lib/events/search-contract'
import { compareSearchPreferences } from '@/lib/events/search-advanced'
import { hasPhrase, normalized } from '@/lib/events/search-evaluation'
import { SearchImportDialog } from '@/components/events/search-import-dialog'
import { refreshEventData } from '@/lib/query-refresh'
import {
    fetchSavedResults,
    removeSavedResult,
    saveResult,
    type SavedSearchResult,
} from '@/lib/api/saved-search'
import { DiscoverResultCard } from './discover-result-card'
import { SearchResultDetails } from './search-result-details'
import { SpecificEventSearch, rankEditions } from './specific-event-search'
import { relativeTime, SearchStepper, type StepState } from './search-ui'

const control =
    'min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm'
const initial = () => searchCriteriaSchema.parse({ mode: 'discover' })
type Mode = 'discover' | 'specific'
type Category = 'strict' | 'verification' | 'excluded' | 'saved'
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
const STEP_LABELS = [
    'Understand',
    'Plan queries',
    'Find events',
    'Check sources',
    'Extract details',
    'Apply filters',
    'Dedupe',
    'Ready',
]
function discoverSteps(job: SearchJob): { label: string; state: StepState }[] {
    const finished = job.status === 'completed' || job.status === 'warnings'
    const stopped = job.status === 'failed' || job.status === 'cancelled'
    const current = Math.max(0, (SEARCH_STAGES as readonly string[]).indexOf(job.stage))
    return STEP_LABELS.map((label, index) => ({
        label,
        state: finished || index < current ? 'done' : index === current ? (stopped ? 'failed' : 'active') : 'pending',
    }))
}
function useWideScreen() {
    const [wide, setWide] = useState(false)
    useEffect(() => {
        const query = window.matchMedia('(min-width: 1280px)')
        const update = () => setWide(query.matches)
        update()
        query.addEventListener('change', update)
        return () => query.removeEventListener('change', update)
    }, [])
    return wide
}

export function FindEventsView() {
    const queryClient = useQueryClient()
    const wide = useWideScreen()
    const [mode, setMode] = useState<Mode>('discover')
    const [criteria, setCriteria] = useState<SearchCriteria>(initial)
    const [busy, setBusy] = useState(false)
    const [sort, setSort] = useState('matches')
    const [jobs, setJobs] = useState<SearchJob[]>([])
    const [jobIds, setJobIds] = useState<Record<Mode, string | null>>({ discover: null, specific: null })
    const [hiddenSpecific, setHiddenSpecific] = useState(false)
    const [selectedCategory, setCategory] = useState<Category | null>(null)
    const [details, setDetails] = useState<SearchResult | null>(null)
    const [detailsJobId, setDetailsJobId] = useState<string | null>(null)
    const [panelClosed, setPanelClosed] = useState(false)
    const [edition, setEdition] = useState<string | null>(null)
    const [selected, setSelected] = useState<string[]>([])
    const [importing, setImporting] = useState(false)
    const [importTarget, setImportTarget] = useState<{ jobId: string; results: SearchResult[] } | null>(null)
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
    const [imported, setImported] = useState<string[]>([])
    const [loadError, setLoadError] = useState('')
    const [saved, setSaved] = useState<SavedSearchResult[]>([])
    const [savingIds, setSavingIds] = useState<string[]>([])
    const [advancedRequest, setAdvancedRequest] = useState(0)
    const [viewing, setViewing] = useState<{ result: SearchResult; jobId: string } | null>(null)
    const listScroll = useRef(0)

    const modeJobs = (m: Mode) => jobs.filter((j) => j.criteria.mode === m)
    const jobFor = (m: Mode) => {
        const list = modeJobs(m)
        return list.find((j) => j.id === jobIds[m]) ?? list[0]
    }
    const job = jobFor('discover')
    const specificJob = hiddenSpecific ? undefined : jobFor('specific')
    const category: Category =
        selectedCategory ??
        (job?.counts.strict ? 'strict' : job?.counts.verification ? 'verification' : 'strict')
    const running = jobs.some((j) => j.status === 'queued' || j.status === 'running')

    const refresh = useCallback(async () => {
        try {
            const data = await request('')
            setJobs(data.jobs)
            setLoadError('')
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Search history unavailable')
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
    const refreshSaved = useCallback(async () => {
        try {
            setSaved(await fetchSavedResults())
        } catch {
            // Saving is optional; the tab explains when the list cannot load.
        }
    }, [])
    useEffect(() => {
        void refresh()
        void refreshSaved()
        void refreshPortfolio().catch(() => {})
        try {
            const stored = localStorage.getItem('eventra-search-criteria-v1')
            const parsed = stored ? searchCriteriaSchema.safeParse(JSON.parse(stored)) : null
            if (parsed?.success) setCriteria({ ...parsed.data, mode: 'discover' })
        } catch {}
    }, [refresh, refreshSaved, refreshPortfolio])
    useEffect(() => {
        if (!running) return
        const timer = setInterval(() => void refresh(), 3000)
        return () => clearInterval(timer)
    }, [running, refresh])

    function set<K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) {
        setCriteria((c) => ({ ...c, [key]: value }))
    }
    function openDetails(result: SearchResult, jobId: string | undefined) {
        setDetails(result)
        setDetailsJobId(jobId ?? null)
        setPanelClosed(false)
    }
    // The details page replaces the list in place, so filters and results keep their state.
    function openView(result: SearchResult, jobId: string) {
        listScroll.current = window.scrollY
        setViewing({ result, jobId })
        openDetails(result, jobId)
        window.scrollTo(0, 0)
    }
    function closeView() {
        setViewing(null)
        requestAnimationFrame(() => window.scrollTo(0, listScroll.current))
    }
    function closeDetails() {
        setDetails(null)
        setPanelClosed(true)
    }
    async function start(next: SearchCriteria) {
        const valid = searchCriteriaSchema.safeParse(next)
        if (!valid.success) {
            toast.error(valid.error.issues[0]?.message || 'Review your filters')
            return
        }
        setBusy(true)
        try {
            const data = await request('', valid.data)
            setJobIds((ids) => ({ ...ids, [valid.data.mode]: data.id }))
            setSelected([])
            setImported([])
            setCategory(null)
            setDetails(null)
            setPanelClosed(false)
            setEdition(null)
            setHiddenSpecific(false)
            await refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Search failed')
        } finally {
            setBusy(false)
        }
    }
    function searchSpecific(text: string) {
        // Earlier editions help people choose the right one, so the specific search includes them.
        const url = /^https?:\/\/\S+$/i.test(text) ? text : ''
        void start(
            searchCriteriaSchema.parse({ mode: 'specific', query: url ? '' : text, pageUrl: url, includePast: true }),
        )
    }
    async function parse() {
        setBusy(true)
        try {
            const data = await request('/parse', { text: criteria.query, mode: 'discover' })
            setCriteria(data.criteria)
            toast.success('Review the parsed conditions, then start search')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Parsing failed')
        } finally {
            setBusy(false)
        }
    }
    async function cancel(target: SearchJob) {
        try {
            await request('/cancel', { id: target.id })
            await refresh()
        } catch {
            toast.error('Cancellation failed')
        }
    }
    async function retry(target: SearchJob) {
        try {
            await request('/retry', { id: target.id })
            await refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Retry failed')
        }
    }
    async function prepareImport(jobId: string, results: SearchResult[]) {
        try {
            await refreshPortfolio()
            setImportTarget({ jobId, results })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Duplicate check failed')
        }
    }
    async function importResults(destination: 'queue' | 'portfolio', createTasks: boolean) {
        if (!importTarget) return
        setImporting(true)
        try {
            for (const result of importTarget.results) {
                await request('/import', { jobId: importTarget.jobId, resultId: result.id, destination, createTasks })
                setImported((prev) => [...prev, result.id])
            }
            setImportTarget(null)
            setSelected([])
            await refreshPortfolio()
            toast.success(destination === 'queue' ? 'Added to Review Queue. No tasks created.' : 'Portfolio import completed')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Import failed; completed items are safe to retry')
        } finally {
            // Even a partial import changes the portfolio, tasks and review queue.
            refreshEventData(queryClient)
            setImporting(false)
        }
    }
    const savedKey = (jobId: string, resultId: string) => `${jobId}:${resultId}`
    const savedKeys = new Set(saved.map((s) => savedKey(s.job_id, s.result_id)))
    async function toggleSave(jobId: string, result: SearchResult) {
        const key = savedKey(jobId, result.id)
        setSavingIds((ids) => [...ids, key])
        try {
            if (savedKeys.has(key)) await removeSavedResult(jobId, result.id)
            else await saveResult(jobId, result)
            await refreshSaved()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Save failed')
        } finally {
            setSavingIds((ids) => ids.filter((id) => id !== key))
        }
    }

    // Condition chips: every active discover filter, each removable.
    const conditionChips: { id: string; label: string; remove: () => void }[] = []
    for (const key of ['industries', 'technologies', 'eventTypes', 'includeAny', 'includeAll', 'exclude'] as const)
        for (const value of criteria[key])
            conditionChips.push({
                id: `${key}:${value}`,
                label: `${key === 'exclude' ? 'Exclude: ' : key === 'includeAll' ? 'Required: ' : key === 'includeAny' ? 'Any: ' : ''}${value}`,
                remove: () => set(key, criteria[key].filter((v) => v !== value)),
            })
    for (const region of criteria.regions)
        conditionChips.push({ id: `region:${region}`, label: region, remove: () => set('regions', criteria.regions.filter((r) => r !== region)) })
    for (const key of ['country', 'state', 'city', 'organizer', 'audience', 'pageUrl'] as const)
        if (criteria[key])
            conditionChips.push({
                id: key,
                label: `${key === 'pageUrl' ? 'Source: ' : key === 'organizer' ? 'Organizer: ' : key === 'audience' ? 'Audience: ' : ''}${criteria[key]}`,
                remove: () => set(key, ''),
            })
    if (criteria.startDate || criteria.endDate)
        conditionChips.push({
            id: 'dates',
            label: `${criteria.startDate || 'Any date'} – ${criteria.endDate || 'Onward'}`,
            remove: () => setCriteria((c) => ({ ...c, startDate: null, endDate: null })),
        })
    if (criteria.attendance !== 'any')
        conditionChips.push({
            id: 'attendance',
            label: criteria.attendance === 'in_person' ? 'In-person' : criteria.attendance === 'online' ? 'Virtual' : 'Hybrid',
            remove: () => set('attendance', 'any'),
        })
    if (criteria.includePast)
        conditionChips.push({ id: 'past', label: 'Include past editions', remove: () => set('includePast', false) })
    if (criteria.topicOperator === 'AND')
        conditionChips.push({ id: 'operator', label: 'Match all topics', remove: () => set('topicOperator', 'OR') })
    const advanced = criteria.advanced
    const updateAdvanced = (patch: Partial<SearchCriteria['advanced']>) =>
        setCriteria((c) => ({ ...c, advanced: { ...c.advanced, ...patch } }))
    for (const [id, label, min, max, rule] of [
        ['size', 'Attendees', 'attendeeMin', 'attendeeMax', 'sizeRule'],
        ['ticket', 'Ticket', 'ticketMin', 'ticketMax', 'budgetRule'],
        ['sponsorBudget', 'Sponsorship', 'sponsorshipMin', 'sponsorshipMax', 'budgetRule'],
    ] as const)
        if (advanced[min] !== null || advanced[max] !== null)
            conditionChips.push({
                id,
                label: `${advanced[rule] === 'require' ? 'Required' : 'Prefer'} ${label}: ${advanced[min] ?? 'Any'}–${advanced[max] ?? 'Any'}${id === 'size' ? '' : ' ' + advanced.currency}`,
                remove: () => updateAdvanced({ [min]: null, [max]: null }),
            })
    if (advanced.language)
        conditionChips.push({ id: 'language', label: `${advanced.sizeRule}: ${advanced.language}`, remove: () => updateAdvanced({ language: '' }) })
    for (const objective of advanced.objectives)
        conditionChips.push({
            id: `goal:${objective}`,
            label: `Prefer: ${objective}`,
            remove: () => updateAdvanced({ objectives: advanced.objectives.filter((v) => v !== objective) }),
        })
    if (advanced.deadlineTypes.length)
        conditionChips.push({
            id: 'deadlines',
            label: `${advanced.deadlineRule}: ${advanced.deadlineTypes.join(', ')} deadlines ${advanced.deadlineAfter || 'from today'}`,
            remove: () => updateAdvanced({ deadlineTypes: [], deadlineAfter: null }),
        })

    const entries: { result: SearchResult; jobId: string }[] =
        category === 'saved'
            ? saved.map((s) => ({ result: s.result, jobId: s.job_id }))
            : job
              ? job.results.filter((r) => r.category === category).map((result) => ({ result, jobId: job.id }))
              : []
    const visible = entries.slice().sort(({ result: a }, { result: b }) => {
        if (sort === 'date') return (a.resolved.start_date.value || '9999').localeCompare(b.resolved.start_date.value || '9999')
        if (sort === 'name') return a.name.localeCompare(b.name)
        return compareSearchPreferences(a, b)
    })
    const finishedJob = (jobId: string) => {
        const owner = jobs.find((j) => j.id === jobId)
        // Saved results from older searches can be imported once their search has finished.
        return !owner || owner.status === 'completed' || owner.status === 'warnings'
    }
    const topicTerms = job ? [...job.criteria.industries, ...job.criteria.technologies, ...job.criteria.includeAny, ...job.criteria.includeAll] : []
    const tagsFor = (result: SearchResult) => {
        const text = `${result.resolved.name.value ?? ''} ${result.resolved.description.value ?? ''}`
        return topicTerms.filter((term) => hasPhrase(text, term))
    }

    // The side panel's automatic pick must not reappear as a drawer when the window narrows.
    useEffect(() => {
        if (!wide) setDetails(null)
    }, [wide])
    // On wide screens the evidence panel shows the first result until someone picks or closes it.
    const firstVisible = mode === 'discover' ? visible[0] : undefined
    useEffect(() => {
        if (wide && !details && !panelClosed && firstVisible) {
            setDetails(firstVisible.result)
            setDetailsJobId(firstVisible.jobId)
        }
    }, [wide, details, panelClosed, firstVisible])
    // The best edition starts selected in the specific search.
    const bestEdition = specificJob ? rankEditions(specificJob.results).find((e) => e.label === 'best')?.result : undefined
    useEffect(() => {
        if (mode === 'specific' && bestEdition && !edition) {
            setEdition(bestEdition.id)
            if (wide && !panelClosed) {
                setDetails(bestEdition)
                setDetailsJobId(specificJob?.id ?? null)
            }
        }
    }, [mode, bestEdition, edition, wide, panelClosed, specificJob?.id])

    const detailsImportable =
        details && detailsJobId && details.category !== 'excluded' && finishedJob(detailsJobId) && !imported.includes(details.id)
    const evidenceFooter = details && detailsImportable && (
        <button type="button" className="workspace-action w-full justify-center" onClick={() => prepareImport(detailsJobId!, [details])}>
            Review for import
        </button>
    )
    const panelOpen = wide && !!details

    const modeTabs = (
        <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Search mode">
            {(['discover', 'specific'] as const).map((m) => (
                <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    type="button"
                    onClick={() => {
                        setMode(m)
                        setViewing(null)
                        setDetails(null)
                        setPanelClosed(false)
                    }}
                    className={`-mb-px border-b-2 px-4 py-3 text-sm sm:text-base ${mode === m ? 'border-indigo-600 font-semibold text-foreground dark:border-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    {m === 'discover' ? 'Discover events' : 'Find a specific event'}
                </button>
            ))}
        </div>
    )

    return (
        <div className={`grid items-start gap-6 ${panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
            <div className="min-w-0 space-y-5">
                {modeTabs}
                {loadError && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-4 text-sm">
                        {loadError}
                        <button type="button" className="workspace-secondary" onClick={refresh}>Retry</button>
                    </div>
                )}
                {mode === 'specific' ? (
                    <SpecificEventSearch
                        key={specificJob?.id ?? 'new'}
                        job={specificJob}
                        busy={busy}
                        running={running}
                        selectedId={edition}
                        onSearch={searchSpecific}
                        onCancel={() => specificJob && cancel(specificJob)}
                        onRetry={() => specificJob && retry(specificJob)}
                        onSelect={(result) => {
                            setEdition(result.id)
                            openDetails(result, specificJob?.id)
                        }}
                        onOpen={(result) => openDetails(result, specificJob?.id)}
                        onContinue={(result) => specificJob && prepareImport(specificJob.id, [result])}
                        onSearchAgain={() => {
                            setHiddenSpecific(true)
                            setEdition(null)
                            setDetails(null)
                        }}
                    />
                ) : (
                    <>
                    {viewing && (
                        <SearchResultDetails
                            key={`${viewing.jobId}:${viewing.result.id}`}
                            result={viewing.result}
                            onBack={closeView}
                            onEvidence={() => openDetails(viewing.result, viewing.jobId)}
                            onImport={viewing.result.category !== 'excluded' && finishedJob(viewing.jobId) ? () => prepareImport(viewing.jobId, [viewing.result]) : undefined}
                            imported={imported.includes(viewing.result.id)}
                            saved={savedKeys.has(savedKey(viewing.jobId, viewing.result.id))}
                            onToggleSave={() => toggleSave(viewing.jobId, viewing.result)}
                        />
                    )}
                    <div className={`grid items-start gap-6 lg:grid-cols-[228px_minmax(0,1fr)] ${viewing ? 'hidden' : ''}`}>
                        <SearchFilters
                            criteria={criteria}
                            onChange={setCriteria}
                            onSearch={() => start(criteria)}
                            disabled={busy || running}
                            advancedRequest={advancedRequest}
                        />
                        <main className="min-w-0 space-y-5">
                            <section aria-label="Search query" className="space-y-3">
                                <form className="flex overflow-hidden rounded-lg border border-border bg-card" onSubmit={(e) => { e.preventDefault(); void start(criteria) }}>
                                    <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
                                        <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                                        <input
                                            aria-label="Search description"
                                            value={criteria.query}
                                            onChange={(e) => set('query', e.target.value)}
                                            placeholder="e.g. AI conferences in North America in 2026 for enterprise leaders"
                                            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                                        />
                                        {criteria.query && (
                                            <button type="button" aria-label="Clear search text" onClick={() => set('query', '')} className="p-1 text-muted-foreground">
                                                <X size={15} />
                                            </button>
                                        )}
                                    </label>
                                    <button type="submit" disabled={busy || running} className="inline-flex items-center gap-2 bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                                        {busy && <Loader2 size={15} className="animate-spin" />}Search
                                    </button>
                                </form>
                                <div className="flex flex-wrap items-center gap-2">
                                    {conditionChips.map((chip) => (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            onClick={chip.remove}
                                            aria-label={`Remove condition: ${chip.label}`}
                                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                                        >
                                            <span className="break-words">{chip.label}</span>
                                            <X size={13} className="shrink-0 text-muted-foreground" />
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => setAdvancedRequest((n) => n + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                                        <Plus size={14} />Add filter
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                    <button type="button" disabled={busy || !criteria.query.trim()} onClick={parse} className="inline-flex items-center gap-1.5 font-medium text-indigo-600 disabled:opacity-50 dark:text-indigo-300">
                                        <Sparkles size={14} />Extract filters from text
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 font-medium"
                                        onClick={() => {
                                            try {
                                                localStorage.setItem('eventra-search-criteria-v1', JSON.stringify(criteria))
                                                toast.success('Search conditions saved on this device')
                                            } catch {
                                                toast.error('This browser blocked saving')
                                            }
                                        }}
                                    >
                                        <Bookmark size={14} />Save conditions
                                    </button>
                                    {modeJobs('discover').length > 0 && (
                                        <label className="ml-auto flex min-w-0 items-center gap-2 text-muted-foreground">
                                            History
                                            <select
                                                className={`${control} max-w-[16rem] py-1 text-xs`}
                                                value={job?.id ?? ''}
                                                onChange={(e) => {
                                                    setJobIds((ids) => ({ ...ids, discover: e.target.value }))
                                                    setCategory(null)
                                                    setSelected([])
                                                    setImported([])
                                                    setDetails(null)
                                                }}
                                            >
                                                {modeJobs('discover').map((j) => (
                                                    <option key={j.id} value={j.id}>
                                                        {new Date(j.created_at).toLocaleString()} · {j.criteria.query || j.criteria.industries.join(', ') || 'Event search'} · {j.status}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                </div>
                            </section>

                            {job && (
                                <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-live="polite">
                                    <SearchStepper label="Search progress" steps={discoverSteps(job)} />
                                    {job.error && <p role="alert" className="text-sm text-red-600">{job.error}</p>}
                                    {job.warnings.map((w) => <p key={w} className="text-sm text-amber-700 dark:text-amber-300">{w}</p>)}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {['queued', 'running'].includes(job.status) && (
                                            <>
                                                <button type="button" className="workspace-secondary" onClick={() => cancel(job)}>Cancel search</button>
                                                <Link className="workspace-secondary" href="/dashboard">Continue in background</Link>
                                                <span className="text-xs text-muted-foreground">Progress is saved on the server. You can leave or refresh this page.</span>
                                            </>
                                        )}
                                        {['failed', 'warnings'].includes(job.status) && (
                                            <button type="button" className="workspace-secondary" disabled={running} onClick={() => retry(job)}>Retry sources needing verification</button>
                                        )}
                                        <button type="button" className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setCriteria({ ...job.criteria, mode: 'discover' })}>
                                            Restore these conditions
                                        </button>
                                    </div>
                                </section>
                            )}

                            {!job && category !== 'saved' && (
                                <div className="space-y-3 rounded-xl border border-dashed border-border p-10 text-center">
                                    <Search className="mx-auto text-muted-foreground" />
                                    <h2 className="text-lg font-medium">Make the search specific to your needs</h2>
                                    <p className="text-sm text-muted-foreground">Choose dates, location and topics. Results explain both matching conditions and supporting evidence.</p>
                                    {saved.length > 0 && (
                                        <button type="button" className="workspace-secondary" onClick={() => setCategory('saved')}>View {saved.length} saved events</button>
                                    )}
                                </div>
                            )}

                            {(job || category === 'saved') && (
                                <>
                                    {job && (
                                        <div className="flex flex-wrap items-end justify-between gap-3">
                                            <div>
                                                <h2 className="text-2xl font-semibold">
                                                    {(job.counts.strict + job.counts.verification).toLocaleString('en-US')} event{job.counts.strict + job.counts.verification === 1 ? '' : 's'} found
                                                </h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {job.counts.candidates} candidates · {job.counts.checked} source checks · {job.counts.excluded} excluded
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-right text-xs text-muted-foreground">
                                                    Last updated
                                                    <br />
                                                    {new Date(job.updated_at).toLocaleString()} ({relativeTime(job.updated_at)})
                                                </span>
                                                <button type="button" aria-label="Refresh results" onClick={refresh} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
                                                    <RefreshCw size={16} />
                                                </button>
                                                <label className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground">
                                                    Sort by
                                                    <select className="bg-transparent font-medium text-foreground outline-none" value={sort} onChange={(e) => setSort(e.target.value)}>
                                                        <option value="matches">Relevance</option>
                                                        <option value="date">Start date</option>
                                                        <option value="name">Event name</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Result category">
                                        {(
                                            [
                                                ['strict', 'Strict Matches'],
                                                ['verification', 'Needs Verification'],
                                                ['excluded', 'Excluded'],
                                                ['saved', 'Saved'],
                                            ] as const
                                        )
                                            .filter(([key]) => key === 'saved' || job)
                                            .map(([key, label]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={category === key}
                                                    onClick={() => setCategory(key)}
                                                    className={`-mb-px border-b-2 px-3 py-3 text-sm ${category === key ? 'border-indigo-600 font-semibold text-foreground dark:border-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    {label} ({key === 'saved' ? saved.length : job!.results.filter((r) => r.category === key).length})
                                                </button>
                                            ))}
                                    </div>
                                    {!!selected.length && job && (
                                        <button type="button" className="workspace-action" onClick={() => prepareImport(job.id, job.results.filter((r) => selected.includes(r.id)))}>
                                            Review {selected.length} selected events for import
                                        </button>
                                    )}
                                    {visible.map(({ result, jobId }) => {
                                        const existing = portfolio.find((p) => sameEdition(result, p))
                                        const otherEdition =
                                            !existing && result.seriesKey
                                                ? portfolio.find((p) => p.metadata?.search?.seriesKey === result.seriesKey)
                                                : null
                                        const key = savedKey(jobId, result.id)
                                        return (
                                            <DiscoverResultCard
                                                key={key}
                                                result={result}
                                                active={details?.id === result.id && detailsJobId === jobId}
                                                tags={tagsFor(result)}
                                                selectable={category !== 'saved' && result.category !== 'excluded'}
                                                checked={selected.includes(result.id)}
                                                onCheck={(on) => setSelected((ids) => (on ? [...ids, result.id] : ids.filter((id) => id !== result.id)))}
                                                saved={savedKeys.has(key)}
                                                saving={savingIds.includes(key)}
                                                onToggleSave={() => toggleSave(jobId, result)}
                                                onOpen={() => openDetails(result, jobId)}
                                                onView={() => openView(result, jobId)}
                                                onImport={result.category !== 'excluded' && finishedJob(jobId) ? () => prepareImport(jobId, [result]) : undefined}
                                                imported={imported.includes(result.id)}
                                                existing={existing}
                                                otherEdition={otherEdition}
                                            />
                                        )
                                    })}
                                    {category === 'saved' && !saved.length && (
                                        <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
                                            No saved events yet. Use Save on a search result to keep it here.
                                        </p>
                                    )}
                                    {job && category !== 'saved' && !visible.length && (
                                        <div className="space-y-3 rounded-xl border border-border p-6">
                                            <p>
                                                {['queued', 'running'].includes(job.status) ? 'Still searching — no ' : 'No '}
                                                {category === 'strict' ? 'strict matches' : category === 'verification' ? 'results awaiting verification' : 'excluded results'}{' '}
                                                {['queued', 'running'].includes(job.status) ? 'confirmed yet.' : 'in this search.'}
                                            </p>
                                            {category === 'strict' && job.counts.verification > 0 && (
                                                <button type="button" className="workspace-secondary" onClick={() => setCategory('verification')}>Inspect missing evidence</button>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from(new Set(job.results.flatMap((r) => r.criteria.filter((c) => c.status === 'failed').map((c) => c.key)))).map((key) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        className="workspace-secondary"
                                                        disabled={running || busy}
                                                        onClick={() => {
                                                            const next = { ...job.criteria, mode: 'discover' as const }
                                                            if (key === 'dateRange') {
                                                                next.startDate = null
                                                                next.endDate = null
                                                            } else if (key === 'upcoming') next.includePast = true
                                                            else if (key === 'attendance') next.attendance = 'any'
                                                            else if (key === 'regions') next.regions = []
                                                            else if (key === 'country' || key === 'state' || key === 'city' || key === 'organizer' || key === 'audience') next[key] = ''
                                                            else if (key === 'topics') {
                                                                next.industries = []
                                                                next.technologies = []
                                                            } else if (key === 'includeAll' || key === 'includeAny' || key === 'exclude' || key === 'eventTypes') next[key] = []
                                                            else return
                                                            setCriteria(next)
                                                            void start(next)
                                                        }}
                                                    >
                                                        Relax {key} and search again
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </main>
                    </div>
                    </>
                )}
            </div>
            {panelOpen && details && (
                <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] min-h-0 overflow-hidden rounded-xl border border-border xl:block" aria-label="Field evidence">
                    <EvidencePanel key={`${detailsJobId}:${details.id}`} result={details} onClose={closeDetails} footer={evidenceFooter} />
                </aside>
            )}
            {!wide && <FieldEvidenceSheet key={details?.id ?? 'closed'} result={details} onClose={closeDetails} footer={evidenceFooter} />}
            {importTarget && (
                <SearchImportDialog
                    open
                    onClose={() => setImportTarget(null)}
                    results={importTarget.results}
                    portfolio={portfolio}
                    importing={importing}
                    onImport={importResults}
                    sameEdition={sameEdition}
                />
            )}
        </div>
    )
}
