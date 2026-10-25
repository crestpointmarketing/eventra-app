'use client'
import { useState } from 'react'
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    CircleHelp,
    CircleDashed,
    ExternalLink,
    MapPin,
    X,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { ResolvedField, SearchField, SearchResult } from '@/lib/events/search-contract'
import {
    EventThumb,
    lastChecked,
    officialSource,
    relativeTime,
    resultDates,
    resultLocation,
    safeUrl,
    sourceLabel,
} from './search-ui'

type Status = ResolvedField['status'] | 'partial'
const unknown: ResolvedField = { value: null, status: 'unknown', evidence: [] }

export function EvidenceBadge({ status }: { status: string }) {
    const key = status.toLowerCase()
    const tone =
        key === 'verified'
            ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
            : key === 'conflict'
              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
              : key === 'unknown'
                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
    const Icon = key === 'verified' ? CheckCircle2 : key === 'conflict' ? AlertTriangle : key === 'unknown' ? CircleHelp : CircleDashed
    const text =
        key === 'partial' || key === 'inferred' || key === 'unverified'
            ? key === 'partial' ? 'Partial evidence' : key === 'inferred' ? 'Inferred' : 'Unverified'
            : status.charAt(0).toUpperCase() + status.slice(1)
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>
            <Icon size={13} aria-hidden="true" />
            {text}
        </span>
    )
}

interface Row {
    id: string
    label: string
    fields: SearchField[]
    /** Rows that always show, even when nothing is known. */
    core?: boolean
    format?: (result: SearchResult) => string | null
}
const count = (field: SearchField) => (r: SearchResult) => {
    const v = r.resolved[field]?.value
    return v && /^\d+$/.test(v) ? Number(v).toLocaleString('en-US') + '+' : v ?? null
}
const ROWS: Row[] = [
    { id: 'name', label: 'Event name', fields: ['name'], core: true },
    { id: 'edition', label: 'Edition', fields: ['edition'] },
    { id: 'dates', label: 'Dates', fields: ['start_date', 'end_date'], core: true, format: (r) => (r.resolved.start_date.value ? resultDates(r) : null) },
    { id: 'location', label: 'Location', fields: ['city', 'state', 'country'], core: true, format: (r) => { const l = resultLocation(r); return l === 'Location unknown' ? null : l } },
    { id: 'organizer', label: 'Organizer', fields: ['organizer'], core: true },
    { id: 'description', label: 'Description', fields: ['description'], core: true },
    { id: 'attendees', label: 'Expected attendees', fields: ['attendee_count'], core: true, format: count('attendee_count') },
    { id: 'countries', label: 'Countries represented', fields: ['country_count'], format: count('country_count') },
    { id: 'speakers', label: 'Speakers', fields: ['speaker_count'], format: count('speaker_count') },
    { id: 'exhibitors', label: 'Exhibitors', fields: ['exhibitor_count'], format: count('exhibitor_count') },
    { id: 'format', label: 'Format', fields: ['attendance'], core: true, format: (r) => ({ in_person: 'In-person', online: 'Virtual', hybrid: 'Hybrid' })[r.resolved.attendance.value ?? ''] ?? r.resolved.attendance.value },
    { id: 'type', label: 'Event type', fields: ['event_type'], core: true },
    { id: 'audience', label: 'Target audience', fields: ['audience'] },
    { id: 'series', label: 'Series', fields: ['series'] },
    { id: 'language', label: 'Language', fields: ['language'] },
    { id: 'ticket', label: 'Standard ticket price', fields: ['ticket_price', 'ticket_currency'], format: (r) => r.resolved.ticket_price.value ? `${r.resolved.ticket_price.value} ${r.resolved.ticket_currency.value ?? ''}`.trim() : null },
    { id: 'sponsorship', label: 'Sponsorship from', fields: ['sponsorship_price', 'sponsorship_currency'], format: (r) => r.resolved.sponsorship_price.value ? `${r.resolved.sponsorship_price.value} ${r.resolved.sponsorship_currency.value ?? ''}`.trim() : null },
    { id: 'participation', label: 'Participation options', fields: ['participation_options'] },
    { id: 'cfp', label: 'CFP deadline', fields: ['cfp_deadline'] },
    { id: 'speaker_deadline', label: 'Speaker deadline', fields: ['speaker_deadline'] },
    { id: 'exhibitor_deadline', label: 'Exhibitor deadline', fields: ['exhibitor_deadline'] },
    { id: 'sponsor_deadline', label: 'Sponsor deadline', fields: ['sponsor_deadline'] },
    { id: 'registration_deadline', label: 'Registration deadline', fields: ['registration_deadline'] },
]

