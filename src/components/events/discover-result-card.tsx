'use client'

import Link from 'next/link'
import {
    Bookmark,
    BookmarkCheck,
    Building2,
    CalendarDays,
    CalendarClock,
    ExternalLink,
    Globe2,
    Loader2,
    MapPin,
    Mic2,
    MoreVertical,
    ShieldCheck,
    Store,
    UsersRound,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SearchField, SearchResult } from '@/lib/events/search-contract'
import { EvidenceBadge } from './field-evidence-sheet'
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

const STATS: { field: SearchField; label: string; icon: typeof UsersRound; always?: boolean }[] = [
    { field: 'attendee_count', label: 'Expected attendees', icon: UsersRound, always: true },
    { field: 'country_count', label: 'Countries represented', icon: Globe2 },
    { field: 'speaker_count', label: 'Speakers', icon: Mic2 },
    { field: 'exhibitor_count', label: 'Exhibitors', icon: Store },
]
function statValue(result: SearchResult, field: SearchField) {
    const resolved = result.resolved[field]
    if (resolved?.status === 'conflict') return 'Conflicting reports'
    const value = resolved?.value
    return value && /^\d+$/.test(value) ? `${Number(value).toLocaleString('en-US')}+` : value || null
}

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
    /** Present when the result can be imported now. */
    onImport?: () => void
    imported: boolean
    existing?: { id: string; name: string } | null
    otherEdition?: { name: string; start_date: string | null } | null
}

export function DiscoverResultCard(props: ResultCardProps) {
    const { result } = props
    const f = result.resolved
    const official = officialSource(result)
    const website = safeUrl(official?.url) ?? safeUrl(result.website_url)
    const format = attendanceLabel(f.attendance.value)
    const stats = STATS.map((s) => ({ ...s, value: statValue(result, s.field) })).filter((s) => s.always || s.value)
    const checked = lastChecked(result)
    return (
        <article
            className={`rounded-xl border bg-card p-4 transition-colors ${props.active ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-border hover:border-zinc-300 dark:hover:border-zinc-600'}`}
        >
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
                <button type="button" onClick={props.onOpen} aria-label={`Show evidence for ${result.name}`} className="hidden shrink-0 self-start sm:block">
                    <EventThumb result={result} className="h-24 w-28 2xl:h-28 2xl:w-36" />
                </button>
                <div className="flex min-w-0 flex-1 flex-wrap gap-4">
                    <div className="min-w-0 flex-[1_1_18rem] space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                            <button type="button" onClick={props.onOpen} className="min-w-0 text-left">
                                <h3 className="break-words text-base font-semibold leading-snug hover:underline">{f.name.value || result.name}</h3>
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                                {website && (
                                    <a href={website} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-muted dark:text-indigo-300 md:inline-flex">
                                        <ExternalLink size={14} />View event
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={props.onToggleSave}
                                    disabled={props.saving}
                                    aria-pressed={props.saved}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-muted disabled:opacity-50 dark:text-indigo-300"
                                >
                                    {props.saving ? <Loader2 size={14} className="animate-spin" /> : props.saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                    {props.saved ? 'Saved' : 'Save'}
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button type="button" aria-label={`More actions for ${result.name}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                                            <MoreVertical size={16} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={props.onOpen}>View field evidence</DropdownMenuItem>
                                        {website && <DropdownMenuItem asChild><a href={website} target="_blank" rel="noopener noreferrer">Open event website</a></DropdownMenuItem>}
                                        {props.onImport && <DropdownMenuItem disabled={props.imported} onSelect={props.onImport}>{props.imported ? 'Imported' : 'Review for import'}</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <EvidenceBadge status={result.evidenceStatus} />
                            {f.event_type.value && <span className="rounded-md border border-border px-2 py-0.5 text-muted-foreground">{f.event_type.value}</span>}
                            {format && <span className="rounded-md border border-border px-2 py-0.5 text-muted-foreground">{format}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="shrink-0" />{resultDates(result)}</span>
                            <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="shrink-0" />{resultLocation(result)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="inline-flex items-center gap-1.5 text-foreground"><Building2 size={15} className="shrink-0 text-muted-foreground" />{f.organizer.value || 'Organizer unknown'}</span>
                            {official && <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck size={13} />Official source</span>}
                        </div>
                        {f.description.value && <p className="line-clamp-2 text-sm text-muted-foreground">{f.description.value}</p>}
                        {!!props.tags.length && (
                            <div className="flex flex-wrap gap-1.5">
                                {props.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>)}
                                {props.tags.length > 4 && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{props.tags.length - 4}</span>}
                            </div>
                        )}
                        {result.category !== 'strict' && !!result.reasons.length && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">{result.reasons.slice(0, 2).join(' · ')}</p>
                        )}
                        {props.existing && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Possible Portfolio duplicate: <Link href={`/events/${props.existing.id}`} className="underline">{props.existing.name}</Link>. Review before adding.
                            </p>
                        )}
                        {props.otherEdition && (
                            <p className="text-xs text-muted-foreground">
                                Another edition is already in My Events: {props.otherEdition.name} ({props.otherEdition.start_date ?? 'date unknown'}). This edition stays separate.
                            </p>
                        )}
                    </div>
                    <div className="grid max-w-full flex-[1_0_11rem] content-start gap-3 text-sm [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]">
                        {stats.map((s) => (
                            <div key={s.field} className="flex items-start gap-2.5">
                                <s.icon size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
                                <div>
                                    <p className={`font-semibold ${s.value ? 'text-foreground' : 'text-muted-foreground'}`}>{s.value ?? 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-start gap-2.5">
                            <CalendarClock size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
                            <div>
                                <p className="font-semibold text-foreground">Updated {relativeTime(checked)}</p>
                                <p className="text-xs text-muted-foreground">{official ? 'From official website' : 'From event page'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {props.onImport && (
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <button type="button" className="workspace-action" disabled={props.imported} onClick={props.onImport}>
                        {props.imported ? 'Imported' : 'Review for import'}
                    </button>
                </div>
            )}
        </article>
    )
}
