'use client'

import { useState, type ReactNode } from 'react'
import {
    CalendarDays,
    MapPin,
    Building2,
    Cpu,
    Tags,
    Users,
    SlidersHorizontal,
    ChevronDown,
    X,
    Plus,
} from 'lucide-react'
import { EVENT_TYPES } from '@/lib/events/taxonomy'
import type { SearchCriteria } from '@/lib/events/search-contract'

const input =
    'w-full min-w-0 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:border-zinc-700 dark:bg-zinc-900'
const industries = [
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Energy',
    'Life Sciences',
    'Cybersecurity',
]
const technologies = [
    'Artificial Intelligence',
    'Generative AI',
    'Machine Learning',
    'Robotics',
    'Cloud Computing',
    'Data Analytics',
    'Computer Vision',
    'AI Infrastructure',
]
const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Germany',
    'France',
    'Netherlands',
    'Singapore',
    'Japan',
    'Australia',
    'United Arab Emirates',
]

function Section({
    title,
    icon,
    children,
    open = true,
}: {
    title: string
    icon: ReactNode
    children: ReactNode
    open?: boolean
}) {
    return (
        <details
            open={open}
            className="group border-t border-zinc-200 py-4 dark:border-zinc-700"
        >
            <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-lime-500">
                {icon}
                <span className="flex-1">{title}</span>
                <ChevronDown
                    size={14}
                    className="text-zinc-500 group-open:rotate-180"
                />
            </summary>
            <div className="mt-3 space-y-3">{children}</div>
        </details>
    )
}

export function TopicPicker({
    label,
    values,
    options = [],
    onChange,
}: {
    label: string
    values: string[]
    options?: readonly string[]
    onChange: (values: string[]) => void
}) {
    const [custom, setCustom] = useState('')
    const add = () => {
        const next = custom.trim()
        if (next && !values.some((v) => v.toLowerCase() === next.toLowerCase()))
            onChange([...values, next])
        setCustom('')
    }
    return (
        <div className="space-y-2">
            {!!values.length && (
                <div className="flex flex-wrap gap-1.5">
                    {values.map((value) => (
                        <button
                            key={value}
                            type="button"
                            aria-label={`Remove ${value} from ${label}`}
                            onClick={() =>
                                onChange(values.filter((v) => v !== value))
                            }
                            className="inline-flex max-w-full items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                            <span className="break-words">{value}</span>
                            <X size={12} className="shrink-0" />
                        </button>
                    ))}
                </div>
            )}
            <details className="rounded-md border border-zinc-200 dark:border-zinc-700">
                <summary
                    aria-label={`Choose ${label}`}
                    className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden"
                >
                    <span>
                        {values.length
                            ? 'Add or change'
                            : `Any ${label.toLowerCase()}`}
                    </span>
                    <ChevronDown size={14} />
                </summary>
                <div className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-700">
                    {options.map((value) => (
                        <label
                            key={value}
                            className="flex items-center gap-2 text-sm"
                        >
                            <input
                                type="checkbox"
                                className="size-4 accent-lime-600"
                                checked={values.includes(value)}
                                onChange={(e) =>
                                    onChange(
                                        e.target.checked
                                            ? [...values, value]
                                            : values.filter((v) => v !== value),
                                    )
                                }
                            />
                            {value}
                        </label>
                    ))}
                    <div className="flex gap-1">
                        <input
                            aria-label={`Custom ${label}`}
                            className={input}
                            placeholder="Add your own…"
                            value={custom}
                            onChange={(e) => setCustom(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    add()
                                }
                            }}
                        />
                        <button
                            type="button"
                            aria-label={`Add custom ${label}`}
                            onClick={add}
                            className="rounded border border-zinc-200 p-2 dark:border-zinc-700"
                        >
                            <Plus size={15} />
                        </button>
                    </div>
                </div>
            </details>
        </div>
    )
}

