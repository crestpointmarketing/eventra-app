import { z } from 'zod'

const words = z.array(z.string().trim().min(1).max(160)).max(20).default([])
const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
        (v) =>
            !Number.isNaN(Date.parse(v)) &&
            new Date(v).toISOString().slice(0, 10) === v,
    )
export const searchCriteriaSchema = z
    .object({
        mode: z.enum(['discover', 'specific']),
        query: z.string().trim().max(2000).default(''),
        pageUrl: z
            .union([
                z
                    .url()
                    .max(2000)
                    .refine((v) => /^https?:\/\//i.test(v)),
                z.literal(''),
            ])
            .default(''),
        startDate: date.nullable().default(null),
        endDate: date.nullable().default(null),
        country: z.string().trim().max(120).default(''),
        state: z.string().trim().max(120).default(''),
        city: z.string().trim().max(120).default(''),
        attendance: z
            .enum(['any', 'online', 'in_person', 'hybrid'])
            .default('any'),
        eventTypes: words,
        industries: words,
        technologies: words,
        topicOperator: z.enum(['AND', 'OR']).default('OR'),
        includeAny: words,
        includeAll: words,
        exclude: words,
        organizer: z.string().trim().max(160).default(''),
        audience: z.string().trim().max(160).default(''),
        includePast: z.boolean().default(false),
    })
    .strict()
    .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
        message: 'End date must follow start date',
        path: ['endDate'],
    })
export type SearchCriteria = z.infer<typeof searchCriteriaSchema>
export const SEARCH_FIELDS = [
    'name',
    'start_date',
    'end_date',
    'country',
    'state',
    'city',
    'attendance',
    'event_type',
    'organizer',
    'description',
    'audience',
    'series',
    'edition',
] as const
export type SearchField = (typeof SEARCH_FIELDS)[number]
export type SourceKind =
    | 'official_edition'
    | 'organizer'
    | 'venue_partner'
    | 'third_party'
    | 'discovery'
export const SOURCE_PRIORITY: Record<SourceKind, number> = {
    official_edition: 1,
    organizer: 2,
    venue_partner: 3,
    third_party: 4,
    discovery: 5,
}
export interface SearchSource {
    url: string
    kind: SourceKind
    accessible: boolean
    checkedAt: string
    identityVerified: boolean
    identityReason: string
}
export interface FieldEvidence {
    value: string
    quote: string
    sourceUrl: string
    checkedAt: string
    status: 'verified' | 'inferred' | 'unverified'
}
export interface ResolvedField {
    value: string | null
    status: 'verified' | 'inferred' | 'unknown' | 'unverified' | 'conflict'
    evidence: FieldEvidence[]
}
export interface SearchCandidate {
    id: string
    name: string
    website_url: string | null
    fields: Partial<Record<SearchField, FieldEvidence[]>>
    sources: SearchSource[]
    warnings: string[]
}
export interface CriterionResult {
    key: string
    label: string
    status: 'matched' | 'unknown' | 'failed'
}
export interface SearchResult extends SearchCandidate {
    resolved: Record<SearchField, ResolvedField>
    category: 'strict' | 'verification' | 'excluded'
    evidenceStatus: 'Verified' | 'Partial' | 'Unverified'
    criteria: CriterionResult[]
    reasons: string[]
    unknownCount: number
    seriesKey: string | null
    editionKey: string | null
    duplicateOf?: string
}
export const SEARCH_STAGES = [
    'Understanding criteria',
    'Building search queries',
    'Finding candidate events',
    'Checking official sources',
    'Extracting event details',
    'Applying required filters',
    'Removing duplicates',
    'Results ready',
] as const
export interface SearchJob {
    id: string
    criteria: SearchCriteria
    status:
        'queued' | 'running' | 'completed' | 'warnings' | 'failed' | 'cancelled'
    stage: string
    results: SearchResult[]
    warnings: string[]
    queries: string[]
    counts: {
        candidates: number
        checked: number
        strict: number
        verification: number
        excluded: number
    }
    created_at: string
    updated_at: string
    error: string | null
}
