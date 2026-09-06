import { after, NextRequest, NextResponse } from 'next/server'
import { guardAI } from '@/lib/api/guard'
import { createClient } from '@/lib/supabase/server'
import { searchCriteriaSchema, hydrateSearchJob, type SearchJob } from '@/lib/events/search-contract'
import { runSearchWorker, searchEnvironment } from '@/lib/events/search-worker'
export const maxDuration = 300
export async function POST(req: NextRequest) {
    const denied = await guardAI(req, { consumeQuota: false })
    if (denied) return denied
    const parsed = searchCriteriaSchema.safeParse(await req.json())
    if (!parsed.success)
        return NextResponse.json(
            {
                error: 'Invalid search criteria',
                details: parsed.error.flatten(),
            },
            { status: 400 },
        )
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
        return NextResponse.json(
            { error: 'Search worker is not configured' },
            { status: 503 },
        )
    const db = await createClient()
    const { data: id, error } = await db.rpc('create_event_search', {
        p_criteria: parsed.data,
        p_environment: searchEnvironment(),
    })
    if (error)
        return NextResponse.json(
            {
                error: error.message.includes('already running')
                    ? 'A search is already running. Open it or cancel it first.'
                    : 'Could not create search job',
            },
            { status: 409 },
        )
    after(async () => {
        try {
            await runSearchWorker(id)
        } catch {
            console.error('Search worker unavailable')
        }
    })
    return NextResponse.json({ id }, { status: 202 })
}
export async function GET(req: NextRequest) {
    const denied = await guardAI(req, { consumeQuota: false })
    if (denied) return denied
    const db = await createClient()
    const { data, error } = await db
        .from('event_search_jobs')
        .select(
            'id,criteria,status,stage,queries,results,warnings,counts,created_at,updated_at,error',
        )
        .order('created_at', { ascending: false })
        .limit(20)
    return error
        ? NextResponse.json(
              { error: 'Could not load search history' },
              { status: 503 },
          )
        : NextResponse.json(
              { jobs: (data as SearchJob[]).map(hydrateSearchJob) },
              { headers: { 'Cache-Control': 'no-store' } },
          )
}
