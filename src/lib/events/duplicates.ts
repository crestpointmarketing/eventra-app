import type { SupabaseClient } from '@supabase/supabase-js'
import { dateOnlyTime } from '@/lib/date-only'

export interface EventDuplicateCandidate {
    name?: string | null
    start_date?: string | null
    location?: string | null
}

export interface EventDuplicateMatch {
    id: string
    name: string
    start_date: string | null
    location: string | null
    source: string | null
    reason: string
    score: number
}

interface ExistingEventRow {
    id: string
    name: string | null
    start_date: string | null
    location: string | null
    source: string | null
}

const STOP_WORDS = new Set([
    'conference',
    'summit',
    'expo',
    'forum',
    'congress',
    'symposium',
    'workshop',
    'annual',
    'global',
    'international',
    'world',
    '2025',
    '2026',
    '2027',
    '2028',
])

function normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function coreTokens(name: string): string[] {
    return normalize(name).split(' ').filter(token => token.length > 2 && !STOP_WORDS.has(token))
}

function tokenOverlap(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0
    const bSet = new Set(b)
    const common = a.filter(token => bSet.has(token)).length
    return common / Math.max(a.length, b.length)
}

function datesClose(d1: string | null | undefined, d2: string | null | undefined, days = 21): boolean {
    if (!d1 || !d2) return false
    return Math.abs(dateOnlyTime(d1) - dateOnlyTime(d2)) <= days * 86_400_000
}

function locationsOverlap(l1: string | null | undefined, l2: string | null | undefined): boolean {
    if (!l1 || !l2) return false
    const words = normalize(l1).split(' ').filter(word => word.length > 3)
    const normalizedOther = normalize(l2)
    return words.some(word => normalizedOther.includes(word))
}

export function evaluateEventDuplicate(
    incoming: EventDuplicateCandidate,
    existing: ExistingEventRow
): EventDuplicateMatch | null {
    const incomingTokens = coreTokens(incoming.name ?? '')
    const existingTokens = coreTokens(existing.name ?? '')
    const nameOverlap = tokenOverlap(incomingTokens, existingTokens)
    const dateClose = datesClose(incoming.start_date, existing.start_date)
    const locationClose = locationsOverlap(incoming.location, existing.location)

    if (!locationClose || !dateClose || nameOverlap < 0.5) return null

    const reasons = [
        `similar name (${Math.round(nameOverlap * 100)}% match)`,
        'same location',
        'overlapping dates',
    ]

    return {
        id: existing.id,
        name: existing.name ?? 'Untitled Event',
        start_date: existing.start_date,
        location: existing.location,
        source: existing.source,
        reason: reasons.join(', '),
        score: nameOverlap,
    }
}

export async function findEventDuplicate(
    supabase: SupabaseClient,
    incoming: EventDuplicateCandidate
): Promise<EventDuplicateMatch | null> {
    const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, location, source')
        .order('created_at', { ascending: false })

    if (error || !data) return null

    for (const existing of data as ExistingEventRow[]) {
        const match = evaluateEventDuplicate(incoming, existing)
        if (match) return match
    }

    return null
}
