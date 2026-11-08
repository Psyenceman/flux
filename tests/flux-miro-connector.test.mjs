import test from 'node:test';
import assert from 'node:assert/strict';
import {listMiroBoards,listMiroCards,executeMiro} from '../netlify/functions/miro-connector.mjs';
import {handler} from '../netlify/functions/flux-graph.mjs';
import {handler as resources} from '../netlify/functions/miro-resources.mjs';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
import {encrypt} from '../netlify/functions/trello-shared.mjs';
import {miroResourceController} from '../studio/miro-resource-picker.js';
import {liveWorkflowKind} from '../studio/workflow-live-policy.js';
const board='uXjTESTabc=',card='3074457353169356300',token='personal-miro-test-token';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status});
const graph=(operation='create_card')=>({version:1,nodes:[{id:'start',type:'manual'},{id:'m',type:'miro',config:{operation,board,itemId:card,title:'Hello {{input.name}}',message:'Only a test'}}],edges:[{from:'start',to:'m'}]});
function env(t){const names=['FLUX_CONNECTION_ENCRYPTION_KEY','FLUX_SUPABASE_SERVICE_ROLE_KEY'],old=names.map(n=>process.env[n]);process.env[names[0]]='test-key-material-with-at-least-32-characters';process.env[names[1]]='service-test';t.after(()=>names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];}));}
test('Miro lists fixed-host named resources with bounded pagination and no credential leakage',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{const u=new URL(url);assert.equal(u.origin,'https://api.miro.com');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,'Bearer '+token);if(u.pathname==='/v2/boards'){assert.equal(u.searchParams.get('offset'),'0');assert.equal(u.searchParams.get('limit'),'50');return reply({data:[{id:board,name:'Test board'}],total:51});}assert.equal(u.pathname,'/v2/boards/'+encodeURIComponent(board)+'/items');assert.equal(u.searchParams.get('type'),'card');assert.equal(u.searchParams.get('cursor'),'p1');return reply({data:[{id:card,type:'card',data:{title:'<p>Task</p>',description:'Details'}},{id:'2',type:'shape'}],cursor:'p2'});});
 const boards=await listMiroBoards(token);assert.deepEqual(boards.items,[{id:board,name:'Test board'}]);assert.equal(boards.nextCursor,'50');const cards=await listMiroCards(token,board,'p1');assert.equal(cards.items.length,1);assert.equal(cards.items[0].name,'Task');assert.equal(cards.nextCursor,'p2');assert.equal(JSON.stringify(cards).includes(token),false);
});
test('Miro rejects hostile resource paths and unsupported writes before network',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No network expected');});for(const id of ['https://evil.test','../secret','a?x=1'])await assert.rejects(executeMiro({board:id,operation:'find_items'},token),/choose/);
 await assert.rejects(executeMiro({board,operation:'delete'},token),/unsupported/);await assert.rejects(executeMiro({board,operation:'update_item',itemId:'../x',title:'T'},token),/card/);await assert.rejects(listMiroBoards(token,'-1'),/page/);await assert.rejects(listMiroCards(token,board,'x'.repeat(501)),/selection/);
});
test('Miro provider failure and invalid success responses never fabricate data',async t=>{
 for(const [data,status,pattern] of [[{},403,/access denied/],[{},429,/limit reached/],[{},200,/invalid board list/],[{data:[],total:-1},200,/invalid board list/]]){t.mock.method(globalThis,'fetch',async()=>reply(data,status));await assert.rejects(listMiroBoards(token),pattern);t.mock.restoreAll();}
});
test('Miro create checks board and sends escaped card data to stable v2 endpoint',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{const u=new URL(url);if(options.method==='GET')return reply({id:board,name:'Test board'});writes++;assert.equal(u.pathname,'/v2/boards/'+encodeURIComponent(board)+'/cards');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{data:{title:'Hello &lt;b&gt;',description:'A &amp; B'}});return reply({id:card,type:'card',data:{title:'Hello &lt;b&gt;'}},201);});
 const result=await executeMiro({operation:'create_card',board,title:'Hello <b>',message:'A & B'},token);assert.equal(result.created,true);assert.equal(result.id,card);assert.equal(writes,1);assert.match(result.url,/^https:\/\/miro.com\/app\/board\//);
});
test('Miro update targets an existing card and preserves unrelated properties',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{assert.match(String(url),new RegExp('/cards/'+card+'$'));if(options.method==='GET')return reply({id:card,type:'card',data:{title:'Old'}});writes++;assert.equal(options.method,'PATCH');assert.deepEqual(JSON.parse(options.body),{data:{title:'New title'}});return reply({id:card,type:'card',data:{title:'New title'}});});const result=await executeMiro({operation:'update_item',board,itemId:card,title:'New title'},token);assert.equal(result.updated,true);assert.equal(writes,1);
});
test('Miro denies wrong target responses and does not retry ambiguous writes',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='GET')return reply({id:'foreign',name:'Wrong'});writes++;throw Error('timeout');});await assert.rejects(executeMiro({operation:'create_card',board,title:'Test'},token),/unavailable/);assert.equal(writes,0);
 t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='GET')return reply({id:board});writes++;throw Error('timeout');});await assert.rejects(executeMiro({operation:'create_card',board,title:'Test'},token),/Check the board before retrying/);assert.equal(writes,1);
});
test('Miro preview maps upstream values without network, invalid mapping is rejected',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No network in preview');});const g=graph();const result=await executeGraph(g,{name:'Flux'},{dryRun:true});assert.equal(result.ok,true);assert.equal(result.trace[1].status,'simulated');assert.equal(result.outputs.m.title,'Hello Flux');g.edges=[];g.nodes[1].config.title='{{start.name}}';const bad=await executeGraph(g,{},{dryRun:true});assert.equal(bad.ok,false);assert.match(bad.error,/unconnected/);
});
test('Miro real read feeds downstream while filtering the first page explicitly',async t=>{
 t.mock.method(globalThis,'fetch',async()=>reply({data:[{id:card,type:'card',data:{title:'Task'}},{id:'2',type:'card',data:{title:'Other'}}],cursor:'next'}));const g=graph('find_items');g.nodes[1].config.query='Task';g.nodes.push({id:'end',type:'log'});g.edges.push({from:'m',to:'end'});const r=await executeGraph(g,{},{dryRun:true,miroToken:token});assert.equal(r.trace[1].status,'completed');assert.equal(r.outputs.end.count,1);assert.equal(r.outputs.end.hasMore,true);assert.match(r.outputs.end.scope,/First page/);
});
test('Miro live policy permits one card edit and read steps, denies mixed writes',()=>{
 assert.equal(liveWorkflowKind(graph()),'miro');assert.equal(liveWorkflowKind(graph('update_item')),'miro');const g=graph();g.nodes.push({id:'s',type:'slack',config:{operation:'list_channels'}});assert.equal(liveWorkflowKind(g),'miro');g.nodes[2].config.operation='send';assert.equal(liveWorkflowKind(g),null);
});
test('Miro graph endpoint requires confirmation and owner credential before any charge',async t=>{
 env(t);let missing=false,deny=false;const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{url=String(url);calls.push(url);if(url.includes('/auth/v1/user'))return reply({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?')){assert.match(url,/owner_id=eq.owner-a&provider=eq.miro/);return reply(missing?[]:[{token_ciphertext:encrypt(token)}]);}if(url.includes('flux_consume_credit'))return reply({ok:true});if(url.includes('api.miro.com')){assert.equal(options.headers.authorization,'Bearer '+token);if(deny)return reply({},403);return options.method==='POST'?reply({id:card,type:'card',data:{title:'Hello Flux'}},201):reply({id:board,name:'Test board'});}throw Error('Unexpected request');});
 const event=extra=>({httpMethod:'POST',headers:{authorization:'Bearer session-test'},body:JSON.stringify({graph:graph(),input:{name:'Flux'},dryRun:false,owner_id:'foreign-owner',...extra})});
 assert.equal((await handler(event({}))).statusCode,403);missing=true;assert.equal((await handler(event({confirmLiveMiro:true}))).statusCode,409);missing=false;deny=true;assert.equal((await handler(event({confirmLiveMiro:true}))).statusCode,409);assert.equal(calls.some(x=>x.includes('consume_credit')),false);deny=false;const result=await handler(event({confirmLiveMiro:true}));assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).outputs.m.created,true);assert.equal(result.body.includes(token),false);assert.equal(calls.filter(x=>x.endsWith('/cards')).length,1);
});
test('Miro resource endpoint authenticates owner and returns names without card contents',async t=>{
 env(t);t.mock.method(globalThis,'fetch',async url=>{url=String(url);if(url.includes('/auth/v1/user'))return reply({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?')){assert.match(url,/owner_id=eq.owner-a&provider=eq.miro/);return reply([{token_ciphertext:encrypt(token)}]);}return reply({data:[{id:card,type:'card',data:{title:'Test',description:'private-description'}}]});});
 assert.equal((await resources({httpMethod:'GET',headers:{}})).statusCode,401);const r=await resources({httpMethod:'GET',headers:{authorization:'Bearer test-session'},queryStringParameters:{kind:'cards',board,owner_id:'foreign-owner'}});assert.equal(r.statusCode,200);assert.deepEqual(JSON.parse(r.body).items,[{id:card,name:'Test'}]);assert.equal(r.body.includes('private-description'),false);assert.equal(r.body.includes(token),false);
});
test('Miro picker restores a saved board and card across independent pages',async()=>{
 const draft={board,itemId:card};let state;const c=miroResourceController({draft,needsCard:true,render:s=>state=s,load:async(kind,b,cursor)=>kind==='boards'?cursor?{items:[{id:board,name:'My board'}]}:{items:[],nextCursor:'50'}:cursor?{items:[{id:card,name:'My card'}]}:{items:[],nextCursor:'next'}});
 await c.refresh();assert.notEqual(c.validate(),'');await c.moreBoards();assert.equal(state.board,board);assert.notEqual(c.validate(),'');await c.moreCards();assert.equal(c.validate(),'');assert.equal(draft.boardName,'My board');assert.equal(draft.cardName,'My card');c.selectCard('');assert.notEqual(c.validate(),'');assert.equal(draft.itemId,'');c.dispose();
});
test('Miro picker rejects stale card results after board switch and disposal',async()=>{
 let state;const pending=[];let renders=0;const other='uXjOTHERid=';const draft={};const c=miroResourceController({draft,needsCard:true,render:s=>{state=s;renders++;},load:(kind,b)=>kind==='boards'?Promise.resolve({items:[{id:board,name:'A'},{id:other,name:'B'}]}):new Promise(resolve=>pending.push({b,resolve}))});
 await c.refresh();const a=c.selectBoard(board),b=c.selectBoard(other);pending[1].resolve({items:[{id:'2',name:'B card'}]});await b;pending[0].resolve({items:[{id:'1',name:'A card'}]});await a;assert.equal(state.cards[0].name,'B card');assert.equal(draft.itemId,'');c.selectCard('2');assert.equal(c.validate(),'');const before=renders;c.dispose();await c.refresh();c.selectCard('2');assert.equal(renders,before);
});
