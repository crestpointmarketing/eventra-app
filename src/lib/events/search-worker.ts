import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { searchCriteriaSchema, type SearchJob } from './search-contract'
import {
    buildSearchQueries,
    discoverCandidates,
    verifyCandidate,
    type CandidateSeed,
} from './search-research'
import { deduplicateResults, evaluateCandidate } from './search-evaluation'

export function searchEnvironment() {
    return process.env.VERCEL_ENV === 'production'
        ? 'production'
        : (process.env.VERCEL_URL ?? 'development')
}
function admin() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) throw new Error('Search worker is not configured')
    return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}
export async function runSearchWorker(id?: string) {
    const db = admin()
    const { data, error } = await db.rpc('claim_event_search', {
        p_environment: searchEnvironment(),
        p_id: id ?? null,
    })
    if (error) throw new Error('Could not claim search job')
    const job = data?.[0] as
        | (SearchJob & { lease_token: string; candidates: CandidateSeed[] })
        | undefined
    if (!job) return
    const started = Date.now()
    async function checkpoint(patch: Record<string, unknown>) {
        const { data: updated, error } = await db
            .from('event_search_jobs')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', job!.id)
            .eq('lease_token', job!.lease_token)
            .eq('status', 'running')
            .select('id')
        if (error) throw new Error('Could not save search progress')
        if (!updated?.length)
            throw new Error('Search cancelled or lease replaced')
        Object.assign(job!, patch)
    }
    try {
        const criteria = searchCriteriaSchema.parse(job.criteria)
        if (!job.queries.length)
            await checkpoint({
                stage: 'Building search queries',
                queries: buildSearchQueries(criteria),
            })
        if (!job.candidates.length && !job.results.length) {
            await checkpoint({ stage: 'Finding candidate events' })
            const candidates = await discoverCandidates(job.queries[0])
            if (
                criteria.pageUrl &&
                !candidates.some((c) => c.url === criteria.pageUrl)
            )
                candidates.unshift({
                    id: crypto.randomUUID(),
                    name: criteria.query || 'Event from submitted page',
                    url: criteria.pageUrl,
                    organizer: null,
                    organizer_url: null,
                })
            await checkpoint({
                candidates,
                counts: { ...job.counts, candidates: candidates.length },
                warnings:
                    candidates.length >= 16
                        ? [
                              'Candidate processing limit reached. Narrow your criteria to explore further.',
                          ]
                        : [],
            })
        }
        const done = new Set(job.results.map((r) => r.id))
        for (let i = 0; i < job.candidates.length; i += 2) {
            const batch = job.candidates
                .slice(i, i + 2)
                .filter((c) => !done.has(c.id))
            if (!batch.length) continue
            if (Date.now() - started > 215000) {
                await checkpoint({
                    status: 'queued',
                    lease_token: null,
                    lease_until: null,
                })
                return
            }
            await checkpoint({ stage: 'Checking official sources' })
            const candidates = await Promise.all(
                batch.map((seed) =>
                    verifyCandidate(seed, () =>
                        checkpoint({ stage: 'Extracting event details' }),
                    ),
                ),
            )
            const results = [
                ...job.results,
                ...candidates.map((c) => evaluateCandidate(c, criteria)),
            ]
            await checkpoint({
                stage: 'Applying required filters',
                results,
                counts: {
                    ...job.counts,
                    checked:
                        job.counts.checked +
                        candidates.reduce((n, c) => n + c.sources.length, 0),
                    strict: results.filter((r) => r.category === 'strict')
                        .length,
                    verification: results.filter(
                        (r) => r.category === 'verification',
                    ).length,
                    excluded: results.filter((r) => r.category === 'excluded')
                        .length,
                },
            })
        }
        await checkpoint({ stage: 'Removing duplicates' })
        const results = deduplicateResults(job.results)
        const counts = {
            ...job.counts,
            strict: results.filter((r) => r.category === 'strict').length,
            verification: results.filter((r) => r.category === 'verification')
                .length,
            excluded: results.filter((r) => r.category === 'excluded').length,
        }
        await checkpoint({
            results,
            counts,
            stage: 'Results ready',
            status:
                job.warnings.length || counts.verification
                    ? 'warnings'
                    : 'completed',
            lease_token: null,
            lease_until: null,
        })
    } catch {
        await db
            .from('event_search_jobs')
            .update({
                status: 'failed',
                error: 'Search could not finish. Saved progress is available; retry failed sources.',
                updated_at: new Date().toISOString(),
                lease_until: null,
            })
            .eq('id', job.id)
            .eq('lease_token', job.lease_token)
            .eq('status', 'running')
    }
}
