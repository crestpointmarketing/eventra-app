import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const owner = '10000000-0000-4000-8000-000000000001'
const colleague = '10000000-0000-4000-8000-000000000002'
const outsider = '10000000-0000-4000-8000-000000000003'
const event = '20000000-0000-4000-8000-000000000001'
const lead = '30000000-0000-4000-8000-000000000001'
const task = '40000000-0000-4000-8000-000000000001'

async function database() {
    const db = new PGlite()
    await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
        CREATE FUNCTION extensions.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
        CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_user::text$$;
        CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.email',true)$$;
        CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
        CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$SELECT string_to_array($1,'/')$$;
        GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;
        GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
    `)
    await db.exec(readFileSync('supabase/migrations/20260813010000_eventra_production_baseline.sql','utf8'))
    await db.exec(`
        INSERT INTO auth.users(id,email) VALUES('${owner}','owner@example.test'),('${colleague}','colleague@example.test'),('${outsider}','outsider@example.test');
        INSERT INTO public.events(id,name,event_type,owner_id) VALUES('${event}','Test event','Summit','${owner}');
        INSERT INTO public.leads(id,event_id,first_name,last_name,email,company,owner_id) VALUES('${lead}','${event}','Test','Lead','lead@example.test','Test','${colleague}');
        INSERT INTO public.tasks(id,event_id,title,assigned_to,status) VALUES('${task}','${event}','Task','${colleague}','done');
        INSERT INTO public.task_checklist_items(task_id,title) VALUES('${task}','Checklist');
    `)
    for (const file of readdirSync('supabase/migrations').filter(f=>f.startsWith('20260906')).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'))
    await db.exec("SET row_security=on")
    return db
}
async function asUser(db: PGlite, id: string) {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`)
}

test('search jobs isolate users, lease atomically, cancel safely and import transactionally', async () => {
    const db = await database()
    try {
        await asUser(db, outsider)
        await assert.rejects(db.query('SELECT public.create_event_search($1,$2)', [{ mode: 'discover' }, 'test']), /Membership required/)
        await asUser(db, owner)
        const job = (await db.query<{ id: string }>('SELECT public.create_event_search($1,$2) AS id', [{ mode: 'discover' }, 'test'])).rows[0].id
        await assert.rejects(db.query('SELECT public.create_event_search($1,$2)', [{ mode: 'discover' }, 'test']), /already running/)
        await assert.rejects(db.query('SELECT * FROM public.claim_event_search($1,$2)', ['test', job]), /permission denied/)
        await asUser(db, colleague)
        assert.equal((await db.query('SELECT * FROM public.event_search_jobs')).rows.length, 0)
        assert.equal((await db.query<{ cancelled: boolean }>('SELECT public.cancel_event_search($1) AS cancelled', [job])).rows[0].cancelled, false)
        await db.exec('RESET ROLE')
        const claimed = await db.query('SELECT * FROM public.claim_event_search($1,$2)', ['test', job])
        assert.equal(claimed.rows.length, 1)
        assert.equal((await db.query('SELECT * FROM public.claim_event_search($1,$2)', ['test', job])).rows.length, 0)
        const result = { id: 'result-1', name: 'Verified Test', category: 'strict', editionKey: 'series|organizer|2027', website_url: 'https://example.test', resolved: Object.fromEntries(Object.entries({ name: 'Verified Test', event_type: 'Summit', start_date: '2027-01-10', end_date: '2027-01-11', city: 'Toronto', country: 'Canada' }).map(([k, v]) => [k, { value: v, status: 'verified' }])) }
        await db.query("UPDATE public.event_search_jobs SET status='completed',results=$1 WHERE id=$2", [[result], job])
        await asUser(db, colleague)
        await assert.rejects(db.query('SELECT public.import_event_search($1,$2,false,$3)', [job, 'result-1', []]), /unavailable/)
        await asUser(db, owner)
        await assert.rejects(db.query('SELECT public.import_event_search($1,$2,false,$3)', [job, 'result-1', [{ title: 'Invalid', priority: 'invalid' }]]), /tasks_priority_check/)
        assert.equal((await db.query("SELECT * FROM public.events WHERE name='Verified Test'")).rows.length, 0)
        const imported = (await db.query<{ value: { eventId: string; skipped: boolean } }>('SELECT public.import_event_search($1,$2,false,$3) AS value', [job, 'result-1', []])).rows[0].value
        assert.equal(imported.skipped, false)
        assert.equal((await db.query('SELECT * FROM public.tasks WHERE event_id=$1', [imported.eventId])).rows.length, 0)
        assert.equal((await db.query<{ value: { skipped: boolean } }>('SELECT public.import_event_search($1,$2,false,$3) AS value', [job, 'result-1', []])).rows[0].value.skipped, true)
        const queued = (await db.query<{ id: string }>("INSERT INTO public.event_discovery_queue(type,status,event_data) VALUES('NEW','PENDING','{}') RETURNING id")).rows[0].id
        const payload = { name: 'Queue test', event_type: 'Summit' }
        const first = (await db.query<{ id: string }>('SELECT public.approve_discovery_item($1,$2,$3) AS id', [queued, payload, []])).rows[0].id
        const second = (await db.query<{ id: string }>('SELECT public.approve_discovery_item($1,$2,$3) AS id', [queued, payload, []])).rows[0].id
        assert.equal(first, second)
    } finally { await db.close() }
})

