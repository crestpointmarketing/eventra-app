import type { SupabaseClient } from '@supabase/supabase-js'

// Only editable event columns belong in an insert. Joined profiles, share links,
// import identifiers and lifecycle fields must never leak into a new record.
const eventFields = [
    'name', 'event_type', 'start_date', 'end_date', 'location', 'venue',
    'industry', 'goal_statement', 'target_audience', 'core_message',
    'primary_offering', 'key_cta', 'total_budget', 'budget_breakdown',
    'target_leads', 'target_revenue', 'description', 'url', 'website_url',
    'focus_area', 'discovery_priority', 'expected_attendees', 'engagement_type',
] as const

export function eventInsert(input: Record<string, unknown>, userId: string) {
    const fields = Object.fromEntries(eventFields
        .filter(key => input[key] !== undefined)
        .map(key => [key, input[key]]))
    // Both legacy and discovery views must resolve the same website.
    const website = input.website_url || input.url || null
    return { ...fields, owner_id: userId, source: 'manual', url: website, website_url: website }
}

export async function insertOwnedEvent(db: SupabaseClient, input: Record<string, unknown>) {
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError || !user) throw new Error('Please sign in again before creating an event.')
    const { data, error } = await db.from('events').insert(eventInsert(input, user.id)).select().single()
    if (error) throw error
    return data
}

export function eventDeleteFailure(code: string) {
    if (code === '42501') return { status: 403, error: 'Only the event owner can delete it. Ask your administrator to transfer historical events to an active team member.' }
    if (code === '23503') return { status: 409, error: 'Related records prevent deletion. No events were deleted; contact your administrator.' }
    if (code === 'PGRST202' || code === '42883') return { status: 503, error: 'Event deletion is not configured in this database. Ask your administrator to apply the Eventra migrations.' }
    return { status: 500, error: 'Unable to delete events. No events were deleted; please retry.' }
}
