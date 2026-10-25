'use client'

import { useState } from 'react'
import { CalendarDays, Check, Loader2, X } from 'lucide-react'
import {
    SOURCE_PRIORITY,
    type SearchResult,
    type SearchSource,
} from '@/lib/events/search-contract'

export function relativeTime(iso: string | undefined | null, now = Date.now()) {
    if (!iso) return 'Not checked'
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return 'Not checked'
    const minutes = Math.max(0, Math.round((now - then) / 60000))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.round(hours / 24)
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
    return new Date(iso).toLocaleDateString()
}

const MONTH = { month: 'short', timeZone: 'UTC' } as const
function utc(value: string) {
    return new Date(value + 'T12:00:00Z')
}
/** "May 12–14, 2025", "Dec 30, 2026 – Jan 2, 2027" or "Date unknown". */
export function formatDateRange(start: string | null, end: string | null) {
    if (!start) return 'Date unknown'
    const s = utc(start)
    const sm = s.toLocaleDateString('en-US', MONTH)
    if (!end || end === start) return `${sm} ${s.getUTCDate()}, ${s.getUTCFullYear()}`
    const e = utc(end)
    const em = e.toLocaleDateString('en-US', MONTH)
    if (s.getUTCFullYear() !== e.getUTCFullYear())
        return `${sm} ${s.getUTCDate()}, ${s.getUTCFullYear()} – ${em} ${e.getUTCDate()}, ${e.getUTCFullYear()}`
    if (sm !== em) return `${sm} ${s.getUTCDate()} – ${em} ${e.getUTCDate()}, ${s.getUTCFullYear()}`
    return `${sm} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`
}
export function resultLocation(result: SearchResult) {
    const f = result.resolved
    if (f.attendance.value === 'online' && !f.city.value) return 'Online'
    return [f.city.value, f.state.value, f.country.value].filter(Boolean).join(', ') || 'Location unknown'
}
export function resultDates(result: SearchResult) {
    return formatDateRange(result.resolved.start_date.value, result.resolved.end_date.value)
}
export function attendanceLabel(value: string | null) {
    return value === 'in_person' ? 'In-person' : value === 'online' ? 'Virtual' : value === 'hybrid' ? 'Hybrid' : null
}
/** An accessible page whose ownership by the organizer was established. */
export function officialSource(result: SearchResult) {
    return result.sources.find(
        (s) => s.accessible && s.identityVerified && SOURCE_PRIORITY[s.kind] <= 2 && /^https?:\/\//i.test(s.url),
    )
}
export function sourceLabel(source: SearchSource | undefined) {
    if (!source) return 'From an unconfirmed source'
    if (source.identityVerified && source.kind === 'official_edition') return 'From official website'
    if (source.identityVerified && source.kind === 'organizer') return 'From organizer website'
    if (source.kind === 'third_party') return 'From third-party listing'
    return 'From event page'
}
export function lastChecked(result: SearchResult) {
    return result.sources.map((s) => s.checkedAt).filter(Boolean).sort().at(-1)
}
export function safeUrl(url: string | null | undefined) {
    return url && /^https?:\/\//i.test(url) ? url : null
}

/** The event's published preview image, or a dated placeholder when there is none or it fails to load. */
export function EventThumb({ result, className = '' }: { result: SearchResult; className?: string }) {
    const [failed, setFailed] = useState(false)
    const image = safeUrl(result.image_url)
    const start = result.resolved.start_date.value
    if (image && !failed)
        return (
            // External preview images are not optimised by next/image; no referrer is sent to the event site.
            <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`shrink-0 rounded-lg bg-muted object-cover ${className}`} />
        )
    return (
        <div aria-hidden="true" className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-700 dark:from-indigo-950 dark:to-slate-900 dark:text-indigo-300 ${className}`}>
            {start ? (
                <>
                    <span className="text-xs font-medium uppercase">{utc(start).toLocaleDateString('en-US', MONTH)}</span>
                    <span className="text-2xl font-semibold leading-tight">{utc(start).getUTCDate()}</span>
                    <span className="text-xs text-muted-foreground">{utc(start).getUTCFullYear()}</span>
                </>
            ) : (
                <CalendarDays className="h-6 w-6" />
            )}
        </div>
    )
}

export type StepState = 'done' | 'active' | 'pending' | 'failed'
/** A horizontal progress bar of real pipeline stages. */
export function SearchStepper({ steps, label }: { steps: { label: string; state: StepState }[]; label: string }) {
    const status = { done: 'Completed', active: 'In progress', pending: 'Pending', failed: 'Stopped' }
    return (
        <ol aria-label={label} className="grid gap-y-4" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((step, index) => (
                <li key={step.label} aria-current={step.state === 'active' ? 'step' : undefined} className="relative min-w-0 pr-2">
                    <div className="flex items-center">
                        <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                step.state === 'done'
                                    ? 'bg-green-600 text-white'
                                    : step.state === 'active'
                                      ? 'border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                                      : step.state === 'failed'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {step.state === 'done' ? <Check className="h-3.5 w-3.5" /> : step.state === 'failed' ? <X className="h-3.5 w-3.5" /> : step.state === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : index + 1}
                        </span>
                        {index < steps.length - 1 && <span className={`ml-2 h-px flex-1 ${step.state === 'done' ? 'bg-green-600' : 'bg-border'}`} aria-hidden="true" />}
                    </div>
                    <p className="mt-2 hidden text-[11px] font-medium leading-tight text-foreground sm:block">{step.label}</p>
                    <p className={`hidden text-[11px] sm:block ${step.state === 'done' ? 'text-green-700 dark:text-green-400' : step.state === 'active' ? 'text-indigo-600 dark:text-indigo-300' : step.state === 'failed' ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {status[step.state]}
                    </p>
                    <span className="sr-only sm:hidden">{step.label}: {status[step.state]}</span>
                </li>
            ))}
        </ol>
    )
}
