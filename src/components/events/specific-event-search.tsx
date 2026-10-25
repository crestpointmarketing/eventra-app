'use client'

import { useState } from 'react'
import {
    AlertTriangle,
    Building2,
    CalendarDays,
    History,
    Link2,
    Loader2,
    MapPin,
    Search,
    Star,
    CircleDot,
    ExternalLink,
    CheckCircle2,
} from 'lucide-react'
import { SEARCH_STAGES, type SearchJob, type SearchResult } from '@/lib/events/search-contract'
import { localDateKey } from '@/lib/date-only'
import { EvidenceBadge } from './field-evidence-sheet'
import {
    EventThumb,
    officialSource,
    resultDates,
    resultLocation,
    safeUrl,
    SearchStepper,
    type StepState,
} from './search-ui'

const EXAMPLES = ['Web Summit 2026', 'HLTH', 'https://websummit.com']

// The five steps people see, each covering one or more real worker stages.
const STEPS: { label: string; stages: (typeof SEARCH_STAGES)[number][] }[] = [
    { label: 'Identify event', stages: ['Understanding criteria', 'Building search queries'] },
    { label: 'Find editions', stages: ['Finding candidate events'] },
    { label: 'Check official source', stages: ['Checking official sources'] },
    { label: 'Compare details', stages: ['Extracting event details', 'Applying required filters', 'Removing duplicates'] },
    { label: 'Ready for review', stages: ['Results ready'] },
]
export function specificSteps(job: SearchJob): { label: string; state: StepState }[] {
    const finished = job.status === 'completed' || job.status === 'warnings'
    const stopped = job.status === 'failed' || job.status === 'cancelled'
    const current = Math.max(0, STEPS.findIndex((s) => (s.stages as string[]).includes(job.stage)))
    return STEPS.map((step, index) => ({
        label: step.label,
        state: finished || index < current ? 'done' : index === current ? (stopped ? 'failed' : 'active') : 'pending',
    }))
}

export type EditionLabel = 'best' | 'past' | 'possible'
function ended(result: SearchResult, today: string) {
    const last = result.resolved.end_date.value ?? result.resolved.start_date.value
    return !!last && last < today
}
/** Candidate editions ranked for choosing: confirmed upcoming first, then other upcoming, then past editions. */
export function rankEditions(results: SearchResult[], today = localDateKey()) {
    const editions = results.filter((r) => !r.duplicateOf && r.category !== 'excluded')
    const rank = (r: SearchResult) => (ended(r, today) ? 2 : r.category === 'strict' ? 0 : 1)
    const sorted = editions.slice().sort((a, b) => {
        const byRank = rank(a) - rank(b)
        if (byRank) return byRank
        const ad = a.resolved.start_date.value ?? '9999', bd = b.resolved.start_date.value ?? '9999'
        return rank(a) === 2 ? bd.localeCompare(ad) : ad.localeCompare(bd)
    })
    return sorted.map((result, index) => ({
        result,
        label: (ended(result, today) ? 'past' : index === 0 && rank(result) === 0 ? 'best' : 'possible') as EditionLabel,
    }))
}