function dateValue(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function presetRange(months: number) {
    const start = new Date()
    const end = new Date(start.getFullYear(), start.getMonth() + months, 1)
    const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
    end.setDate(Math.min(start.getDate(), lastDay))
    return { startDate: dateValue(start), endDate: dateValue(end) }
}

export function SearchFilters({
    criteria,
    onChange,
    onSearch,
    disabled,
}: {
    criteria: SearchCriteria
    onChange: (criteria: SearchCriteria) => void
    onSearch: () => void
    disabled: boolean
}) {
    const [expanded, setExpanded] = useState(false)
    const [customDates, setCustomDates] = useState(false)
    const set = <K extends keyof SearchCriteria>(
        key: K,
        value: SearchCriteria[K],
    ) => onChange({ ...criteria, [key]: value })
    const preset = [3, 6, 12].find((months) => {
        const range = presetRange(months)
        return (
            range.startDate === criteria.startDate &&
            range.endDate === criteria.endDate
        )
    })
    const dateMode = customDates
        ? 'custom'
        : preset
          ? String(preset)
          : criteria.startDate || criteria.endDate
            ? 'custom'
            : 'any'
    const textField = (
        key: 'country' | 'state' | 'city' | 'organizer' | 'audience',
        label: string,
        placeholder: string,
    ) => (
        <label className="block space-y-1 text-sm">
            <span>{label}</span>
            <input
                className={input}
                value={criteria[key]}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
            />
        </label>
    )
    return (
        <aside
            aria-label="Search filters"
            className="min-w-0 self-start rounded-xl border border-zinc-200 bg-white px-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
            <div className="flex items-center justify-between gap-2 py-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                    type="button"
                    className="text-xs font-medium text-blue-600"
                    onClick={() => {
                        onChange({
                            ...criteria,
                            startDate: null,
                            endDate: null,
                            country: '',
                            state: '',
                            city: '',
                            organizer: '',
                            audience: '',
                            attendance: 'any',
                            eventTypes: [],
                            industries: [],
                            technologies: [],
                            includeAny: [],
                            includeAll: [],
                            exclude: [],
                            includePast: false,
                            topicOperator: 'OR',
                            pageUrl: '',
                        })
                        setCustomDates(false)
                    }}
                >
                    Clear all
                </button>
            </div>
            <button
                type="button"
                className="mb-4 flex w-full items-center justify-between rounded-md border border-zinc-200 p-2 text-sm lg:hidden"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
            >
                <span>{expanded ? 'Hide filters' : 'Edit filters'}</span>
                <SlidersHorizontal size={16} />
            </button>
            <div className={`${expanded ? 'block' : 'hidden'} lg:block`}>
                <Section title="Date" icon={<CalendarDays size={17} />}>
                    <select
                        aria-label="Date range"
                        className={input}
                        value={dateMode}
                        onChange={(e) => {
                            const value = e.target.value
                            setCustomDates(value === 'custom')
                            if (value === 'any')
                                onChange({
                                    ...criteria,
                                    startDate: null,
                                    endDate: null,
                                })
                            else if (value !== 'custom')
                                onChange({
                                    ...criteria,
                                    ...presetRange(Number(value)),
                                })
                        }}
                    >
                        <option value="any">
                            {criteria.includePast
                                ? 'Any date'
                                : 'Any upcoming date'}
                        </option>
                        <option value="3">Next 3 months</option>
                        <option value="6">Next 6 months</option>
                        <option value="12">Next 12 months</option>
                        <option value="custom">Custom date range</option>
                    </select>
                    {dateMode === 'custom' ? (
                        <div className="space-y-2">
                            {(['startDate', 'endDate'] as const).map((key) => (
                                <label
                                    key={key}
                                    className="block space-y-1 text-xs"
                                >
                                    <span>
                                        {key === 'startDate'
                                            ? 'From'
                                            : 'Through'}
                                    </span>
                                    <input
                                        type="date"
                                        className={input}
                                        value={criteria[key] || ''}
                                        onChange={(e) =>
                                            set(key, e.target.value || null)
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    ) : preset ? (
                        <p className="text-xs text-zinc-500">
                            {criteria.startDate} — {criteria.endDate}
                        </p>
                    ) : null}
                </Section>
                <Section title="Location" icon={<MapPin size={17} />}>
                    <input
                        aria-label="Country"
                        list="search-country-options"
                        className={input}
                        placeholder="Any country"
                        value={criteria.country}
                        onChange={(e) => set('country', e.target.value)}
                    />
                    <datalist id="search-country-options">
                        {countries.map((country) => (
                            <option key={country} value={country} />
                        ))}
                    </datalist>
                    <details open={Boolean(criteria.state || criteria.city)}>
                        <summary className="cursor-pointer text-xs text-zinc-500">
                            State / province and city
                        </summary>
                        <div className="mt-2 space-y-2">
                            {textField(
                                'state',
                                'State / province',
                                'Any state or province',
                            )}
                            {textField('city', 'City', 'Any city')}
                        </div>
                    </details>
                </Section>
                <Section title="Industry" icon={<Building2 size={17} />}>
                    <TopicPicker
                        label="Industry"
                        values={criteria.industries}
                        options={industries}
                        onChange={(v) => set('industries', v)}
                    />
                </Section>
                <Section title="Technology" icon={<Cpu size={17} />}>
                    <TopicPicker
                        label="Technology"
                        values={criteria.technologies}
                        options={technologies}
                        onChange={(v) => set('technologies', v)}
                    />
                </Section>
                <Section title="Event type" icon={<Tags size={17} />}>
                    <select
                        aria-label="Attendance"
                        className={input}
                        value={criteria.attendance}
                        onChange={(e) =>
                            set(
                                'attendance',
                                e.target.value as SearchCriteria['attendance'],
                            )
                        }
                    >
                        <option value="any">Any attendance format</option>
                        <option value="in_person">In person</option>
                        <option value="online">Online</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                    <TopicPicker
                        label="Event type"
                        values={criteria.eventTypes}
                        options={EVENT_TYPES}
                        onChange={(v) => set('eventTypes', v)}
                    />
                </Section>
                <Section title="Audience" icon={<Users size={17} />}>
                    <input
                        aria-label="Officially stated audience"
                        className={input}
                        placeholder="Any audience"
                        value={criteria.audience}
                        onChange={(e) => set('audience', e.target.value)}
                    />
                </Section>
                <Section
                    title="Advanced filters"
                    icon={<SlidersHorizontal size={17} />}
                    open={false}
                >
                    {textField('organizer', 'Organizer', 'Any organizer')}
                    <label className="block space-y-1 text-sm">
                        <span>Topic matching</span>
                        <select
                            className={input}
                            value={criteria.topicOperator}
                            onChange={(e) =>
                                set(
                                    'topicOperator',
                                    e.target.value as 'AND' | 'OR',
                                )
                            }
                        >
                            <option value="OR">
                                Match any industry or technology
                            </option>
                            <option value="AND">
                                Match every industry and technology
                            </option>
                        </select>
                    </label>
                    {(['includeAny', 'includeAll', 'exclude'] as const).map(
                        (key) => (
                            <div key={key} className="space-y-1">
                                <p className="text-sm">
                                    {key === 'includeAny'
                                        ? 'Include any keyword'
                                        : key === 'includeAll'
                                          ? 'Include all keywords'
                                          : 'Exclude keywords'}
                                </p>
                                <TopicPicker
                                    label={
                                        key === 'includeAny'
                                            ? 'Any keyword'
                                            : key === 'includeAll'
                                              ? 'Required keyword'
                                              : 'Excluded keyword'
                                    }
                                    values={criteria[key]}
                                    onChange={(v) => set(key, v)}
                                />
                            </div>
                        ),
                    )}
                    <p className="text-xs text-zinc-500">
                        Keywords check the title, description and organizer.
                    </p>
                    <label className="block space-y-1 text-sm">
                        <span>Verify from this page</span>
                        <input
                            type="url"
                            className={input}
                            placeholder="https://…"
                            value={criteria.pageUrl}
                            onChange={(e) => set('pageUrl', e.target.value)}
                        />
                        <span className="block text-xs text-zinc-500">
                            Official ownership is checked before trusting a URL.
                        </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-lime-600"
                            checked={criteria.includePast}
                            onChange={(e) =>
                                set('includePast', e.target.checked)
                            }
                        />{' '}
                        Include past editions
                    </label>
                </Section>
                <div className="border-t border-zinc-200 py-4 dark:border-zinc-700">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onSearch}
                        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                    >
                        Apply filters & search
                    </button>
                </div>
            </div>
        </aside>
    )
}
