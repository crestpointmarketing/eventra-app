// Explicit manual release check. Uses isolated synthetic records; never logs credentials.
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const cli=join(dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
const run=(args)=>execFileSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8e6});
const keys=JSON.parse(run(['supabase','projects','api-keys','--project-ref','tbicyyhprqbhimhrihgn','--output','json']));
const url='https://tbicyyhprqbhimhrihgn.supabase.co';
const admin=createClient(url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const anon=keys.find(k=>k.name==='anon').api_key;
const jar=new Map();
const db=createServerClient(url,anon,{cookies:{getAll:()=>Array.from(jar,([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
const deployment=process.argv[2];if(!deployment)throw Error('Deployment URL required');
let uid,templateId,filePath;const eid=randomUUID(),lid=randomUUID(),tid=randomUUID();const results=[];
const must=(r)=>{if(r.error)throw Error(r.error.message);return r.data};
async function request(path,body,auth=true,expected=200){
 const args=['vercel','curl',path,'--deployment',deployment,'--','--silent','--show-error','--max-time','100','--write-out','\\n__STATUS__%{http_code}'];
 if(auth)args.push('--header',`Cookie: ${Array.from(jar,([n,v])=>`${n}=${v}`).join('; ')}`);
 if(body!==undefined)args.push('--request','POST','--header','Content-Type: application/json','--data',JSON.stringify(body));
 let output;try{output=run(args)}catch{results.push({path,passed:false,error:'Request execution failed'});console.log(JSON.stringify(results.at(-1)));return null}
 const marker=output.lastIndexOf('__STATUS__');const status=Number(output.slice(marker+10).trim());
 let data;try{data=JSON.parse(output.slice(0,marker).trim())}catch{data=null}
 const result={path,status,passed:status===expected,json:!!data,...(data?.error?{error:String(data.error).slice(0,180)}:{})};
 results.push(result);console.log(JSON.stringify(result));return data;
}
try{
 const email=`eventra-smoke-${Date.now()}@example.test`,password=randomBytes(32).toString('hex');
 uid=must(await admin.auth.admin.createUser({email,password,email_confirm:true})).user.id;
 must(await admin.from('eventra_members').insert({user_id:uid}));
 must(await db.auth.signInWithPassword({email,password}));
 must(await db.from('events').insert({id:eid,name:'Synthetic release test AI workshop',event_type:'Summit',owner_id:uid,start_date:'2026-12-01',end_date:'2026-12-02',location:'London',description:'A synthetic workshop for software teams.'}));
 must(await db.from('leads').insert({id:lid,event_id:eid,owner_id:uid,first_name:'Synthetic',last_name:'Test',email:'lead@example.test',company:'Example Test Ltd',job_title:'IT Director',raw_notes:'Synthetic fixture: interested in a cloud assessment next quarter.',stage:'new'}));
 must(await db.from('tasks').insert({id:tid,event_id:eid,title:'Synthetic venue checklist',assigned_to:uid,status:'done',due_date:'2026-11-01'}));
 templateId=must(await db.rpc('save_email_template',{payload:{name:'Synthetic release test template',category:'follow_up',goal:'book_meeting',subjects:[{subject:'Hello {{first_name}}',sort_order:1}],blocks:[{block_type:'opening',content:'Hello {{first_name}}, thank you for your interest.',sort_order:1,allowed_vars:['first_name']}],cta:{cta_type:'reply',cta_text:'Reply to schedule a call'}}})).id;
 await request('/api/ai/generate-content',{type:'task_description',context:{taskTitle:'Synthetic smoke test',outcome:'Check connectivity'}},false,401);
 await request('/api/ai/score-lead',{leadId:'invalid'},true,400);
 await request('/api/ai/generate-content',{type:'task_description',context:{taskTitle:'Synthetic smoke test',outcome:'Check connectivity'}});
 for(const name of ['score-lead','summarize-lead','qualify-lead'])await request(`/api/ai/${name}`,{leadId:lid});
 for(const name of ['generate-tasks','analyze-event','analyze-risks','analyze-dependencies'])await request(`/api/ai/${name}`,{eventId:eid});
 await request('/api/ai/predict-completion',{taskId:tid});
 const progress=await request(`/api/ai/progress-insights?eventId=${eid}`);
 results.push({check:'completed-task-progress',passed:progress?.completionRate===100 && progress?.atRiskTasks===0});
 for(const name of ['generate-email-draft','generate-subject-lines','recommend-email'])await request(`/api/ai/${name}`,{leadId:lid,templateId,count:3});
 await request('/api/discover-events',{knownDetails:'The AI Summit London 2026',years:[2026],topics:[],regions:[]});
 must(await db.rpc('mark_lead_sent',{lead_id:lid,subject:'Synthetic smoke test'}));
 const contacted=must(await db.from('leads').select('last_contacted_at').eq('id',lid).single());
 const history=must(await db.from('lead_activities').select('activity_type,created_by').eq('lead_id',lid));
 results.push({check:'email-history-and-contact-date',passed:!!contacted.last_contacted_at && ['email_sent','email_drafted','email_recommended'].every(type=>history.some(a=>a.activity_type===type&&a.created_by===uid))});
 filePath=`${uid}/release-smoke.txt`;
 must(await db.storage.from('event-assets').upload(filePath,'Synthetic release test',{contentType:'text/plain'}));
 const signed=must(await db.storage.from('event-assets').createSignedUrl(filePath,60));
 const downloaded=await fetch(signed.signedUrl);
 const publicFile=await fetch(`${url}/storage/v1/object/public/event-assets/${filePath}`);
 results.push({check:'private-storage-signed-read',passed:downloaded.ok && !publicFile.ok});
 const shared=await request(`/api/events/${eid}/share`,{});
 if(shared)results.push({check:'share-created',passed:!!(shared.shareToken||shared.share_token||shared.shareUrl||shared.token)});
 await request('/api/events/bulk-delete',{ids:[eid]});
 const remaining=must(await db.from('leads').select('event_id').eq('id',lid).single());
 results.push({check:'lead-preserved-after-event-delete',passed:remaining.event_id===null});
}catch(e){results.push({check:'fixture-or-assertion',passed:false,error:e.message});console.log(JSON.stringify(results.at(-1)))}
finally{
 if(uid){
  if(filePath){const r=await admin.storage.from('event-assets').remove([filePath]);results.push({check:'cleanup-test-file',passed:!r.error});}
  if(templateId)must(await admin.from('email_templates').delete().eq('id',templateId));
  for(const [table,column,value] of [['lead_activities','lead_id',lid],['ai_insights','user_id',uid],['ai_usage','user_id',uid],['ai_request_limits','user_id',uid],['tasks','id',tid],['leads','id',lid],['events','id',eid],['eventra_members','user_id',uid],['users','id',uid]]){
   const r=await admin.from(table).delete().eq(column,value);if(r.error)results.push({check:`cleanup-${table}`,passed:false,error:r.error.message});
  }
  const r=await admin.auth.admin.deleteUser(uid);results.push({check:'cleanup-test-account',passed:!r.error,...(r.error?{error:r.error.message}:{})});
 }
 writeFileSync('audit-evidence/2026-09-06/production-smoke.json',JSON.stringify({deployment,at:new Date().toISOString(),results},null,2));
}
if(results.some(r=>!r.passed))process.exitCode=1;