const LABELS: Record<EditionLabel, { text: string; icon: typeof Star; tone: string }> = {
    best: { text: 'Best match', icon: Star, tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
    past: { text: 'Past edition', icon: History, tone: 'bg-muted text-muted-foreground' },
    possible: { text: 'Possible match', icon: CircleDot, tone: 'bg-muted text-muted-foreground' },
}

export function SpecificEventSearch({
    job,
    busy,
    running,
    selectedId,
    onSearch,
    onCancel,
    onRetry,
    onSelect,
    onOpen,
    onContinue,
    onSearchAgain,
}: {
    job: SearchJob | undefined
    busy: boolean
    running: boolean
    selectedId: string | null
    onSearch: (text: string) => void
    onCancel: () => void
    onRetry: () => void
    onSelect: (result: SearchResult) => void
    onOpen: (result: SearchResult) => void
    onContinue: (result: SearchResult) => void
    onSearchAgain: () => void
}) {
    const [text, setText] = useState(job?.criteria.query || job?.criteria.pageUrl || '')
    const [showExcluded, setShowExcluded] = useState(false)
    const editions = job ? rankEditions(job.results) : []
    const excluded = job?.results.filter((r) => r.category === 'excluded' && !r.duplicateOf) ?? []
    const finished = job?.status === 'completed' || job?.status === 'warnings'
    const selected = editions.find((e) => e.result.id === selectedId)?.result ?? null
    const submit = (value = text) => {
        if (!value.trim()) return
        setText(value)
        onSearch(value.trim())
    }
    return (
        <div className="space-y-5">
            <header className="space-y-1">
                <h1 className="text-3xl font-semibold">Find a specific event</h1>
                <p className="text-muted-foreground">Enter an event name, organizer, or URL. We&apos;ll verify the correct edition using official sources.</p>
            </header>
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); submit() }}>
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-card px-4">
                    <Search size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    <input
                        aria-label="Event name, organizer or URL"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. AI Summit North America 2026"
                        maxLength={2000}
                        className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none"
                    />
                </label>
                <button type="submit" disabled={busy || running || !text.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                    {busy && <Loader2 size={16} className="animate-spin" />}Find event
                </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Examples:</span>
                {EXAMPLES.map((example) => (
                    <button key={example} type="button" disabled={busy || running} onClick={() => submit(example)} className="rounded-full bg-muted px-3 py-1.5 text-sm hover:bg-zinc-200 disabled:opacity-50 dark:hover:bg-zinc-700">
                        {example}
                    </button>
                ))}
            </div>

            {job && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-live="polite">
                    <SearchStepper label="Edition search progress" steps={specificSteps(job)} />
                    {job.error && <p role="alert" className="text-sm text-red-600">{job.error}</p>}
                    {job.warnings.map((w) => <p key={w} className="text-sm text-amber-700 dark:text-amber-300">{w}</p>)}
                    <div className="flex flex-wrap gap-2">
                        {running && <button type="button" className="workspace-secondary" onClick={onCancel}>Cancel search</button>}
                        {['failed', 'warnings'].includes(job.status) && <button type="button" className="workspace-secondary" disabled={running} onClick={onRetry}>Retry sources needing verification</button>}
                    </div>
                </section>
            )}

            {job && finished && editions.length > 1 && (
                <div role="status" className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <AlertTriangle size={18} className="shrink-0" />
                    Multiple editions found. Select the edition you want to review.
                </div>
            )}

            {job && (finished || editions.length > 0) && (
                <section className="space-y-3">
                    <h2 className="text-xl font-semibold">
                        {editions.length ? `We found ${editions.length} possible edition${editions.length === 1 ? '' : 's'}` : 'No matching edition found'}
                    </h2>
                    {!editions.length && finished && (
                        <p className="text-sm text-muted-foreground">
                            Try the exact event name, add the year, or paste the official event page URL.
                            {excluded.length > 0 && ' Some candidates were excluded; they are listed below.'}
                        </p>
                    )}
                    {editions.map(({ result, label }) => {
                        const meta = LABELS[label]
                        const official = officialSource(result)
                        const website = safeUrl(official?.url) ?? safeUrl(result.website_url)
                        const isSelected = selectedId === result.id
                        return (
                            <article key={result.id} className={`flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-border'}`}>
                                <button type="button" onClick={() => onOpen(result)} aria-label={`Show evidence for ${result.name}`} className="hidden shrink-0 sm:block">
                                    <EventThumb result={result} className="h-24 w-36" />
                                </button>
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <h3 className="break-words text-lg font-semibold">{result.resolved.name.value || result.name}</h3>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${meta.tone}`}><meta.icon size={13} />{meta.text}</span>
                                        {result.evidenceStatus !== 'Unverified' && <EvidenceBadge status={result.evidenceStatus} />}
                                        {result.category === 'verification' && <span className="text-amber-700 dark:text-amber-300">Needs verification</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{resultDates(result)}</span>
                                        <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{resultLocation(result)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                        <span className="inline-flex items-center gap-1.5"><Building2 size={15} className="text-muted-foreground" />{result.resolved.organizer.value || 'Organizer unknown'}</span>
                                        {website && (
                                            <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                                                <Link2 size={14} />{official ? 'Official event website' : 'Event page'}<ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2 sm:flex-col">
                                    {isSelected ? (
                                        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><CheckCircle2 size={16} />Selected</span>
                                    ) : label === 'best' ? (
                                        <button type="button" onClick={() => onSelect(result)} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Select edition</button>
                                    ) : (
                                        <button type="button" onClick={() => onSelect(result)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Select edition</button>
                                    )}
                                    <button type="button" onClick={() => onOpen(result)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">View details</button>
                                </div>
                            </article>
                        )
                    })}
                    {excluded.length > 0 && (
                        <div>
                            <button type="button" className="text-sm font-medium text-muted-foreground hover:text-foreground" aria-expanded={showExcluded} onClick={() => setShowExcluded(!showExcluded)}>
                                {showExcluded ? 'Hide' : 'Show'} {excluded.length} excluded candidate{excluded.length === 1 ? '' : 's'}
                            </button>
                            {showExcluded && (
                                <ul className="mt-2 space-y-2">
                                    {excluded.map((r) => (
                                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm">
                                            <span className="min-w-0"><span className="font-medium">{r.resolved.name.value || r.name}</span> <span className="text-muted-foreground">· {r.reasons[0] ?? 'Excluded'}</span></span>
                                            <button type="button" className="text-xs font-medium text-indigo-600 dark:text-indigo-300" onClick={() => onOpen(r)}>View details</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            )}

            {job && finished && (
                <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-3 border-t border-border bg-background/95 px-1 py-4 backdrop-blur">
                    <button type="button" onClick={onSearchAgain} className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted">Search again</button>
                    <button type="button" disabled={!selected} onClick={() => selected && onContinue(selected)} className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                        Continue to review
                    </button>
                </div>
            )}
        </div>
    )
}
