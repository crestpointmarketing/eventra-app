'use client'

import { useState } from 'react'
import { CalendarCheck, Handshake, Mic, Store, UserRound } from 'lucide-react'
import type { EngagementType } from '@/lib/events/taxonomy'

function websiteHost(url?: string | null) {
    try { return url ? new URL(url).hostname : null } catch { return null }
}

const LOGO_TINTS = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700']

/** Site icon from the event website, falling back to initials when unavailable. */
export function EventLogo({ name, url }: { name: string; url?: string | null }) {
    const host = websiteHost(url)
    const [failed, setFailed] = useState(false)
    const initials = name.replace(/\[.*?\]/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
    const tint = LOGO_TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % LOGO_TINTS.length]
    return (
        <span className="flex h-10 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            {host && !failed ? (
                <img
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
                    alt=""
                    loading="lazy"
                    className="h-7 w-7 object-contain"
                    onError={() => setFailed(true)}
                    onLoad={e => { if (e.currentTarget.naturalWidth <= 16) setFailed(true) }}
                />
            ) : (
                <span className={`flex h-full w-full items-center justify-center text-xs font-semibold ${tint} dark:bg-zinc-800 dark:text-zinc-200`}>{initials}</span>
            )}
        </span>
    )
}

const ENGAGEMENT_STYLE: Record<EngagementType, { icon: React.ElementType; className: string }> = {
    Sponsor:  { icon: Handshake,     className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    Exhibit:  { icon: Store,         className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    Attend:   { icon: CalendarCheck, className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    Speaking: { icon: Mic,           className: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
    Follow:   { icon: UserRound,     className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
}

export function EngagementPill({ type }: { type: EngagementType }) {
    const { icon: Icon, className } = ENGAGEMENT_STYLE[type]
    return (
        <span className={`!inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
            <Icon className="h-3.5 w-3.5" />{type}
        </span>
    )
}

const STAT_TONES = {
    blue:   { card: 'bg-blue-50/70 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40',             icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',             ring: 'ring-blue-400' },
    rose:   { card: 'bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40',             icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',             ring: 'ring-rose-400' },
    green:  { card: 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', ring: 'ring-emerald-400' },
    violet: { card: 'bg-violet-50/70 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40',     icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',     ring: 'ring-violet-400' },
}

/** Summary card that doubles as a quick filter. */
export function PortfolioStatCard({ icon: Icon, label, value, hint, tone, active, onClick }: {
    icon: React.ElementType
    label: string
    value: number
    hint: string
    tone: keyof typeof STAT_TONES
    active: boolean
    onClick: () => void
}) {
    const t = STAT_TONES[tone]
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex items-start gap-4 rounded-lg border p-5 text-left transition hover:shadow-sm ${t.card} ${active ? `ring-2 ${t.ring}` : ''}`}
        >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="block text-3xl font-semibold text-zinc-900 dark:text-white">{value}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</span>
            </span>
        </button>
    )
}