test('migrations enforce team membership, ownership, atomic deletion and shared projection', async () => {
    const db = await database()
    try {
        await db.exec('SET ROLE anon')
        await assert.rejects(db.query<any>('SELECT * FROM public.leads'), /permission denied/)
        await asUser(db, outsider)
        assert.equal((await db.query<any>('SELECT * FROM public.events')).rows.length,0)
        await assert.rejects(db.exec(`INSERT INTO public.events(name,event_type,owner_id) VALUES('Denied','Summit','${outsider}')`),/row-level security/)
        await asUser(db, colleague)
        assert.equal((await db.query<any>('SELECT * FROM public.events')).rows.length,1)
        const activity=(await db.query<any>("INSERT INTO public.lead_activities(lead_id,activity_type) VALUES($1,'email_recommended') RETURNING created_by",[lead])).rows[0]
        assert.equal(activity.created_by,colleague)
        await assert.rejects(db.query("INSERT INTO public.lead_activities(lead_id,activity_type,created_by) VALUES($1,'email_sent',$2)",[lead,owner]),/row-level security/)
        await assert.rejects(db.exec(`UPDATE public.events SET owner_id='${colleague}' WHERE id='${event}'`),/Owner permission/)
        await assert.rejects(db.query<any>('SELECT public.delete_events_atomic($1::uuid[])',[[event]]),/Only owners/)
        await asUser(db, owner)
        const token='a'.repeat(64)
        await db.exec(`UPDATE public.events SET share_token='${token}',share_expires_at=now()+interval '1 day' WHERE id='${event}'`)
        await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false); SET ROLE anon;")
        const shared = (await db.query<{value: Record<string,unknown>}>('SELECT public.get_shared_event($1) AS value',[token])).rows[0].value
        assert.equal(shared.name,'Test event'); assert.equal(shared.owner_id,undefined); assert.equal(shared.share_token,undefined)
        await asUser(db, owner)
        await db.exec(`UPDATE public.events SET share_expires_at=now()-interval '1 day' WHERE id='${event}'`)
        assert.equal((await db.query<any>('SELECT public.get_shared_event($1) AS value',[token])).rows[0].value,null)
        await db.exec(`RESET ROLE; CREATE FUNCTION public.fail_delete_test() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Injected failure'; END$$;
            CREATE TRIGGER fail_delete_test BEFORE DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.fail_delete_test();`)
        await asUser(db,owner)
        await assert.rejects(db.query<any>('SELECT public.delete_events_atomic($1::uuid[])',[[event]]),/Injected failure/)
        assert.equal((await db.query<any>('SELECT event_id FROM public.leads')).rows[0].event_id,event)
        assert.equal((await db.query<any>('SELECT * FROM public.task_checklist_items')).rows.length,1)
        await db.exec('RESET ROLE; DROP TRIGGER fail_delete_test ON public.events;')
        await asUser(db,owner)
        assert.equal((await db.query<any>('SELECT public.delete_events_atomic($1::uuid[]) AS n',[[event]])).rows[0].n,1)
        assert.equal((await db.query<any>('SELECT event_id FROM public.leads')).rows[0].event_id,null)
        assert.equal((await db.query<any>('SELECT * FROM public.tasks')).rows.length,0)
    } finally { await db.close() }
})

test('AI quota is atomic across concurrent callers and inaccessible to outsiders', async () => {
    const db = await database()
    try {
        await asUser(db,outsider)
        await assert.rejects(db.query<any>('SELECT public.consume_ai_request()'),/Membership required/)
        await asUser(db,owner)
        const responses=await Promise.all(Array.from({length:25},()=>db.query<{allowed:boolean}>('SELECT public.consume_ai_request() AS allowed')))
        assert.equal(responses.filter(r=>r.rows[0].allowed).length,20)
        await assert.rejects(db.exec('DELETE FROM public.ai_request_limits'),/permission denied/)
    } finally { await db.close() }
})

test('template edits roll back on child failure and reject stale versions', async () => {
    const db=await database()
    try {
        await asUser(db,owner)
        const payload={name:'Original',category:'follow_up',goal:'book_meeting',subjects:[{subject:'Hello',sort_order:1}],
            blocks:[{block_type:'opening',content:'Hello {{first_name}}',sort_order:1,allowed_vars:['first_name']}],
            cta:{cta_type:'reply',cta_text:'Reply'}}
        const row=(await db.query<any>('SELECT * FROM public.save_email_template($1::jsonb)',[JSON.stringify(payload)])).rows[0]
        const bad={...payload,id:row.id,expected_version:row.version,name:'Should roll back',blocks:[{block_type:'invalid',content:'x'}]}
        await assert.rejects(db.query('SELECT * FROM public.save_email_template($1::jsonb)',[JSON.stringify(bad)]),/invalid input value/)
        assert.equal((await db.query<any>('SELECT name FROM public.email_templates WHERE id=$1',[row.id])).rows[0].name,'Original')
        assert.equal((await db.query<any>('SELECT subject FROM public.email_template_subjects WHERE template_id=$1',[row.id])).rows[0].subject,'Hello')
        await assert.rejects(db.query('SELECT * FROM public.save_email_template($1::jsonb)',[JSON.stringify({...payload,id:row.id,expected_version:0})]),/Template changed/)
        const updated=(await db.query<any>('SELECT * FROM public.save_email_template($1::jsonb)',[JSON.stringify({...payload,id:row.id,expected_version:row.version,name:'Updated'})])).rows[0]
        assert.equal(updated.version,row.version+1)
        await asUser(db,colleague)
        assert.equal((await db.query('SELECT * FROM public.email_templates')).rows.length,1)
        await assert.rejects(db.query('SELECT * FROM public.save_email_template($1::jsonb)',[JSON.stringify({...payload,id:row.id,expected_version:updated.version})]),/Owner required/)
    } finally { await db.close() }
})
