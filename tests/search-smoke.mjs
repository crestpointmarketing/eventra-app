// Manual integration check: isolated synthetic account and records, real AI calls.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
const cli = join(dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js')
const run = (args) =>
    execFileSync(process.execPath, [cli, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 4e6,
    })
const keys = JSON.parse(
    run([
        'supabase',
        'projects',
        'api-keys',
        '--project-ref',
        'tbicyyhprqbhimhrihgn',
        '--output',
        'json',
    ]),
)
const url = 'https://tbicyyhprqbhimhrihgn.supabase.co'
const admin = createClient(
    url,
    keys.find((k) => k.name === 'service_role').api_key,
    { auth: { persistSession: false } },
)
const jar = new Map()
const db = createServerClient(
    url,
    keys.find((k) => k.name === 'anon').api_key,
    {
        cookies: {
            getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
            setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
        },
    },
)
const target = process.argv[2] || 'http://localhost:3010'
const results = []
let uid
const eventIds = []
const queueIds = []
const must = (r) => {
    if (r.error) throw Error(r.error.message)
    return r.data
}
function check(name, passed, details) {
    results.push({ name, passed, details })
    console.log(JSON.stringify(results.at(-1)))
    if (!passed) throw Error(name)
}
async function request(path, body, status = 200, auth = true) {
    const headers = { 'Content-Type': 'application/json' }
    if (auth)
        headers.Cookie = Array.from(jar, ([k, v]) => `${k}=${v}`).join('; ')
    let code, text
    if (target.startsWith('http://localhost')) {
        const r = await fetch(target + path, {
            method: body ? 'POST' : 'GET',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        })
        code = r.status
        text = await r.text()
    } else {
        const args = [
            'vercel',
            'curl',
            path,
            '--deployment',
            target,
            '--',
            '--silent',
            '--show-error',
            '--max-time',
            '100',
            '--write-out',
            '\\n__STATUS__%{http_code}',
        ]
        for (const [k, v] of Object.entries(headers))
            args.push('-H', `${k}: ${v}`)
        if (body) args.push('-X', 'POST', '--data', JSON.stringify(body))
        let out
        try {
            out = run(args)
        } catch {
            throw new Error('Deployment request failed')
        }
        const marker = out.lastIndexOf('__STATUS__')
        code = Number(out.slice(marker + 10).trim())
        text = out.slice(0, marker).replace(/\\n$/, '').trim()
    }
    if (code !== status) throw Error(`${path}: ${code} ${text.slice(0, 200)}`)
    return JSON.parse(text)
}
try {
    const email = `eventra-search-${Date.now()}@example.test`,
        password = randomBytes(24).toString('hex')
    uid = must(
        await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        }),
    ).user.id
    must(await admin.from('eventra_members').upsert({ user_id: uid }))
    must(await db.auth.signInWithPassword({ email, password }))
    await request('/api/discover-events', { mode: 'discover' }, 401, false)
    check('anonymous denied', true)
    await request(
        '/api/discover-events',
        { knownDetails: 'legacy implicit mode' },
        400,
    )
    check('implicit mode rejected', true)
    const parsed = await request('/api/discover-events/parse', {
        text: '2027年4月，加拿大多伦多的医疗AI会议，不要线上活动',
        mode: 'discover',
    })
    check(
        'Chinese parsing preserves explicit mode',
        parsed.criteria.mode === 'discover' && !!parsed.criteria.startDate,
    )
    const started = Date.now()
    const created = await request(
        '/api/discover-events',
        {
            mode: 'specific',
            query: 'HIMSS 2027',
            advanced: {
                budgetRule: 'prefer',
                ticketMax: 500,
                currency: 'USD',
                deadlineTypes: ['registration'],
                deadlineRule: 'prefer',
            },
        },
        202,
    )
    check(
        'job created before research completes',
        !!created.id,
        Date.now() - started,
    )
    let j
    for (let i = 0; i < 45; i++) {
        j = must(
            await db
                .from('event_search_jobs')
                .select('*')
                .eq('id', created.id)
                .single(),
        )
        if (!['queued', 'running'].includes(j.status)) break
        await new Promise((r) => setTimeout(r, 3000))
    }
    check(
        'persistent search reaches terminal results',
        ['completed', 'warnings'].includes(j.status),
        { status: j.status, counts: j.counts },
    )
    check(
        'advanced criteria persisted',
        j.criteria.advanced.ticketMax === 500 &&
            j.criteria.advanced.budgetRule === 'prefer' &&
            j.criteria.advanced.deadlineTypes.includes('registration'),
    )
    check(
        'advanced result fields available',
        j.results.every(
            (r) => r.resolved.ticket_price && r.resolved.registration_deadline,
        ),
    )
    check(
        'every strict result has verified name/dates',
        j.results
            .filter((r) => r.category === 'strict')
            .every((r) =>
                ['name', 'start_date', 'end_date'].every(
                    (f) => r.resolved[f].status === 'verified',
                ),
            ),
    )
    check(
        'search did not create Portfolio events',
        must(await admin.from('events').select('id').eq('owner_id', uid))
            .length === 0,
    )
    const cancel = await request(
        '/api/discover-events',
        { mode: 'specific', query: 'HIMSS 2027' },
        202,
    )
    await request('/api/discover-events/cancel', { id: cancel.id })
    check(
        'cancellation persisted',
        must(
            await db
                .from('event_search_jobs')
                .select('status')
                .eq('id', cancel.id)
                .single(),
        ).status === 'cancelled',
    )
    const resolved = Object.fromEntries(
        Object.entries({
            name: 'Synthetic Eventra search test',
            event_type: 'Conference',
            start_date: '2027-06-01',
            end_date: '2027-06-02',
            city: 'Toronto',
            country: 'Canada',
        }).map(([k, value]) => [
            k,
            { value, status: 'verified', evidence: [] },
        ]),
    )
    const fixture = must(
        await admin
            .from('event_search_jobs')
            .insert({
                user_id: uid,
                environment: 'synthetic-test',
                criteria: { mode: 'discover' },
                status: 'completed',
                results: [
                    {
                        id: 'one',
                        name: resolved.name.value,
                        category: 'strict',
                        resolved,
                        editionKey: randomUUID(),
                        website_url: 'https://example.test',
                    },
                    {
                        id: 'two',
                        name: resolved.name.value,
                        category: 'strict',
                        resolved,
                        editionKey: randomUUID(),
                        website_url: 'https://example.test',
                    },
                ],
            })
            .select('id')
            .single(),
    )
    const imported = await request('/api/discover-events/import', {
        jobId: fixture.id,
        resultId: 'one',
        destination: 'portfolio',
        createTasks: false,
    })
    eventIds.push(imported.eventId)
    check(
        'no-task import creates zero tasks',
        must(
            await admin
                .from('tasks')
                .select('id')
                .eq('event_id', imported.eventId),
        ).length === 0,
    )
    const again = await request('/api/discover-events/import', {
        jobId: fixture.id,
        resultId: 'one',
        destination: 'portfolio',
        createTasks: false,
    })
    check(
        'repeat import is idempotent',
        again.skipped && again.eventId === imported.eventId,
    )
    const withTasks = await request('/api/discover-events/import', {
        jobId: fixture.id,
        resultId: 'two',
        destination: 'portfolio',
        createTasks: true,
    })
    eventIds.push(withTasks.eventId)
    check(
        'explicit task choice creates exact template count',
        withTasks.tasksCreated === 28 &&
            must(
                await admin
                    .from('tasks')
                    .select('id')
                    .eq('event_id', withTasks.eventId),
            ).length === 28,
    )
    check(
        'history survives fresh request',
        (await request('/api/discover-events')).jobs.some(
            (job) => job.id === created.id,
        ),
    )
} catch (e) {
    results.push({ name: 'smoke failure', passed: false, error: e.message })
    console.log(JSON.stringify(results.at(-1)))
    process.exitCode = 1
} finally {
    if (uid) {
        await admin
            .from('event_search_jobs')
            .update({ status: 'cancelled', lease_token: null })
            .eq('user_id', uid)
            .in('status', ['queued', 'running'])
        for (const row of must(
            await admin.from('events').select('id').eq('owner_id', uid),
        )) {
            const id = row.id
            must(await admin.from('tasks').delete().eq('event_id', id))
            must(await admin.from('events').delete().eq('id', id))
        }
        for (const id of queueIds)
            must(
                await admin.from('event_discovery_queue').delete().eq('id', id),
            )
        must(await admin.from('event_search_jobs').delete().eq('user_id', uid))
        for (const table of ['ai_request_limits', 'eventra_members'])
            must(await admin.from(table).delete().eq('user_id', uid))
        must(await admin.from('users').delete().eq('id', uid))
        must(await admin.auth.admin.deleteUser(uid))
    }
    writeFileSync(
        'audit-evidence/2026-09-06/search-smoke.json',
        JSON.stringify(
            { target, at: new Date().toISOString(), results },
            null,
            2,
        ),
    )
}
