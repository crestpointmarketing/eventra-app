// Explicit live check: node --import tsx tests/crud-system-smoke.mjs
// Every write is scoped to temporary accounts and generated fixture IDs.
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { eventraDatabaseUrl } from '../src/lib/supabase/project.ts'
import { insertOwnedEvent } from '../src/lib/events/write.ts'
import { insertAssignedTask } from '../src/lib/tasks/write.ts'

nextEnv.loadEnvConfig(process.cwd())
const url = eventraDatabaseUrl()
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options)
const accounts = [], events = [], leads = [], tasks = [], assets = [], templates = [], paths = [], results = []
const must = r => { if (r.error) throw new Error(`${r.error.code || ''}: ${r.error.message}`); return r.data }
async function check(name, fn) {
    try { await fn(); results.push({ name, passed: true }) }
    catch (e) { results.push({ name, passed: false, error: e.message }); }
    console.log(JSON.stringify(results.at(-1)))
}
async function account() {
    const email = `eventra-system-${randomUUID()}@example.test`, password = randomBytes(32).toString('hex')
    const id = must(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user.id
    accounts.push(id)
    const jar = new Map()
    const db = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: { getAll: () => Array.from(jar, ([name, value]) => ({ name, value })), setAll: cs => cs.forEach(c => jar.set(c.name, c.value)) },
    })
    must(await db.auth.signInWithPassword({ email, password }))
    return { id, db, jar }
}
try {
    const a = await account(), b = await account()
    await check('nonmember cannot create events', async () => {
        const r = await b.db.from('events').insert({ name: 'Forbidden fixture', event_type: 'Conference', owner_id: b.id }).select('id')
        if (r.data) events.push(...r.data.map(x => x.id))
        assert.equal(r.error?.code, '42501')
    })
    must(await admin.from('eventra_members').insert(accounts.map(user_id => ({ user_id }))))
    const event = await insertOwnedEvent(a.db, { name: 'System CRUD fixture', event_type: 'Conference' }); events.push(event.id)
    await check('event edit persists', async () => {
        must(await a.db.from('events').update({ location: 'Test location' }).eq('id', event.id).select('id').single())
        assert.equal(must(await a.db.from('events').select('location').eq('id', event.id).single()).location, 'Test location')
    })
    await check('another member cannot delete an event', async () => {
        assert.equal((await b.db.rpc('delete_events_atomic', { event_ids: [event.id] })).error?.code, '42501')
    })
    await check('task creation without assignee reproduces deletion denial for its creator', async () => {
        const task = must(await b.db.from('tasks').insert({ title: 'Unassigned fixture', event_id: event.id }).select('id').single()); tasks.push(task.id)
        const r = await b.db.from('tasks').delete().eq('id', task.id).select('id')
        assert.equal(r.error, null); assert.equal(r.data.length, 0)
    })
    await check('assigned task create/edit/delete and checklist/collaborator CRUD', async () => {
        const task = await insertAssignedTask(b.db, { title: 'Assigned fixture', event_id: event.id }); tasks.push(task.id)
        assert.equal(task.assigned_to, b.id)
        must(await b.db.from('tasks').update({ title: 'Edited fixture' }).eq('id', task.id).select('id').single())
        const item = must(await b.db.from('task_checklist_items').insert({ task_id: task.id, title: 'Test item' }).select('id').single())
        must(await b.db.from('task_checklist_items').update({ is_completed: true }).eq('id', item.id).select('id').single())
        must(await b.db.from('task_checklist_items').delete().eq('id', item.id).select('id').single())
        const collaborator = must(await b.db.from('task_collaborators').insert({ task_id: task.id, user_id: a.id }).select('id').single())
        must(await b.db.from('task_collaborators').delete().eq('id', collaborator.id).select('id').single())
        must(await b.db.from('tasks').delete().eq('id', task.id).select('id').single())
    })
    await check('lead create/edit, note CRUD and owner delete', async () => {
        const lead = must(await a.db.from('leads').insert({ first_name: 'Synthetic', last_name: 'Audit', email: `${randomUUID()}@example.test`, company: 'Fixture', owner_id: a.id }).select('id').single()); leads.push(lead.id)
        must(await a.db.from('leads').update({ stage: 'qualified' }).eq('id', lead.id).select('id').single())
        const note = must(await a.db.from('lead_activities').insert({ lead_id: lead.id, activity_type: 'note_added', activity_data: { note: 'Synthetic audit' }, created_by: a.id }).select('id').single())
        must(await a.db.from('lead_activities').delete().eq('id', note.id).select('id').single())
        const denied = must(await b.db.from('leads').delete().eq('id', lead.id).select('id'))
        assert.equal(denied.length, 0)
        must(await a.db.from('leads').delete().eq('id', lead.id).select('id').single())
    })
    await check('event comments create/delete', async () => {
        const user = must(await a.db.auth.getUser()).user
        const comment = must(await a.db.from('event_comments').insert({ event_id: event.id, body: 'Synthetic audit comment', author_email: user.email }).select('id').single())
        must(await a.db.from('event_comments').delete().eq('id', comment.id).select('id').single())
    })
    await check('private file upload/read, metadata edit and owner delete', async () => {
        const path = `${a.id}/${randomUUID()}.txt`; paths.push(path)
        must(await a.db.storage.from('event-assets').upload(path, 'Synthetic audit', { contentType: 'text/plain' }))
        const asset = must(await a.db.from('assets').insert({ filename: 'audit.txt', file_type: 'document', file_url: `${url}/storage/v1/object/public/event-assets/${path}`, uploaded_by: a.id, event_id: event.id }).select('id').single()); assets.push(asset.id)
        must(await a.db.from('assets').update({ title: 'Audit updated' }).eq('id', asset.id).select('id').single())
        const signed = must(await a.db.storage.from('event-assets').createSignedUrl(path, 60))
        assert.equal((await fetch(signed.signedUrl)).status, 200)
        must(await a.db.storage.from('event-assets').remove([path]))
        must(await a.db.from('assets').delete().eq('id', asset.id).select('id').single())
    })
    let templateCopy
    await check('template create/edit/duplicate', async () => {
        const payload = { name: 'Synthetic audit template', category: 'follow_up', goal: 'book_meeting', subjects: [{ subject: 'Test subject' }], blocks: [{ block_type: 'opening', content: 'Test content', allowed_vars: [] }], cta: { cta_type: 'reply', cta_text: 'Reply' } }
        const template = must(await a.db.rpc('save_email_template', { payload })); templates.push(template.id)
        must(await a.db.rpc('save_email_template', { payload: { ...payload, id: template.id, expected_version: template.version, name: 'Edited synthetic template' } }))
        const copy = must(await a.db.rpc('rpc_duplicate_email_template', { p_template_id: template.id, p_new_name: 'Synthetic template copy' })); templates.push(copy)
        templateCopy = copy
    })
    await check('template legacy soft-delete (known production defect)', async () => {
        assert.ok(templateCopy, 'Template copy must exist')
        must(await a.db.from('email_templates').update({ deleted_at: new Date().toISOString() }).eq('id', templateCopy))
        assert.ok(must(await admin.from('email_templates').select('deleted_at').eq('id', templateCopy).single()).deleted_at)
    })
    await check('template fixed soft-delete RPC (requires migration)', async () => {
        assert.ok(templateCopy, 'Template copy must exist')
        assert.equal(must(await a.db.rpc('soft_delete_email_template', { template_id: templateCopy })), true)
    })
    await check('production authenticated event page and deletion endpoint', async () => {
        const origin = 'https://eventra.crestpointmarketing.net'
        const headers = { Cookie: Array.from(a.jar, ([k, v]) => `${k}=${v}`).join('; ') }
        const page = await fetch(`${origin}/events/new`, { headers, redirect: 'manual' })
        assert.equal(page.status, 200)
        const html = await page.text()
        const sources = [...new Set([...html.matchAll(/src="([^\"]+\.js[^\"]*)"/g)].map(m => m[1]))]
        const scripts = await Promise.all(sources.map(async src => {
            const address = new URL(src, origin)
            if (address.origin !== origin) return ''
            return (await fetch(address)).text()
        }))
        results.push({ name: 'production frontend version observation', passed: true, containsOldOwnerDefault: scripts.some(s => /\.from\("users"\)\.select\("id"\)\.limit\(1\)\.single\(\)/.test(s)) })
        const result = await fetch(`${origin}/api/events/bulk-delete`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [event.id] }) })
        const body = await result.json()
        assert.equal(result.status, 200, JSON.stringify(body)); assert.equal(body.deleted, 1)
        assert.equal(must(await a.db.from('events').select('id').eq('id', event.id)).length, 0)
    })
} finally {
    await check('remove all temporary data and accounts', async () => {
        if (paths.length) must(await admin.storage.from('event-assets').remove(paths))
        for (const [table, ids] of [['email_templates', templates], ['assets', assets], ['leads', leads], ['tasks', tasks], ['events', events]]) {
            if (ids.length) must(await admin.from(table).delete().in('id', ids))
        }
        for (const id of accounts) {
            must(await admin.from('eventra_members').delete().eq('user_id', id))
            must(await admin.from('users').delete().eq('id', id))
            must(await admin.auth.admin.deleteUser(id))
        }
    })
    writeFileSync('docs/crud-system-smoke-2026-09-27.json', JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
}
if (results.some(r => !r.passed)) process.exitCode = 1