function rowStatus(fields: ResolvedField[]): Status {
    const statuses = fields.map((f) => f.status)
    if (statuses.includes('conflict')) return 'conflict'
    if (statuses.every((s) => s === 'verified')) return 'verified'
    if (statuses.every((s) => s === 'unknown')) return 'unknown'
    if (statuses.length === 1) return statuses[0]
    return 'partial'
}

function EvidenceRow({ result, row }: { result: SearchResult; row: Row }) {
    const [open, setOpen] = useState(false)
    // Location counts as verified when its known parts are verified; missing parts are simply absent.
    const known = row.fields.map((f) => result.resolved[f] ?? unknown)
    const relevant = row.id === 'location' ? known.filter((f) => f.status !== 'unknown') : known
    const status = relevant.length ? rowStatus(relevant) : 'unknown'
    const evidence = known.flatMap((f) => f.evidence)
    const conflictValues = status === 'conflict' ? [...new Set(evidence.map((e) => e.value))] : []
    const value = status === 'conflict' ? `${conflictValues.join(' · ')} (conflicting reports)` : (row.format ? row.format(result) : known[0].value) ?? 'Unknown'
    const sources = [...new Set(evidence.map((e) => e.sourceUrl))]
    const primary = result.sources.find((s) => s.url === sources[0])
    const checked = evidence.map((e) => e.checkedAt).filter(Boolean).sort().at(-1)
    return (
        <section className="border-b border-border py-4 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{row.label}</h3>
                <EvidenceBadge status={status} />
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className={`break-words text-sm ${row.id === 'description' ? 'line-clamp-3' : ''} ${value === 'Unknown' ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {!evidence.length ? 'No published evidence found' : sources.length > 1 ? `From ${sources.length} sources` : sourceLabel(primary)}
                    </p>
                </div>
                {checked && <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(checked)}</span>}
            </div>
            {!!evidence.length && (
                <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                    {open ? 'Hide evidence' : `Show evidence (${evidence.length})`}
                </button>
            )}
            {open && (
                <div className="mt-2 space-y-2">
                    {evidence.map((e, index) => (
                        <div key={index} className="space-y-1 rounded-md bg-muted p-2.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="break-words font-medium">{e.value}</span>
                                <EvidenceBadge status={e.status} />
                            </div>
                            <blockquote className="break-words text-muted-foreground">“{e.quote}”</blockquote>
                            {safeUrl(e.sourceUrl) && (
                                <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-indigo-600 dark:text-indigo-300">
                                    <span className="truncate">{e.sourceUrl}</span>
                                    <ExternalLink size={12} className="shrink-0" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

function SourcesList({ result }: { result: SearchResult }) {
    return (
        <div className="space-y-3 py-4">
            {result.sources.map((source, index) => (
                <div key={index} className="space-y-1 rounded-lg border border-border p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold capitalize text-foreground">{source.kind.replaceAll('_', ' ')}</span>
                        <EvidenceBadge status={source.identityVerified ? 'verified' : 'unverified'} />
                        {!source.accessible && <span className="text-red-600">Unavailable</span>}
                    </div>
                    <p className="text-muted-foreground">{source.identityReason}</p>
                    {safeUrl(source.url) && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="block break-all text-indigo-600 dark:text-indigo-300">{source.url}</a>
                    )}
                    <p className="text-muted-foreground">Checked {relativeTime(source.checkedAt)}</p>
                </div>
            ))}
            {!result.sources.length && <p className="text-sm text-muted-foreground">No sources were checked.</p>}
            {(!!result.criteria.length || !!result.warnings.length) && (
                <div className="space-y-1.5 rounded-lg border border-border p-3 text-xs">
                    <p className="font-semibold text-foreground">Match checks</p>
                    {result.criteria.map((check, index) => (
                        <p key={index} className={check.status === 'failed' ? 'text-red-600' : check.status === 'unknown' ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>
                            {check.required === false ? 'Preferred' : 'Required'} · {check.status} — {check.label}
                        </p>
                    ))}
                    {result.warnings.map((warning, index) => (
                        <p key={index} className="text-amber-700 dark:text-amber-300">{warning}</p>
                    ))}
                </div>
            )}
        </div>
    )
}

export function EvidencePanel({
    result,
    onClose,
    footer,
}: {
    result: SearchResult
    onClose?: () => void
    footer?: React.ReactNode
}) {
    const [tab, setTab] = useState<'fields' | 'sources'>('fields')
    const [filter, setFilter] = useState<'all' | 'verified' | 'review'>('all')
    const rows = ROWS.filter((row) => row.core || row.fields.some((f) => (result.resolved[f] ?? unknown).status !== 'unknown'))
    const rowVerified = (row: Row) => row.fields.every((f) => (result.resolved[f] ?? unknown).status === 'verified')
    const shown = rows.filter((row) => filter === 'all' || (filter === 'verified') === rowVerified(row))
    const official = officialSource(result)
    const page = safeUrl(official?.url) ?? safeUrl(result.website_url)
    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Field Evidence</h2>
                {onClose && (
                    <button type="button" aria-label="Close field evidence" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                        <X size={18} />
                    </button>
                )}
            </div>
            <div className="flex shrink-0 gap-3 px-5 pt-4">
                <EventThumb result={result} className="h-20 w-20" />
                <div className="min-w-0 space-y-1">
                    <p className="break-words font-semibold leading-snug">{result.resolved.name.value || result.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays size={14} className="shrink-0" />{resultDates(result)}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={14} className="shrink-0" />{resultLocation(result)}</p>
                </div>
            </div>
            <div className="mt-3 flex shrink-0 border-b border-border px-5" role="tablist">
                {([['fields', 'Field Evidence'], ['sources', `Raw Sources (${result.sources.length})`]] as const).map(([key, title]) => (
                    <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2.5 text-sm ${tab === key ? 'border-indigo-600 font-semibold text-foreground dark:border-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        {title}
                    </button>
                ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
                {tab === 'fields' ? (
                    <>
                        <div className="flex flex-wrap items-center gap-1.5 pt-3 text-xs" role="group" aria-label="Evidence status">
                            {([['all', 'All'], ['verified', 'Verified'], ['review', 'Needs review']] as const).map(([key, title]) => (
                                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full border px-2.5 py-1 ${filter === key ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>
                                    {title} {key === 'all' ? rows.length : key === 'verified' ? rows.filter(rowVerified).length : rows.length - rows.filter(rowVerified).length}
                                </button>
                            ))}
                            <span className="ml-auto text-muted-foreground">Checked {relativeTime(lastChecked(result))}</span>
                        </div>
                        {shown.map((row) => <EvidenceRow key={row.id} result={result} row={row} />)}
                        {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">No fields in this filter.</p>}
                        {page && (
                            <section className="border-t border-border py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold">{official ? 'Official website' : 'Event page'}</h3>
                                    <EvidenceBadge status={official ? 'verified' : 'unverified'} />
                                </div>
                                <a href={page} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex max-w-full items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300">
                                    <span className="truncate">{page.replace(/^https?:\/\//, '')}</span>
                                    <ExternalLink size={13} className="shrink-0" />
                                </a>
                            </section>
                        )}
                    </>
                ) : (
                    <SourcesList result={result} />
                )}
            </div>
            <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
                {tab === 'fields' && (
                    <button type="button" onClick={() => setTab('sources')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted">
                        View all sources ({result.sources.length})
                        <ExternalLink size={14} />
                    </button>
                )}
                {footer}
            </div>
        </div>
    )
}

/** Field evidence as a drawer, for screens without room for the side panel. */
export function FieldEvidenceSheet({
    result,
    onClose,
    footer,
}: {
    result: SearchResult | null
    onClose: () => void
    footer?: React.ReactNode
}) {
    return (
        <Sheet open={!!result} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="h-dvh w-full gap-0 p-0 sm:max-w-md [&>button]:hidden">
                <SheetTitle className="sr-only">Field evidence</SheetTitle>
                <SheetDescription className="sr-only">{result?.name}</SheetDescription>
                {result && <EvidencePanel result={result} onClose={onClose} footer={footer} />}
            </SheetContent>
        </Sheet>
    )
}
