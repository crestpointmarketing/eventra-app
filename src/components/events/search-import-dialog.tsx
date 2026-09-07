'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
    Target,
    ListChecks,
    MapPin,
    CalendarDays,
    Database,
    Loader2,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { EvidenceBadge } from './field-evidence-sheet'
import { buildDefaultEventTasks } from '@/lib/events/default-tasks'
import type { SearchResult } from '@/lib/events/search-contract'
export interface ImportPortfolioItem {
    id: string
    name: string
    start_date: string | null
    website_url: string | null
    metadata: { search?: { editionKey?: string; seriesKey?: string } } | null
}
export function SearchImportDialog({
    open,
    onClose,
    results,
    portfolio,
    importing,
    onImport,
    sameEdition,
}: {
    open: boolean
    onClose: () => void
    results: SearchResult[]
    portfolio: ImportPortfolioItem[]
    importing: boolean
    onImport: (destination: 'queue' | 'portfolio', tasks: boolean) => void
    sameEdition: (result: SearchResult, item: ImportPortfolioItem) => boolean
}) {
    const eligible =
        results.length === 1 &&
        results[0].resolved.name.status === 'verified' &&
        !!results[0].resolved.event_type.value
    const [destination, setDestination] = useState<'queue' | 'portfolio'>(
        eligible ? 'portfolio' : 'queue',
    )
    const [createTasks, setCreateTasks] = useState(false)
    const selected = results[0]
    const tasks = buildDefaultEventTasks(
        '',
        selected?.resolved.start_date.status === 'verified'
            ? selected.resolved.start_date.value
            : null,
    )
    const currentDestination = eligible ? destination : 'queue'
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => !value && !importing && onClose()}
        >
            <DialogContent
                className="flex max-h-[92dvh] w-[calc(100%-24px)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
                onEscapeKeyDown={(event) => {
                    if (importing) event.preventDefault()
                }}
                onInteractOutside={(event) => {
                    if (importing) event.preventDefault()
                }}
            >
                <DialogHeader className="shrink-0 border-b border-zinc-200 px-5 py-5 text-left dark:border-zinc-700">
                    <DialogTitle className="text-xl">
                        Review for import
                    </DialogTitle>
                    <DialogDescription>
                        Confirm the selected events and choose how they should
                        be added.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    {results.map((result) => (
                        <section
                            key={result.id}
                            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="break-words text-base font-semibold">
                                        {result.resolved.name.value ||
                                            result.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {result.resolved.organizer.value ||
                                            'Organizer unknown'}
                                    </p>
                                    <p className="mt-2 flex items-start gap-1.5 text-xs text-zinc-500">
                                        <CalendarDays
                                            size={13}
                                            className="shrink-0"
                                        />
                                        {result.resolved.start_date.value ||
                                            'Date unknown'}{' '}
                                        —{' '}
                                        {result.resolved.end_date.value ||
                                            'Date unknown'}
                                    </p>
                                    <p className="mt-1 flex items-start gap-1.5 text-xs text-zinc-500">
                                        <MapPin
                                            size={13}
                                            className="shrink-0"
                                        />
                                        {[
                                            result.resolved.city.value,
                                            result.resolved.country.value,
                                        ]
                                            .filter(Boolean)
                                            .join(', ') ||
                                            'Location unknown'}{' '}
                                        ·{' '}
                                        {result.resolved.attendance.value?.replaceAll(
                                            '_',
                                            ' ',
                                        ) || 'Format unknown'}
                                    </p>
                                </div>
                                <div className="space-y-2 text-right">
                                    <EvidenceBadge
                                        status={result.evidenceStatus}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {result.unknownCount} unconfirmed fields
                                    </p>
                                </div>
                            </div>
                        </section>
                    ))}
                    <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <Target size={17} />
                            Duplicate check
                        </h3>
                        {results.map((result) => {
                            const matches = portfolio.filter((item) =>
                                sameEdition(result, item),
                            )
                            const other = portfolio.filter(
                                (item) =>
                                    result.seriesKey &&
                                    item.metadata?.search?.seriesKey ===
                                        result.seriesKey &&
                                    !sameEdition(result, item),
                            )
                            return (
                                <div
                                    key={result.id}
                                    className="space-y-1 pl-6 text-sm"
                                >
                                    {results.length > 1 && (
                                        <p className="font-medium">
                                            {result.name}
                                        </p>
                                    )}
                                    <p
                                        className={
                                            matches.length
                                                ? 'text-amber-700'
                                                : 'text-zinc-700 dark:text-zinc-200'
                                        }
                                    >
                                        {matches.length
                                            ? 'Potential Portfolio match found'
                                            : 'No matching event found in the current Portfolio check'}
                                    </p>
                                    {matches.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/events/${item.id}`}
                                            target="_blank"
                                            className="block text-xs text-blue-600"
                                        >
                                            Review existing event: {item.name}
                                        </Link>
                                    ))}
                                    {other.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/events/${item.id}`}
                                            target="_blank"
                                            className="block text-xs text-blue-600"
                                        >
                                            Another edition exists: {item.name}{' '}
                                            ({item.start_date || 'Date unknown'}
                                            )
                                        </Link>
                                    ))}
                                </div>
                            )
                        })}
                        <p className="pl-6 text-xs text-zinc-500">
                            Exact known editions are skipped by the server.
                            Possible legacy matches require review; different
                            editions stay separate.
                        </p>
                    </section>
                    <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <Database size={17} />
                            Import destination
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    {
                                        id: 'portfolio',
                                        title: 'Add as a new event',
                                        description:
                                            'Add to the team Portfolio.',
                                    },
                                    {
                                        id: 'queue',
                                        title: 'Add to Review Queue',
                                        description:
                                            'Review details before adding to the Portfolio.',
                                    },
                                ] as const
                            ).map((option) => (
                                <label
                                    key={option.id}
                                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${currentDestination === option.id ? 'border-lime-500 bg-lime-50 text-zinc-900' : 'border-zinc-200 dark:border-zinc-700'} ${option.id === 'portfolio' && !eligible ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="search-import-destination"
                                        value={option.id}
                                        className="mt-0.5 accent-lime-600"
                                        checked={
                                            currentDestination === option.id
                                        }
                                        disabled={
                                            importing ||
                                            (option.id === 'portfolio' &&
                                                !eligible)
                                        }
                                        onChange={() => {
                                            setDestination(option.id)
                                            setCreateTasks(false)
                                        }}
                                    />
                                    <span>
                                        <span className="block text-sm font-medium">
                                            {option.title}
                                        </span>
                                        <span className="mt-1 block text-xs text-zinc-500">
                                            {option.description}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {!eligible && (
                            <p className="text-xs text-zinc-500">
                                Batch selections and events with unconfirmed
                                names or missing types go through Review Queue
                                first.
                            </p>
                        )}
                    </section>
                    <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <ListChecks size={17} />
                            Starter tasks
                        </h3>
                        {currentDestination === 'portfolio' ? (
                            <>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-lime-600"
                                        checked={createTasks}
                                        disabled={importing}
                                        onChange={(event) =>
                                            setCreateTasks(event.target.checked)
                                        }
                                    />
                                    Create {tasks.length} starter tasks
                                </label>
                                <p className="text-xs text-zinc-500">
                                    {selected?.resolved.start_date.status ===
                                    'verified'
                                        ? 'Task dates are scheduled from the confirmed event start date.'
                                        : 'Event start date is unconfirmed; tasks will have no due dates.'}{' '}
                                    Skipped duplicates create no tasks.
                                </p>
                                <details>
                                    <summary className="cursor-pointer text-xs font-medium text-blue-600">
                                        Preview {tasks.length} tasks
                                    </summary>
                                    <ul className="mt-3 space-y-2">
                                        {tasks.map((task) => (
                                            <li
                                                key={task.title}
                                                className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 pb-2 text-xs dark:border-zinc-800"
                                            >
                                                <span>{task.title}</span>
                                                <span className="text-zinc-500">
                                                    {task.due_date ||
                                                        'Unscheduled'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                Review Queue imports create no tasks.
                            </p>
                        )}
                    </section>
                </div>
                <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-700">
                    <span className="text-xs font-medium">
                        {results.length} event{results.length === 1 ? '' : 's'}{' '}
                        selected
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                            disabled={importing}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        {currentDestination === 'portfolio' && createTasks && (
                            <button
                                type="button"
                                className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                                disabled={importing}
                                onClick={() => onImport('portfolio', false)}
                            >
                                Import without tasks
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={importing || !results.length}
                            onClick={() =>
                                onImport(
                                    currentDestination,
                                    currentDestination === 'portfolio' &&
                                        createTasks,
                                )
                            }
                            className="workspace-action"
                        >
                            {importing && (
                                <Loader2 size={14} className="animate-spin" />
                            )}
                            {currentDestination === 'queue'
                                ? 'Add to Review Queue'
                                : createTasks
                                  ? `Import & create ${tasks.length} tasks`
                                  : 'Import without tasks'}
                        </button>
                    </div>
                </footer>
            </DialogContent>
        </Dialog>
    )
}
