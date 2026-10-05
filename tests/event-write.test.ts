import test from 'node:test'
import assert from 'node:assert/strict'
import { eventInsert, eventDeleteFailure, insertOwnedEvent } from '../src/lib/events/write'
import type { SupabaseClient } from '@supabase/supabase-js'

test('event copies discard read-only, linked and lifecycle data and retain editable details', () => {
    const payload = eventInsert({
        id: 'old', name: 'Copy', owner_id: 'someone-else', owner: { name: 'Other' },
        leads: [], share_token: 'secret', share_expires_at: '2027-01-01',
        deleted_at: '2026-01-01', external_id: 'imported', source: 'search',
        status: 'completed', actual_leads: 100, actual_revenue: 200,
        total_budget: 500, url: 'https://example.test',
    }, 'current-user')
    assert.deepEqual(payload, {
        name: 'Copy', total_budget: 500, url: 'https://example.test',
        website_url: 'https://example.test', owner_id: 'current-user', source: 'manual',
    })
})

test('expired sessions fail before attempting an event insert', async () => {
    let wrote = false
    const db = {
        auth: { getUser: async () => ({ data: { user: null }, error: new Error('Expired') }) },
        from: () => { wrote = true; throw new Error('Unexpected write') },
    } as unknown as SupabaseClient
    await assert.rejects(insertOwnedEvent(db, { name: 'Test' }), /sign in again/)
    assert.equal(wrote, false)
})

test('delete failures distinguish permissions, schema and database faults', () => {
    assert.equal(eventDeleteFailure('42501').status, 403)
    assert.equal(eventDeleteFailure('23503').status, 409)
    assert.equal(eventDeleteFailure('PGRST202').status, 503)
    assert.equal(eventDeleteFailure('XX000').status, 500)
    assert.doesNotMatch(eventDeleteFailure('XX000').error, /Only.*owner/)
})
