import test from 'node:test'
import assert from 'node:assert/strict'
import { isPublicAddress, validatePublicUrl } from '../src/lib/security/public-fetch'
import { createLeadSchema, leadForAI } from '../src/lib/leads/model'
import { calculateBasicAnalytics } from '../src/lib/analytics'
import { fetchAllRows } from '../src/lib/api/pagination'

test('SSRF rejects private, reserved and mapped addresses', () => {
    for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1']) assert.equal(isPublicAddress(ip),false,ip)
    assert.equal(isPublicAddress('8.8.8.8'),true)
    for(const url of ['file:///etc/passwd','http://user:pass@example.com','http://localhost','http://example.com:8080']) assert.throws(()=>validatePublicUrl(url))
})
test('lead mapping retains actual name, notes and status; creation accepts an unlinked lead',()=>{
    const parsed=createLeadSchema.parse({first_name:'A',email:'TEST@example.com',event_id:''})
    assert.equal(parsed.email,'test@example.com');assert.equal(parsed.event_id,null);assert.equal(parsed.stage,'new')
    assert.throws(()=>createLeadSchema.parse({first_name:'A',email:'invalid'}))
    const ai=leadForAI({id:'a',email:'a@example.test',first_name:'Ada',last_name:'Lovelace',stage:'qualified',raw_notes:'Requested demo',job_title:'CTO'})
    assert.equal(ai.name,'Ada Lovelace');assert.equal(ai.notes,'Requested demo');assert.equal(ai.status,'qualified');assert.equal(ai.title,'CTO')
})
test('conversion counts converted leads instead of hot leads',()=>{
    assert.equal(calculateBasicAnalytics([],[{stage:'new',lead_score:90},{stage:'converted',lead_score:30}]).conversionRate,50)
})
test('full list reads beyond the first 1000 records and propagates page failure',async()=>{
    const source=Array.from({length:1205},(_,id)=>({id}))
    const result=await fetchAllRows(async(a,b)=>({data:source.slice(a,b+1),error:null}))
    assert.equal(result.length,1205)
    await assert.rejects(fetchAllRows(async()=>({data:null,error:new Error('Unavailable')})),/Unavailable/)
})
test('dashboard keeps only committed engagements, honoring legacy discovery_priority', async () => {
    const { isCommittedEvent, eventEngagement } = await import('../src/lib/events/taxonomy')
    assert.equal(isCommittedEvent({ engagement_type: 'Sponsor' }), true)
    assert.equal(isCommittedEvent({ engagement_type: 'exhibitor' }), true)
    assert.equal(isCommittedEvent({ engagement_type: 'Attend' }), true)
    assert.equal(isCommittedEvent({ engagement_type: 'Follow' }), false)
    assert.equal(isCommittedEvent({ engagement_type: 'Speaking' }), false)
    assert.equal(isCommittedEvent({ engagement_type: null, discovery_priority: 'sponsor' }), true)
    assert.equal(isCommittedEvent({}), false)
    assert.equal(eventEngagement({ engagement_type: null, discovery_priority: 'attend' }), 'Attend')
})
test('post-login redirect only accepts same-site paths', async () => {
    const { safeNextPath } = await import('../src/lib/auth/next-path')
    assert.equal(safeNextPath('/events/abc?tab=leads'), '/events/abc?tab=leads')
    for (const bad of [null, '', 'https://evil.test', '//evil.test', String.raw`/\evil.test`, '/login', '/auth/callback'])
        assert.equal(safeNextPath(bad), '/dashboard', String(bad))
})
test('CSV export keeps headers when empty and neutralises formulas', async () => {
    const { convertToCSV } = await import('../src/lib/export')
    assert.equal(convertToCSV([], ['a', 'b']), 'a,b')
    assert.equal(convertToCSV([{ a: '=HYPERLINK("x")', b: 'plain, text' }], ['a', 'b']), `a,b\n"'=HYPERLINK(""x"")","plain, text"`)
    assert.equal(convertToCSV([{ a: '@SUM(1)', b: 5 }], ['a', 'b']), "a,b\n'@SUM(1),5")
})
test('analytics groups event types regardless of stored spelling', async () => {
    const { analyzeEventsByType } = await import('../src/lib/analytics')
    assert.deepEqual(analyzeEventsByType([{ event_type: 'Conference' }, { event_type: 'conference' }, { event_type: 'trade_show' }, { event_type: null }]),
        { Conference: 2, 'Trade Show': 1, Unknown: 1 })
})
