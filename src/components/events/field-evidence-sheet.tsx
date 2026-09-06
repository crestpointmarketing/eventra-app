'use client'
import { useState } from 'react'
import {
    CheckCircle2,
    AlertTriangle,
    CircleHelp,
    ExternalLink,
    FileText,
} from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
    SEARCH_FIELDS,
    type SearchResult,
    type SearchField,
    type ResolvedField,
} from '@/lib/events/search-contract'
const names: Partial<Record<SearchField, string>> = {
    name: 'Event name',
    start_date: 'Start date',
    end_date: 'End date',
    attendance: 'Attendance format',
    event_type: 'Event type',
    audience: 'Target audience',
    attendee_count: 'Published attendee count',
    ticket_price: 'Standard ticket price',
    ticket_currency: 'Ticket currency',
    sponsorship_price: 'Starting sponsorship price',
    sponsorship_currency: 'Sponsorship currency',
    participation_options: 'Published participation options',
    cfp_deadline: 'CFP deadline',
}
const unknown: ResolvedField = { value: null, status: 'unknown', evidence: [] }
function label(field: SearchField) {
    return (
        names[field] ||
        field.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase())
    )
}
function date(value: string | undefined) {
    return value ? new Date(value).toLocaleString() : 'Not checked'
}
export function EvidenceBadge({ status }: { status: string }) {
    const verified = status.toLowerCase() === 'verified'
    const empty = status.toLowerCase() === 'unknown'
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${verified ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : empty ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}
        >
            {verified ? (
                <CheckCircle2 size={13} />
            ) : empty ? (
                <CircleHelp size={13} />
            ) : (
                <AlertTriangle size={13} />
            )}
            <span className="capitalize">{status}</span>
        </span>
    )
}
export function FieldEvidenceSheet({
    result,
    onClose,
}: {
    result: SearchResult | null
    onClose: () => void
}) {
    const [status, setStatus] = useState('all')
    const [group, setGroup] = useState('all')
    const fields = SEARCH_FIELDS.filter(
        (field) =>
            group === 'all' ||
            (group === 'dates'
                ? field.includes('date') || field.endsWith('_deadline')
                : group === 'budget'
                  ? /price|currency/.test(field)
                  : group === 'identity'
                    ? [
                          'name',
                          'series',
                          'edition',
                          'organizer',
                          'country',
                          'state',
                          'city',
                          'attendance',
                          'event_type',
                      ].includes(field)
                    : [
                          'audience',
                          'attendee_count',
                          'language',
                          'participation_options',
                          'description',
                      ].includes(field)),
    )
    const verified = fields.filter(
        (field) => result?.resolved[field]?.status === 'verified',
    ).length
    const shown = fields.filter(
        (field) =>
            status === 'all' ||
            (status === 'verified'
                ? (result?.resolved[field] ?? unknown).status === 'verified'
                : (result?.resolved[field] ?? unknown).status !== 'verified'),
    )
    const allVerified = SEARCH_FIELDS.filter(
        (field) => result?.resolved[field]?.status === 'verified',
    ).length
    const official = result?.sources.find(
        (source) =>
            source.accessible &&
            source.identityVerified &&
            ['official_edition', 'organizer'].includes(source.kind) &&
            /^https?:\/\//i.test(source.url),
    )
    const pageUrl =
        official?.url ||
        (result?.website_url && /^https?:\/\//i.test(result.website_url)
            ? result.website_url
            : null)
    const latest = result?.sources
        .map((source) => source.checkedAt)
        .filter(Boolean)
        .sort()
        .at(-1)
    return (
        <Sheet open={!!result} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex h-dvh w-full flex-col gap-0 bg-white p-0 dark:bg-zinc-900 sm:max-w-xl">
                <SheetHeader className="shrink-0 px-5 pb-4 pt-5 text-left">
                    <SheetTitle>Field evidence</SheetTitle>
                    <SheetDescription className="pr-5 text-zinc-600 dark:text-zinc-300">
                        {result?.name}
                    </SheetDescription>
                </SheetHeader>
                {result && (
                    <>
                        <div className="shrink-0 space-y-3 border-b border-zinc-200 px-5 pb-4 dark:border-zinc-700">
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                                <div className="flex flex-wrap items-center gap-2">
                                    <EvidenceBadge
                                        status={result.evidenceStatus}
                                    />
                                    <span className="text-sm font-medium">
                                        {allVerified} of {SEARCH_FIELDS.length}{' '}
                                        fields confirmed
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Last checked {date(latest)}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div
                                    role="group"
                                    aria-label="Evidence status"
                                    className="flex gap-1"
                                >
                                    {[
                                        ['all', 'All', fields.length],
                                        ['verified', 'Verified', verified],
                                        [
                                            'review',
                                            'Needs review',
                                            fields.length - verified,
                                        ],
                                    ].map(([key, title, count]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={status === key}
                                            onClick={() =>
                                                setStatus(String(key))
                                            }
                                            className={`rounded-md border px-2 py-1.5 text-xs ${status === key ? 'border-lime-400 bg-lime-50 text-zinc-900' : 'border-zinc-200 dark:border-zinc-700'}`}
                                        >
                                            {title}{' '}
                                            <span className="rounded-full bg-zinc-100 px-1 text-zinc-600">
                                                {count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <select
                                    aria-label="Field group"
                                    className="min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                                    value={group}
                                    onChange={(e) => setGroup(e.target.value)}
                                >
                                    <option value="all">All fields</option>
                                    <option value="identity">
                                        Event details
                                    </option>
                                    <option value="dates">
                                        Dates & deadlines
                                    </option>
                                    <option value="budget">
                                        Prices & currency
                                    </option>
                                    <option value="audience">
                                        Audience & participation
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5">
                            {shown.map((field) => {
                                const current =
                                    result.resolved[field] ?? unknown
                                return (
                                    <section
                                        key={field}
                                        className="border-b border-zinc-200 py-4 dark:border-zinc-700"
                                    >
                                        <div className="flex items-start gap-3">
                                            <FileText
                                                size={17}
                                                className="mt-0.5 shrink-0 text-zinc-500"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-xs text-zinc-500">
                                                    {label(field)}
                                                </h3>
                                                <p className="mt-1 break-words text-sm font-semibold">
                                                    {current.value ?? 'Unknown'}
                                                </p>
                                            </div>
                                            <EvidenceBadge
                                                status={current.status}
                                            />
                                        </div>
                                        <div className="ml-7 mt-2 space-y-3">
                                            {current.status === 'conflict' && (
                                                <p className="text-xs text-amber-700">
                                                    Sources disagree. Each value
                                                    and its evidence are
                                                    retained below.
                                                </p>
                                            )}
                                            {!current.evidence.length && (
                                                <p className="text-xs text-zinc-500">
                                                    No supporting evidence
                                                    recorded.
                                                </p>
                                            )}
                                            {current.evidence.map(
                                                (e, index) => {
                                                    const source =
                                                        result.sources.find(
                                                            (s) =>
                                                                s.url ===
                                                                e.sourceUrl,
                                                        )
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="space-y-1 text-xs"
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="break-words">
                                                                    {e.value}
                                                                </span>
                                                                <EvidenceBadge
                                                                    status={
                                                                        e.status
                                                                    }
                                                                />
                                                            </div>
                                                            {/^https?:\/\//i.test(
                                                                e.sourceUrl,
                                                            ) && (
                                                                <a
                                                                    href={
                                                                        e.sourceUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex max-w-full items-center gap-1 text-blue-600"
                                                                >
                                                                    <span className="truncate">
                                                                        Source:{' '}
                                                                        {source?.identityVerified
                                                                            ? source.kind.replaceAll(
                                                                                  '_',
                                                                                  ' ',
                                                                              )
                                                                            : 'unconfirmed source'}
                                                                    </span>
                                                                    <ExternalLink
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                </a>
                                                            )}
                                                            <blockquote className="break-words rounded-md bg-zinc-100 px-3 py-2 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                                {e.quote}
                                                            </blockquote>
                                                            <p className="text-zinc-500">
                                                                Checked{' '}
                                                                {date(
                                                                    e.checkedAt,
                                                                )}
                                                            </p>
                                                        </div>
                                                    )
                                                },
                                            )}
                                        </div>
                                    </section>
                                )
                            })}
                            {!shown.length && (
                                <p className="py-8 text-center text-sm text-zinc-500">
                                    No fields in this filter.
                                </p>
                            )}
                            <details className="border-b border-zinc-200 py-4 dark:border-zinc-700">
                                <summary className="cursor-pointer text-sm font-semibold">
                                    Criteria & source checks
                                </summary>
                                <div className="mt-3 space-y-2 text-xs">
                                    {result.criteria.map((check, index) => (
                                        <p key={index}>
                                            {check.required === false
                                                ? 'Preferred'
                                                : 'Required'}{' '}
                                            · {check.status} — {check.label}
                                        </p>
                                    ))}
                                    {result.warnings.map((warning, index) => (
                                        <p
                                            key={index}
                                            className="text-amber-700"
                                        >
                                            {warning}
                                        </p>
                                    ))}
                                    {result.sources.map((source, index) => (
                                        <div
                                            key={index}
                                            className="space-y-1 border-t pt-2"
                                        >
                                            <p>
                                                {source.kind.replaceAll(
                                                    '_',
                                                    ' ',
                                                )}{' '}
                                                ·{' '}
                                                {source.accessible
                                                    ? 'Accessible'
                                                    : 'Unavailable'}
                                            </p>
                                            <p>{source.identityReason}</p>
                                            {/^https?:\/\//i.test(
                                                source.url,
                                            ) && (
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block break-all text-blue-600"
                                                >
                                                    {source.url}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-700">
                            {pageUrl ? (
                                <a
                                    href={pageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700"
                                >
                                    <ExternalLink size={14} />
                                    {official
                                        ? 'Open official website'
                                        : 'Open source page'}
                                </a>
                            ) : (
                                <span className="text-xs text-zinc-500">
                                    No source URL
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                            >
                                Done
                            </button>
                        </footer>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
