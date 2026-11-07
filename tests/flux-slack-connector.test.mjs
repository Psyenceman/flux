import test from 'node:test';
import assert from 'node:assert/strict';
import {listSlackChannels,checkSlackChannel,sendSlackMessage} from '../netlify/functions/slack-connector.mjs';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
import {handler} from '../netlify/functions/flux-graph.mjs';
import {handler as resources} from '../netlify/functions/slack-resources.mjs';
import {encrypt} from '../netlify/functions/trello-shared.mjs';
import {liveWorkflowKind} from '../studio/workflow-live-policy.js';
import {slackChannelController} from '../studio/slack-resource-picker.js';
const channel='C0123456789',token='xoxb-test-owner-secret';
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const member={id:channel,name:'flux-test',is_member:true,is_archived:false};
const workflow=()=>({version:1,nodes:[{id:'start',type:'manual'},{id:'map',type:'mapper',config:{mapping:'{"greeting":"Hello {{input.name}}"}'}},{id:'s',type:'slack',config:{operation:'send',channel,message:'{{map.greeting}}'}}],edges:[{from:'start',to:'map'},{from:'map',to:'s'}]});
function env(t){const names=['FLUX_CONNECTION_ENCRYPTION_KEY','FLUX_SUPABASE_SERVICE_ROLE_KEY'];const previous=names.map(n=>process.env[n]);process.env[names[0]]='test-key-material-with-at-least-32-characters';process.env[names[1]]='test-service';t.after(()=>names.forEach((n,i)=>{if(previous[i]===undefined)delete process.env[n];else process.env[n]=previous[i];}));}
test('Slack resources page uses fixed origin and only active joined public channels',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{const u=new URL(url);assert.equal(u.origin+u.pathname,'https://slack.com/api/conversations.list');assert.equal(u.searchParams.get('types'),'public_channel');assert.equal(u.searchParams.get('cursor'),'next=page');assert.equal(options.headers.authorization,'Bearer '+token);assert.equal(options.redirect,'error');return response({ok:true,channels:[member,{...member,id:'C1111111111',is_member:false},{...member,id:'C2222222222',is_archived:true}],response_metadata:{next_cursor:'page2'}});});
 const data=await listSlackChannels(token,'next=page');assert.deepEqual(data.items,[{id:channel,name:'flux-test'}]);assert.equal(data.nextCursor,'page2');assert.equal(JSON.stringify(data).includes(token),false);
});
test('Slack semantic and HTTP failures never fabricate success or echo response secrets',async t=>{
 for(const [body,status,pattern] of [[{ok:false,error:'missing_scope'},200,/permission missing/],[{ok:false,error:'secret-in-untrusted-error'},200,/rejected/],[{},429,/limit reached/]]){
  t.mock.method(globalThis,'fetch',async()=>response(body,status));await assert.rejects(listSlackChannels(token),pattern);t.mock.restoreAll();
 }
});
test('Slack rejects arbitrary destinations, user tokens and invalid message fields before network',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No network allowed');});
 await assert.rejects(checkSlackChannel(token,'https://evil.test'),/choose/);
 await assert.rejects(listSlackChannels('xoxp-user'),/bot token/);
 await assert.rejects(sendSlackMessage({channel,message:''},token),/message/);
 await assert.rejects(sendSlackMessage({channel,message:'x'.repeat(4001)},token),/message/);
});
test('Slack live send checks membership, sends literal text and returns a delivery identifier',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push(String(url));if(String(url).includes('conversations.info'))return response({ok:true,channel:member});assert.equal(String(url),'https://slack.com/api/chat.postMessage');assert.equal(options.method,'POST');const body=JSON.parse(options.body);assert.equal(body.text,'Hello &lt;!channel&gt; &amp; everyone');assert.equal(body.mrkdwn,false);assert.equal(body.unfurl_links,false);assert.equal(body.channel,channel);assert.equal(options.redirect,'error');return response({ok:true,channel,ts:'1234567890.123456'});});
 const result=await sendSlackMessage({channel,message:'Hello <!channel> & everyone'},token);assert.equal(result.delivered,true);assert.equal(result.messageId,'1234567890.123456');assert.equal(calls.length,2);
});
test('Slack denies unjoined, archived, private and foreign channel responses without sending',async t=>{
 for(const data of [{...member,is_member:false},{...member,is_archived:true},{...member,is_private:true},{...member,id:'C9999999999'}]){let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return response({ok:true,channel:data});});await assert.rejects(sendSlackMessage({channel,message:'Hello'},token),/active public/);assert.equal(calls,1);t.mock.restoreAll();}
});
test('ambiguous Slack write timeouts are not retried',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async url=>{if(String(url).includes('conversations.info'))return response({ok:true,channel:member});writes++;throw Error('timeout');});await assert.rejects(sendSlackMessage({channel,message:'Hello'},token),/Check the channel before retrying/);assert.equal(writes,1);
});
test('safe Slack preview resolves connected output and never contacts Slack',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No external calls in preview');});const result=await executeGraph(workflow(),{name:'Flux'},{dryRun:true});assert.equal(result.ok,true);assert.equal(result.outputs.s.message,'Hello Flux');assert.equal(result.trace[2].status,'simulated');assert.equal(result.outputs.s.delivered,undefined);
 const disconnected=workflow();disconnected.edges=[];const rejected=await executeGraph(disconnected,{},{dryRun:true});assert.equal(rejected.ok,false);assert.match(rejected.error,/unconnected/);
});
test('Slack graph executes real delivery and propagates output, filtered branches never send',async t=>{
 t.mock.method(globalThis,'fetch',async url=>String(url).includes('conversations.info')?response({ok:true,channel:member}):response({ok:true,channel,ts:'123.456'}));const g=workflow();g.nodes.push({id:'end',type:'log'});g.edges.push({from:'s',to:'end'});const result=await executeGraph(g,{name:'Flux'},{dryRun:false,slackToken:token});assert.equal(result.outputs.end.delivered,true);assert.equal(result.trace[2].status,'completed');
 t.mock.method(globalThis,'fetch',()=>{throw Error('Filtered branch must not call Slack');});g.nodes[1]={id:'map',type:'filter',config:{operation:'approved'}};const filtered=await executeGraph(g,{status:'rejected'},{dryRun:false,slackToken:token});assert.equal(filtered.ok,true);assert.equal(filtered.trace[2].status,'skipped');
});
test('live policy permits one Slack send with supported steps and denies unrelated writes',()=>{
 assert.equal(liveWorkflowKind(workflow()),'slack');
 for(const node of [{id:'x',type:'http'},{id:'x',type:'airtable',config:{operation:'create_record'}},{id:'x',type:'slack',config:{operation:'send'}},{id:'x',type:'openai'},null]){const g=workflow();g.nodes.push(node);assert.equal(liveWorkflowKind(g),null);}
 const g=workflow();g.nodes.push({id:'x',type:'github',config:{operation:'list_issues'}});assert.equal(liveWorkflowKind(g),'slack');
 assert.equal(liveWorkflowKind({nodes:[{type:'trello',config:{operation:'create_card'}}],edges:[]}), 'trello');
});
test('authenticated graph loads only owner Slack credential and confirms before credit or delivery',async t=>{
 env(t);const calls=[];let missing=false,denied=false;
 t.mock.method(globalThis,'fetch',async(url,options)=>{url=String(url);calls.push(url);if(url.includes('/auth/v1/user'))return response({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?')){assert.match(url,/owner_id=eq.owner-a&provider=eq.slack/);return response(missing?[]:[{token_ciphertext:encrypt(token)}]);}if(url.includes('conversations.info'))return response({ok:true,channel:{...member,is_member:!denied}});if(url.includes('flux_consume_credit'))return response({ok:true});if(url.includes('chat.postMessage')){assert.equal(options.headers.authorization,'Bearer '+token);assert.equal(JSON.parse(options.body).text,'Hello Flux');return response({ok:true,channel,ts:'123.456'});}throw Error('Unexpected '+url);});
 const event=extra=>({httpMethod:'POST',headers:{authorization:'Bearer session-test'},body:JSON.stringify({graph:workflow(),input:{name:'Flux'},dryRun:false,owner_id:'foreign-owner',...extra})});
 assert.equal((await handler(event({}))).statusCode,403);assert.equal(calls.some(x=>x.includes('consume_credit')),false);
 missing=true;assert.equal((await handler(event({confirmLiveSlack:true}))).statusCode,409);assert.equal(calls.some(x=>x.includes('consume_credit')),false);
 missing=false;denied=true;assert.equal((await handler(event({confirmLiveSlack:true}))).statusCode,409);assert.equal(calls.some(x=>x.includes('consume_credit')),false);
 denied=false;const result=await handler(event({confirmLiveSlack:true}));assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).outputs.s.delivered,true);assert.equal(result.body.includes(token),false);assert.equal(calls.filter(x=>x.includes('chat.postMessage')).length,1);
});
test('resource endpoint isolates owner, paginates, rejects missing auth and never returns token',async t=>{
 env(t);t.mock.method(globalThis,'fetch',async url=>{url=String(url);if(url.includes('/auth/v1/user'))return response({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?')){assert.match(url,/owner_id=eq.owner-a&provider=eq.slack/);return response([{token_ciphertext:encrypt(token)}]);}assert.match(url,/^https:\/\/slack.com\/api\/conversations.list\?/);return response({ok:true,channels:[member],response_metadata:{next_cursor:'p2'}});});
 assert.equal((await resources({httpMethod:'GET',headers:{}})).statusCode,401);const r=await resources({httpMethod:'GET',headers:{authorization:'Bearer test-session'},queryStringParameters:{owner_id:'foreign-owner'}});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).nextCursor,'p2');assert.equal(r.body.includes(token),false);
});
test('channel selector preserves saved choice across pages and rejects stale responses',async()=>{
 let state;const draft={channel};const pages=[{items:[],nextCursor:'p2'},{items:[{id:channel,name:'flux-test'}],nextCursor:''}];const c=slackChannelController({draft,load:async()=>pages.shift(),render:s=>state=s});await c.refresh();assert.equal(state.more,true);assert.notEqual(c.validate(),'');await c.more();assert.equal(c.validate(),'');assert.equal(draft.channelName,'flux-test');c.dispose();
 const pending=[];let renders=0;const race=slackChannelController({draft:{},load:()=>new Promise(resolve=>pending.push(resolve)),render:s=>{state=s;renders++;}});const old=race.refresh(),fresh=race.refresh();pending[1]({items:[{id:channel,name:'fresh'}]});await fresh;pending[0]({items:[{id:'C9999999999',name:'stale'}]});await old;assert.equal(state.items[0].name,'fresh');race.select(channel);assert.equal(race.validate(),'');const count=renders;race.dispose();race.select(channel);assert.equal(renders,count);
});
test('clearing channel selection prevents saving the previous destination',async()=>{
 const draft={channel};const c=slackChannelController({draft,load:async()=>({items:[{id:channel,name:'test'}]}),render:()=>{}});await c.refresh();assert.equal(c.validate(),'');c.select('');assert.notEqual(c.validate(),'');assert.equal(draft.channel,'');c.dispose();
});
test('authenticated safe preview loads personal connection but never posts a message',async t=>{
 env(t);const urls=[];t.mock.method(globalThis,'fetch',async url=>{url=String(url);urls.push(url);if(url.includes('/auth/v1/user'))return response({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?'))return response([{token_ciphertext:encrypt(token)}]);if(url.includes('flux_consume_credit'))return response({ok:true});throw Error('Safe preview must not contact Slack');});const r=await handler({httpMethod:'POST',headers:{authorization:'Bearer session-test'},body:JSON.stringify({graph:workflow(),input:{name:'Flux'},dryRun:true})});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).outputs.s.simulated,true);assert.equal(urls.some(u=>u.includes('slack.com')),false);
});
