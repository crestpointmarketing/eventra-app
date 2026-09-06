// Manual browser QA fixture; credential state is ignored by Git and removed on cleanup.
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const cli=join(dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
const keys=JSON.parse(execFileSync(process.execPath,[cli,'supabase','projects','api-keys','--project-ref','tbicyyhprqbhimhrihgn','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const db=createClient('https://tbicyyhprqbhimhrihgn.supabase.co',keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const file='.env.ui-smoke.json';
const must=r=>{if(r.error)throw Error(r.error.message);return r.data};
if(process.argv[2]==='create'){
 const user=must(await db.auth.admin.createUser({email:process.argv[3],password:process.argv[4],email_confirm:true})).user;
 writeFileSync(file,JSON.stringify({id:user.id}));
 must(await db.from('eventra_members').insert({user_id:user.id}));console.log('Temporary UI fixture ready');
}else{
 const {id}=JSON.parse(readFileSync(file,'utf8'));
 for(const [table,column] of [['ai_usage','user_id'],['ai_insights','user_id'],['ai_request_limits','user_id'],['eventra_members','user_id'],['users','id']])must(await db.from(table).delete().eq(column,id));
 must(await db.auth.admin.deleteUser(id));unlinkSync(file);console.log('Temporary UI fixture removed');
}
