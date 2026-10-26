'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Bookmark,
    BookmarkCheck,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Loader2,
    MapPin,
    ShieldCheck,
    XCircle,
} from 'lucide-react'
import type { SearchField, SearchResult } from '@/lib/events/search-contract'
import {
    attendanceLabel,
    EventThumb,
    lastChecked,
    officialSource,
    relativeTime,
    resultDates,
    resultLocation,
    safeUrl,
} from './search-ui'

const STATS: { field: SearchField; label: string; always?: boolean }[] = [
    { field: 'speaker_count', label: 'Speakers', always: true },
    { field: 'country_count', label: 'Countries', always: true },
    { field: 'attendee_count', label: 'Attendees', always: true },
    { field: 'exhibitor_count', label: 'Exhibitors' },
]
function statValue(result: SearchResult, field: SearchField) {
    const resolved = result.resolved[field]
    if (resolved?.status === 'conflict') return 'Conflicting reports'
    const value = resolved?.value
    return value && /^\d+$/.test(value) ? `${Number(value).toLocaleString('en-US')}+` : value || null
}
const STATUS = {
    strict: { label: 'Strict match', icon: CheckCircle2, tone: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' },
    verification: { label: 'Edition needs review', icon: AlertCircle, tone: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
    excluded: { label: 'Excluded', icon: XCircle, tone: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' },
} as const
const EVIDENCE = {
    Verified: { label: 'Verified', tone: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200', quality: 'key fields are verified from official sources.' },
    Partial: { label: 'Partial evidence', tone: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200', quality: 'partial evidence; some fields require verification.' },
    Unverified: { label: 'Unverified', tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300', quality: 'no fields are confirmed by an official source yet.' },
} as const

export interface ResultCardProps {
    result: SearchResult
    active: boolean
    tags: string[]
    selectable: boolean
    checked: boolean
    onCheck: (checked: boolean) => void
    saved: boolean
    saving: boolean
    onToggleSave: () => void
    onOpen: () => void
    /** Opens the in-app event details page. */
    onView: () => void
    /** Present when the result can be imported now. */
    onImport?: () => void
    imported: boolean
    existing?: { id: string; name: string } | null
    otherEdition?: { name: string; start_date: string | null } | null
}

/** A compact search result: the facts needed to decide, with everything else behind "Show details". */
export function DiscoverResultCard(props: ResultCardProps) {
    const { result } = props
    const [open, setOpen] = useState(false)
    const f = result.resolved
    const official = officialSource(result)
    const website = safeUrl(official?.url) ?? safeUrl(result.website_url)
    const format = attendanceLabel(f.attendance.value)
    const kind = [props.tags[0] ?? f.event_type.value, format].filter(Boolean).join(' · ')
    const status = STATUS[result.category]
    const evidence = EVIDENCE[result.evidenceStatus]
    const stats = STATS.map((s) => ({ ...s, value: statValue(result, s.field) })).filter((s) => s.always || s.value)
    const organizer = [f.organizer.value, f.series.value && f.series.value !== f.name.value ? f.series.value : null].filter(Boolean).join(' — ')

    const saveButton = (
        <button
            type="button"
            onClick={props.onToggleSave}
            disabled={props.saving}
            aria-pressed={props.saved}
            aria-label={props.saved ? `Remove ${result.name} from saved` : `Save ${result.name}`}
            title={props.saved ? 'Saved' : 'Save'}
            className={`rounded-md p-1.5 hover:bg-muted disabled:opacity-50 ${props.saved ? 'text-indigo-600 dark:text-indigo-300' : 'text-muted-foreground'}`}
        >
            {props.saving ? <Loader2 size={17} className="animate-spin" /> : props.saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>
    )
    const title = (
        <button type="button" onClick={props.onView} className="min-w-0 text-left">
            <h3 className="break-words text-base font-semibold leading-snug hover:underline sm:text-lg">{f.name.value || result.name}</h3>
        </button>
    )
    const importState = props.imported ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400"><Check size={16} />Imported</span>
    ) : props.existing ? (
        <Link href={`/events/${props.existing.id}`} title="This edition is already in My Events" className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:underline dark:text-green-400"><Check size={16} />Imported</Link>
    ) : props.onImport ? (
        <button type="button" onClick={props.onImport} className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted">
            Review for import
        </button>
    ) : null

    return (
        <article className={`rounded-2xl border bg-card p-4 transition-colors sm:p-5 ${props.active ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-border'}`}>
            <div className="flex gap-4">
                {props.selectable && (
                    <input
                        type="checkbox"
                        aria-label={`Select ${result.name}`}
                        className="mt-1 size-4 shrink-0 accent-indigo-600"
                        disabled={props.imported}
                        checked={props.checked}
                        onChange={(e) => props.onCheck(e.target.checked)}
                    />
                )}
                <button type="button" onClick={props.onView} aria-label={`View ${result.name}`} className="hidden shrink-0 self-start sm:block">
                    <EventThumb result={result} className={open ? 'h-28 w-28 rounded-xl' : 'h-16 w-20'} />
                </button>
                {open ? (
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                            {title}
                            {saveButton}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className={`rounded-md px-2 py-0.5 text-sm font-medium ${evidence.tone}`}>{evidence.label}</span>
                            {format && <span className="text-muted-foreground">{format}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{resultDates(result)} · {resultLocation(result)}</p>
                        {organizer && <p className="text-xs text-muted-foreground">{organizer}</p>}
                    </div>
                ) : (
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                            {title}
                            <div className="flex shrink-0 items-center gap-1">
                                <button type="button" onClick={props.onView} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-indigo-600 hover:bg-muted dark:text-indigo-300">
                                    View event<ArrowRight size={15} />
                                </button>
                                {saveButton}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="shrink-0" />{resultDates(result)}</span>
                            <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="shrink-0" />{resultLocation(result)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                            {kind && <span className="text-muted-foreground">{kind}</span>}
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${status.tone}`}>
                                <status.icon size={14} />{status.label}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <button type="button" aria-expanded={false} onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-300">
                                Show details<ChevronDown size={15} />
                            </button>
                            {importState}
                        </div>
                    </div>
                )}
            </div>

            {open && (
                <>
                    <div className="mt-4 space-y-4 px-1 sm:px-4">
                        <section className="space-y-2">
                            <h4 className="text-sm font-semibold">About this event</h4>
                            <p className="text-sm text-foreground">{f.description.value || 'No published description found.'}</p>
                        </section>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                            {stats.map((s) => (
                                <div key={s.field} className="space-y-1">
                                    <p className="text-lg font-semibold">{s.value ?? 'Unknown'}</p>
                                    <p className="text-sm text-muted-foreground">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3 border-t border-border pt-4 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="inline-flex items-center gap-1.5">
                                    {official ? <><ShieldCheck size={14} />Official source</> : 'Unconfirmed source'}
                                </span>
                                <span>Updated {relativeTime(lastChecked(result))}</span>
                            </div>
                            <p>Data quality: {evidence.quality}</p>
                            {result.category !== 'strict' && !!result.reasons.length && (
                                <ul className="list-disc space-y-0.5 pl-5 text-amber-700 dark:text-amber-300">
                                    {result.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                                </ul>
                            )}
                            {props.existing && (
                                <p>Already in My Events as <Link href={`/events/${props.existing.id}`} className="underline">{props.existing.name}</Link>.</p>
                            )}
                            {props.otherEdition && (
                                <p>Another edition is already in My Events: {props.otherEdition.name} ({props.otherEdition.start_date ?? 'date unknown'}). This edition stays separate.</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <button type="button" onClick={props.onOpen} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">View field evidence</button>
                                {website && (
                                    <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline dark:text-indigo-300">
                                        {official ? 'Visit official website' : 'Visit event page'}<ArrowUpRight size={13} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" aria-expanded onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                                Hide details<ChevronUp size={16} />
                            </button>
                            <button type="button" onClick={props.onView} className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                                View event<ArrowRight size={16} />
                            </button>
                        </div>
                        {importState}
                    </div>
                </>
            )}
        </article>
    )
}
