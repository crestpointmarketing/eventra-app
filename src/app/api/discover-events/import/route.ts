import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { guardAI } from '@/lib/api/guard'
import { createClient } from '@/lib/supabase/server'
import { buildDefaultEventTasks } from '@/lib/events/default-tasks'
export async function POST(req: NextRequest) {
    const denied = await guardAI(req, { consumeQuota: false })
    if (denied) return denied
    const input = z
        .object({
            jobId: z.uuid(),
            resultId: z.string().max(80),
            destination: z.enum(['queue', 'portfolio']),
            createTasks: z.boolean(),
        })
        .strict()
        .safeParse(await req.json())
    if (
        !input.success ||
        (input.data.destination === 'queue' && input.data.createTasks)
    )
        return NextResponse.json(
            { error: 'Invalid import choice' },
            { status: 400 },
        )
    const db = await createClient()
    const { data: job, error } = await db
        .from('event_search_jobs')
        .select('results')
        .eq('id', input.data.jobId)
        .single()
    const result = job?.results?.find(
        (r: { id: string }) => r.id === input.data.resultId,
    )
    if (error || !result)
        return NextResponse.json(
            { error: 'Result unavailable' },
            { status: 404 },
        )
    const tasks = input.data.createTasks
        ? buildDefaultEventTasks(
              '',
              result.resolved.start_date.status === 'verified'
                  ? result.resolved.start_date.value
                  : null,
          ).map((task) => ({ ...task, event_id: undefined }))
        : []
    const { data, error: importError } = await db.rpc('import_event_search', {
        p_job: input.data.jobId,
        p_result: input.data.resultId,
        p_queue: input.data.destination === 'queue',
        p_tasks: tasks,
    })
    return importError
        ? NextResponse.json(
              {
                  error: 'Could not import this result. Review its name, type and dates first.',
              },
              { status: 409 },
          )
        : NextResponse.json(data)
}
