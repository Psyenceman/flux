import test from 'node:test';import assert from 'node:assert/strict';
import {CONNECTORS} from '../studio/connector-catalog.js';
import {TOKEN_PROVIDERS,verifyCredential} from '../netlify/functions/connector-verification.mjs';
import {encodeFields} from '../studio/structured-config.js';
import {readFileSync} from 'node:fs';
test('catalog covers every external palette connector with connection and execution states',()=>{const html=readFileSync('studio/flow-canvas.html','utf8');const declared=[...html.matchAll(/\['([a-z]+)','[^']+','(?:planned|not implemented|trigger \/ action|read-only trigger)'\]/g)].map(x=>x[1]);const internal=new Set(['manual','filter','mapper','flux','log','merge','delay','router','loop','schedule','webhook']);for(const id of declared){if(internal.has(id))continue;assert.ok(CONNECTORS[id],id);}for(const id of TOKEN_PROVIDERS)assert.equal(CONNECTORS[id].connection,'token');for(const spec of Object.values(CONNECTORS)){assert.ok(spec.help);assert.ok(spec.execution);assert.ok(spec.actions);}});
test('all token verifiers use fixed endpoints, scoped headers and no redirects',async t=>{const replies={airtable:{id:'u'},hubspot:{results:[]},notion:{object:'user'},github:{login:'u',id:1},miro:{data:[]},slack:{ok:true},openai:{data:[]},cloudflare:{success:true,result:{status:'active'}},resend:{data:[]}};for(const provider of TOKEN_PROVIDERS){t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(new URL(url).protocol,'https:');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,'Bearer test-secret');return new Response(JSON.stringify(replies[provider]));});assert.equal(await verifyCredential(provider,'test-secret'),true);t.mock.restoreAll();}});
test('HTTP 200 with provider-level failure never saves a credential',async t=>{t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({ok:false,success:false,error:'invalid_auth'})));assert.equal(await verifyCredential('slack','x'),false);assert.equal(await verifyCredential('cloudflare','x'),false);});
test('structured forms encode typed fields and reject duplicates/invalid values',()=>{assert.deepEqual(JSON.parse(encodeFields([{key:'name',type:'text',value:'{{input.name}}'},{key:'count',type:'number',value:'3'}])),{name:'{{input.name}}',count:3});assert.equal(encodeFields([{type:'boolean',value:'true'}],true),'[true]');assert.throws(()=>encodeFields([{key:'x',value:'1'},{key:'x',value:'2'}]),/unique/);assert.throws(()=>encodeFields([{key:'n',type:'number',value:'bad'}]),/number/);});

test('credential save ignores supplied owner and encrypts only after semantic verification',async t=>{
 const {handler}=await import('../netlify/functions/flux-connector-connections.mjs');
 const previous={service:process.env.FLUX_SUPABASE_SERVICE_ROLE_KEY,key:process.env.FLUX_CONNECTION_ENCRYPTION_KEY};process.env.FLUX_SUPABASE_SERVICE_ROLE_KEY='test-service';process.env.FLUX_CONNECTION_ENCRYPTION_KEY='test-encryption-material-32-characters-long';
 t.after(()=>{for(const [key,value] of [['FLUX_SUPABASE_SERVICE_ROLE_KEY',previous.service],['FLUX_CONNECTION_ENCRYPTION_KEY',previous.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
 let accept=false,saved=null;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url.includes('/auth/v1/user'))return new Response(JSON.stringify({id:'verified-owner',aud:'authenticated'}));
  if(url==='https://slack.com/api/auth.test')return new Response(JSON.stringify({ok:accept}));
  if(url.endsWith('/rest/v1/flux_connector_credentials')){saved=JSON.parse(options.body);return new Response('[]');}
  throw Error('Unexpected request');
 });
 const event={httpMethod:'POST',headers:{authorization:'Bearer test-session'},body:JSON.stringify({provider:'slack',owner_id:'foreign-owner',token:'xoxb-test-secret12345',label:'My workspace'})};
 assert.equal((await handler(event)).statusCode,422);assert.equal(saved,null);
 accept=true;const result=await handler(event);assert.equal(result.statusCode,200);assert.equal(saved.owner_id,'verified-owner');assert.notEqual(saved.token_ciphertext,'xoxb-test-secret12345');assert.equal(result.body.includes('xoxb-test-secret12345'),false);
});
