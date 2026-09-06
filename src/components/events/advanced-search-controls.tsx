'use client'
import { Target, Users, CalendarDays, Banknote, Building2 } from 'lucide-react'
import {
    type SearchCriteria,
    type AdvancedSearch,
} from '@/lib/events/search-contract'
const input =
    'w-full min-w-0 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'
export function countAdvancedValues(a: AdvancedSearch) {
    return (
        Number(a.objectives.length > 0) +
        Number(a.attendeeMin !== null || a.attendeeMax !== null) +
        Number(!!a.language) +
        Number(a.ticketMin !== null || a.ticketMax !== null) +
        Number(a.sponsorshipMin !== null || a.sponsorshipMax !== null) +
        Number(a.deadlineTypes.length > 0)
    )
}
export function AdvancedSearchControls({
    criteria,
    onChange,
}: {
    criteria: SearchCriteria
    onChange: (value: SearchCriteria) => void
}) {
    const a = criteria.advanced
    const update = (patch: Partial<AdvancedSearch>) =>
        onChange({ ...criteria, advanced: { ...a, ...patch } })
    const rule = (
        key:
            | 'organizerRule'
            | 'audienceRule'
            | 'sizeRule'
            | 'budgetRule'
            | 'deadlineRule',
        label: string,
    ) => (
        <div
            role="group"
            aria-label={`${label} strength`}
            className="flex rounded-md border border-zinc-200 text-xs dark:border-zinc-700"
        >
            {(['prefer', 'require'] as const).map((value) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={a[key] === value}
                    className={`rounded px-3 py-1.5 ${a[key] === value ? 'bg-lime-100 text-zinc-900' : 'text-zinc-500'}`}
                    onClick={() => update({ [key]: value })}
                >
                    {value === 'prefer' ? 'Prefer' : 'Require'}
                </button>
            ))}
        </div>
    )
    const range = (
        label: string,
        min: 'attendeeMin' | 'ticketMin' | 'sponsorshipMin',
        max: 'attendeeMax' | 'ticketMax' | 'sponsorshipMax',
    ) => (
        <fieldset className="space-y-1">
            <legend className="text-sm">{label}</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input
                    aria-label={`${label} minimum`}
                    type="number"
                    min="0"
                    step={min === 'attendeeMin' ? '1' : '0.01'}
                    className={input}
                    placeholder="Min"
                    value={a[min] ?? ''}
                    onChange={(e) =>
                        update({
                            [min]:
                                e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                        })
                    }
                />
                <span>–</span>
                <input
                    aria-label={`${label} maximum`}
                    type="number"
                    min="0"
                    step={min === 'attendeeMin' ? '1' : '0.01'}
                    className={input}
                    placeholder="Max"
                    value={a[max] ?? ''}
                    onChange={(e) =>
                        update({
                            [max]:
                                e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                        })
                    }
                />
            </div>
        </fieldset>
    )
    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {(['prefer', 'require'] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                        onClick={() =>
                            update({
                                organizerRule: value,
                                audienceRule: value,
                                sizeRule: value,
                                budgetRule: value,
                                deadlineRule: value,
                            })
                        }
                    >
                        {value === 'prefer' ? 'Prefer all' : 'Require all'}
                    </button>
                ))}
            </div>
            <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Target size={16} />
                    Business objective{' '}
                    <span className="ml-auto text-xs font-normal text-zinc-500">
                        Preference only
                    </span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {(['attend', 'exhibit', 'sponsor', 'speak'] as const).map(
                        (goal) => (
                            <button
                                key={goal}
                                type="button"
                                aria-pressed={a.objectives.includes(goal)}
                                className={`rounded-md border px-2 py-2 text-xs capitalize ${a.objectives.includes(goal) ? 'border-lime-400 bg-lime-50 text-zinc-900' : 'border-zinc-200 dark:border-zinc-700'}`}
                                onClick={() =>
                                    update({
                                        objectives: a.objectives.includes(goal)
                                            ? a.objectives.filter(
                                                  (v) => v !== goal,
                                              )
                                            : [...a.objectives, goal],
                                    })
                                }
                            >
                                {goal}
                            </button>
                        ),
                    )}
                </div>
                <p className="text-xs text-zinc-500">
                    Uses published participation options for sorting. Does not
                    infer that places or applications are still available.
                </p>
            </section>
            <section className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 size={16} />
                    Organization & audience
                </h3>
                <div className="flex items-center justify-between gap-2 text-sm">
                    Organizer {rule('organizerRule', 'Organizer')}
                </div>
                <input
                    aria-label="Organizer"
                    className={input}
                    placeholder="Any organizer"
                    value={criteria.organizer}
                    onChange={(e) =>
                        onChange({ ...criteria, organizer: e.target.value })
                    }
                />
                <div className="flex items-center justify-between gap-2 text-sm">
                    Target audience {rule('audienceRule', 'Audience')}
                </div>
                <input
                    aria-label="Target audience"
                    className={input}
                    placeholder="e.g. Hospital CIOs"
                    value={criteria.audience}
                    onChange={(e) =>
                        onChange({ ...criteria, audience: e.target.value })
                    }
                />
                <label className="flex items-center gap-2 text-xs">
                    <input
                        type="checkbox"
                        className="size-4 accent-lime-600"
                        checked={a.officiallyStatedAudience}
                        onChange={(e) =>
                            update({
                                officiallyStatedAudience: e.target.checked,
                            })
                        }
                    />
                    Officially stated audience only
                </label>
                <p className="text-xs text-zinc-500">
                    Required audience checks always need official evidence. When
                    preferred, you may also allow inferred audiences.
                </p>
            </section>
            <section className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Users size={16} />
                        Event size & language
                    </h3>
                    {rule('sizeRule', 'Size and language')}
                </div>
                {range(
                    'Published attendee count',
                    'attendeeMin',
                    'attendeeMax',
                )}
                <label className="block space-y-1 text-sm">
                    <span>Language</span>
                    <input
                        className={input}
                        list="event-language-options"
                        placeholder="Any language"
                        value={a.language}
                        onChange={(e) => update({ language: e.target.value })}
                    />
                </label>
                <datalist id="event-language-options">
                    {[
                        'English',
                        'French',
                        'Spanish',
                        'German',
                        'Chinese',
                        'Japanese',
                        'Arabic',
                    ].map((v) => (
                        <option key={v} value={v} />
                    ))}
                </datalist>
            </section>
            <section className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Banknote size={16} />
                        Budget
                    </h3>
                    {rule('budgetRule', 'Budget')}
                </div>
                <label className="block space-y-1 text-sm">
                    <span>Currency</span>
                    <select
                        className={input}
                        value={a.currency}
                        onChange={(e) =>
                            update({
                                currency: e.target
                                    .value as AdvancedSearch['currency'],
                            })
                        }
                    >
                        {[
                            'USD',
                            'CAD',
                            'EUR',
                            'GBP',
                            'AUD',
                            'JPY',
                            'SGD',
                            'AED',
                        ].map((v) => (
                            <option key={v}>{v}</option>
                        ))}
                    </select>
                </label>
                {range('Standard ticket price', 'ticketMin', 'ticketMax')}
                {range(
                    'Starting sponsorship price',
                    'sponsorshipMin',
                    'sponsorshipMax',
                )}
                <p className="text-xs text-zinc-500">
                    Uses published general-admission and starting sponsorship
                    prices. No estimated prices or currency conversion. Unknown
                    prices stay eligible when preferred.
                </p>
            </section>
            <section className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays size={16} />
                        Deadlines
                    </h3>
                    {rule('deadlineRule', 'Deadlines')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {(
                        [
                            'cfp',
                            'speaker',
                            'exhibitor',
                            'sponsor',
                            'registration',
                        ] as const
                    ).map((type) => (
                        <label
                            key={type}
                            className="flex items-center gap-2 text-xs"
                        >
                            <input
                                type="checkbox"
                                className="size-4 accent-lime-600"
                                checked={a.deadlineTypes.includes(type)}
                                onChange={(e) =>
                                    update({
                                        deadlineTypes: e.target.checked
                                            ? [...a.deadlineTypes, type]
                                            : a.deadlineTypes.filter(
                                                  (v) => v !== type,
                                              ),
                                        deadlineAfter:
                                            !e.target.checked &&
                                            a.deadlineTypes.length === 1
                                                ? null
                                                : a.deadlineAfter,
                                    })
                                }
                            />
                            {type === 'cfp'
                                ? 'CFP'
                                : type[0].toUpperCase() + type.slice(1)}
                        </label>
                    ))}
                </div>
                <label className="block space-y-1 text-sm">
                    <span>Deadline on or after</span>
                    <input
                        type="date"
                        className={input}
                        value={a.deadlineAfter || ''}
                        onChange={(e) =>
                            update({ deadlineAfter: e.target.value || null })
                        }
                    />
                </label>
                <p className="text-xs text-zinc-500">
                    Defaults to today when a deadline type is selected. Each
                    selected type is checked separately.
                </p>
            </section>
        </>
    )
}
