import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

    if (!url || !serviceRoleKey) {
        return null
    }

    return createSupabaseAdmin(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

async function applyStep<T>(label: string, promise: PromiseLike<{ data: T | null; error: any }>) {
    const { data, error } = await promise
    if (error) {
        throw new Error(`${label}: ${error.message ?? 'Unknown Supabase error'}`)
    }
    return data
}

export async function POST(req: NextRequest) {
    try {
        const { ids } = await req.json()
        const eventIds = Array.isArray(ids)
            ? Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)))
            : []

        if (eventIds.length === 0) {
            return NextResponse.json({ error: 'No event ids provided' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: visibleEvents, error: visibleError } = await supabase
            .from('events')
            .select('id')
            .in('id', eventIds)

        if (visibleError) throw visibleError

        const visibleIds = new Set((visibleEvents ?? []).map(event => event.id))
        const inaccessible = eventIds.filter(id => !visibleIds.has(id))
        if (inaccessible.length > 0) {
            return NextResponse.json({ error: 'One or more events are not accessible' }, { status: 403 })
        }

        const admin = getAdminClient()
        const db = admin ?? supabase

        const taskRows = await applyStep(
            'Load event tasks',
            db.from('tasks').select('id').in('event_id', eventIds)
        )
        const taskIds = (taskRows ?? []).map(task => task.id).filter(Boolean)

        if (taskIds.length > 0) {
            await applyStep(
                'Unlink task assets',
                db.from('assets').update({ task_id: null }).in('task_id', taskIds)
            )
            await applyStep(
                'Delete task checklist items',
                db.from('task_checklist_items').delete().in('task_id', taskIds)
            )
            await applyStep(
                'Delete task collaborators',
                db.from('task_collaborators').delete().in('task_id', taskIds)
            )
        }

        await applyStep(
            'Unlink event assets',
            db.from('assets').update({ event_id: null }).in('event_id', eventIds)
        )
        await applyStep(
            'Unlink event leads',
            db.from('leads').update({ event_id: null }).in('event_id', eventIds)
        )
        await applyStep(
            'Delete event comments',
            db.from('event_comments').delete().in('event_id', eventIds)
        )
        await applyStep(
            'Delete event tasks',
            db.from('tasks').delete().in('event_id', eventIds)
        )
        await applyStep(
            'Clear discovery queue links',
            db.from('event_discovery_queue').update({ existing_event_id: null }).in('existing_event_id', eventIds)
        )
        await applyStep(
            'Delete events',
            db.from('events').delete().in('id', eventIds)
        )

        return NextResponse.json({ success: true, deleted: eventIds.length })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete events'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
