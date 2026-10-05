// Manual integration check: node --import tsx tests/event-crud-smoke.mjs
// Creates an isolated temporary member and removes only that member's fixtures.
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, randomUUID } from 'node:crypto'
import { eventraDatabaseUrl } from '../src/lib/supabase/project.ts'
import { insertOwnedEvent } from '../src/lib/events/write.ts'
import assert from 'node:assert/strict'

nextEnv.loadEnvConfig(process.cwd())
const url = eventraDatabaseUrl()
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options)
const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
const eventIds = []
let uid, leadId, taskId
const must = result => { if (result.error) throw new Error(result.error.message); return result.data }
try {
    const email = `eventra-crud-${randomUUID()}@example.test`
    const password = randomBytes(32).toString('hex')
    uid = must(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user.id
    must(await admin.from('eventra_members').insert({ user_id: uid }))
    must(await db.auth.signInWithPassword({ email, password }))
    const original = await insertOwnedEvent(db, {
        name: 'Synthetic CRUD verification', event_type: 'Conference',
        start_date: '2027-01-10', end_date: '2027-01-11', url: 'https://example.test',
    })
    eventIds.push(original.id)
    assert.equal(original.owner_id, uid)
    const copy = await insertOwnedEvent(db, { ...original, name: 'Synthetic CRUD copy', owner: { id: uid }, leads: [] })
    eventIds.push(copy.id)
    assert.notEqual(copy.id, original.id)
    const reloaded = must(await db.from('events').select('name,website_url').eq('id', copy.id).single())
    assert.equal(reloaded.name, 'Synthetic CRUD copy')
    assert.equal(reloaded.website_url, 'https://example.test')
    taskId = must(await db.from('tasks').insert({ event_id: original.id, title: 'Synthetic CRUD task', assigned_to: uid }).select('id').single()).id
    leadId = must(await db.from('leads').insert({ event_id: original.id, first_name: 'Synthetic', last_name: 'CRUD', email: `${randomUUID()}@example.test`, company: 'Test', owner_id: uid }).select('id').single()).id
    must(await db.from('task_checklist_items').insert({ task_id: taskId, title: 'Synthetic checklist' }))
    assert.equal(must(await db.rpc('delete_events_atomic', { event_ids: eventIds })), 2)
    assert.equal(must(await db.from('events').select('id').in('id', eventIds)).length, 0)
    assert.equal(must(await db.from('tasks').select('id').eq('id', taskId)).length, 0)
    assert.equal(must(await db.from('leads').select('event_id').eq('id', leadId).single()).event_id, null)
    console.log('PASS: authenticated event create, copy, reload and atomic delete; linked lead preserved, task removed.')
} finally {
    if (uid) {
        if (taskId) must(await admin.from('tasks').delete().eq('id', taskId))
        if (leadId) must(await admin.from('leads').delete().eq('id', leadId))
        if (eventIds.length) must(await admin.from('events').delete().in('id', eventIds))
        must(await admin.from('eventra_members').delete().eq('user_id', uid))
        must(await admin.from('users').delete().eq('id', uid))
        must(await admin.auth.admin.deleteUser(uid))
        assert.equal(must(await admin.from('events').select('id').in('id', eventIds)).length, 0)
        console.log('PASS: temporary account and fixtures cleaned up.')
    }
}
