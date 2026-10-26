'use client'

import { ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck, ShieldCheck } from 'lucide-react'
import type { SearchField, SearchResult } from '@/lib/events/search-contract'
import {
    attendanceLabel,
    formatDateRange,
    lastChecked,
    officialSource,
    relativeTime,
    resultLocation,
    safeUrl,
} from './search-ui'

const EVIDENCE = {
    Verified: { label: 'Verified', tone: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' },
    Partial: { label: 'Partial evidence', tone: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200' },
    Unverified: { label: 'Unverified', tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
} as const

function count(result: SearchResult, field: SearchField) {
    const resolved = result.resolved[field]
    if (resolved?.status === 'conflict') return 'Conflicting reports'
    const value = resolved?.value
    return value && /^\d+$/.test(value) ? `${Number(value).toLocaleString('en-US')}+` : value || null
}
function longDates(result: SearchResult) {
    const { start_date, end_date } = result.resolved
    if (!start_date.value) return 'Date unknown'
    // Same format as the cards, with the month spelled out for the header.
    return formatDateRange(start_date.value, end_date.value).replace(
        /^([A-Z][a-z]{2})/,
        (m) => new Date(`${start_date.value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) || m,
    )
}

/** A search result shown as an event page, before it is imported. */
export function SearchResultDetails({
    result,
    onBack,
    onEvidence,
    onImport,
    imported,
    saved,
    onToggleSave,
}: {
    result: SearchResult
    onBack: () => void
    onEvidence: () => void
    onImport?: () => void
    imported: boolean
    saved: boolean
    onToggleSave: () => void
}) {
    const f = result.resolved
    const official = officialSource(result)
    const website = safeUrl(official?.url) ?? safeUrl(result.website_url)
    const evidence = EVIDENCE[result.evidenceStatus]
    const kind = [f.event_type.value, attendanceLabel(f.attendance.value)].filter(Boolean).join(' · ')
    const rows: [string, string | null][] = [
        ['Date', f.start_date.value ? formatDateRange(f.start_date.value, f.end_date.value) : 'Unknown'],
        ['Location', resultLocation(result) === 'Location unknown' ? 'Unknown' : resultLocation(result)],
        ['Organizer', f.organizer.value || 'Unknown'],
        ['Speakers', count(result, 'speaker_count') ?? 'Unknown'],
        ['Attendees', count(result, 'attendee_count') ?? 'Unknown'],
        ['Countries', count(result, 'country_count')],
        ['Exhibitors', count(result, 'exhibitor_count')],
        ['Audience', f.audience.value],
        ['Language', f.language.value],
    ]
    return (
        <article className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft size={16} />Back to events
            </button>
            <header className="space-y-2 rounded-xl bg-[#241539] px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-wide text-violet-200">Event details</p>
                <h2 className="break-words text-xl font-semibold">{f.name.value || result.name}</h2>
                <p className="text-sm text-violet-100">{longDates(result)} · {resultLocation(result)}</p>
            </header>
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-md px-2 py-0.5 font-medium ${evidence.tone}`}>{evidence.label}</span>
                {kind && <span className="text-muted-foreground">{kind}</span>}
            </div>
            <section className="space-y-2 border-b border-border pb-5">
                <h3 className="text-base font-semibold">Overview</h3>
                <p className="text-foreground">{f.description.value || 'No published description found.'}</p>
            </section>
            <section className="space-y-2 border-b border-border pb-5">
                <h3 className="text-base font-semibold">Event information</h3>
                <dl className="divide-y divide-border text-sm">
                    {rows.filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
                            <dt className="font-medium">{label}</dt>
                            <dd className={value === 'Unknown' ? 'text-muted-foreground' : ''}>{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <section className="space-y-2 border-b border-border pb-5">
                <h3 className="text-base font-semibold">Agenda &amp; speakers</h3>
                <p className="text-sm text-muted-foreground">Detailed agenda, session schedule and speaker profiles have not yet been verified.</p>
            </section>
            <section className="space-y-1.5">
                <h3 className="text-base font-semibold">Sources &amp; verification</h3>
                <p className="inline-flex items-center gap-1.5 text-sm">
                    {official && <ShieldCheck size={15} className="text-muted-foreground" />}
                    {official ? 'Official source identified' : 'Official source not confirmed'} · {evidence.label}
                </p>
                <p className="text-sm text-muted-foreground">Last updated {relativeTime(lastChecked(result))}</p>
                {result.category !== 'strict' && !!result.reasons.length && (
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700 dark:text-amber-300">
                        {result.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                )}
                <button type="button" onClick={onEvidence} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300">View field evidence</button>
            </section>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button type="button" onClick={onToggleSave} aria-pressed={saved} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                    {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{saved ? 'Saved' : 'Save'}
                </button>
                {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                        {official ? 'Visit official website' : 'Visit event page'}<ArrowUpRight size={16} />
                    </a>
                )}
                {imported ? (
                    <span className="text-sm text-green-700 dark:text-green-400">Imported</span>
                ) : onImport ? (
                    <button type="button" onClick={onImport} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Review for import</button>
                ) : null}
            </div>
        </article>
    )
}
