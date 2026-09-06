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
