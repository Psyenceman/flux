import test from 'node:test';
import assert from 'node:assert/strict';
import {listGithubRepositories,createGithubIssue} from '../netlify/functions/github-connector.mjs';
import {readGithubIssues} from '../netlify/functions/flux-reader-connectors.mjs';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
import {handler} from '../netlify/functions/flux-graph.mjs';
import {handler as resources} from '../netlify/functions/github-resources.mjs';
import {encrypt} from '../netlify/functions/trello-shared.mjs';
import {liveWorkflowKind} from '../studio/workflow-live-policy.js';
import {githubRepositoryController} from '../studio/github-resource-picker.js';
const token='github-personal-fixture',repository='example/private-test';
const repo={full_name:repository,has_issues:true,private:true};
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
const graph=(operation='create_issue')=>({version:1,nodes:[{id:'start',type:'manual'},{id:'g',type:'github',config:{operation,repository,repositorySource:'connected',title:'Hello {{input.name}}',message:'Description {{input.name}}'}},{id:'end',type:'log'}],edges:[{from:'start',to:'g'},{from:'g',to:'end'}]});
function env(t){const names=['FLUX_CONNECTION_ENCRYPTION_KEY','FLUX_SUPABASE_SERVICE_ROLE_KEY'],old=names.map(n=>process.env[n]);process.env[names[0]]='fixture-key-material-with-at-least-32-characters';process.env[names[1]]='fixture-service';t.after(()=>names.forEach((n,i)=>{if(old[i]===undefined)delete process.env[n];else process.env[n]=old[i];}));}
test('personal repository discovery uses fixed host, pagination, issues-enabled active repos only',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{const u=new URL(url);assert.equal(u.origin+u.pathname,'https://api.github.com/user/repos');assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('per_page'),'50');assert.equal(options.headers.authorization,'Bearer '+token);assert.equal(options.redirect,'error');return reply([repo,{...repo,archived:true},{...repo,has_issues:false}],200,{link:'<https://untrusted.test/>; rel="next"'});});
 const result=await listGithubRepositories(token,'2');assert.deepEqual(result.items,[{id:repository,name:repository,private:true}]);assert.equal(result.nextCursor,'3');assert.equal(JSON.stringify(result).includes(token),false);
});
test('private issue reading uses personal token; public reading never silently uses it',async t=>{
 const headers=[];t.mock.method(globalThis,'fetch',async(url,options)=>{headers.push(options.headers);return reply([{id:1,number:1,title:'Issue'},{id:2,pull_request:{}}]);});const privateResult=await executeGraph(graph('list_issues'),{},{dryRun:true,githubToken:token});assert.equal(privateResult.outputs.end.count,1);assert.equal(headers[0].authorization,'Bearer '+token);const publicGraph=graph('list_issues');publicGraph.nodes[1].config.repositorySource='public';await executeGraph(publicGraph,{},{dryRun:true,githubToken:token});assert.equal(headers[1].authorization,undefined);
});
test('personal credential failure does not fall back to public reading',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return reply({},401);});const missing=await executeGraph(graph('list_issues'),{},{dryRun:true});assert.equal(missing.ok,false);assert.equal(calls,0);await assert.rejects(readGithubIssues({repository},token),/401/);assert.equal(calls,1);
});
test('create issue checks repository then writes mapped title/body and returns trusted URL',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.redirect,'error');if(options.method==='GET')return reply(repo);assert.equal(url,'https://api.github.com/repos/'+repository+'/issues');writes++;assert.deepEqual(JSON.parse(options.body),{title:'Hello Flux',body:'Description Flux'});return reply({id:123,number:4,title:'Hello Flux',html_url:'https://evil.test/'},201);});const result=await executeGraph(graph(),{name:'Flux'},{dryRun:false,githubToken:token});assert.equal(result.ok,true);assert.equal(result.outputs.end.created,true);assert.equal(result.outputs.end.url,'https://github.com/'+repository+'/issues/4');assert.equal(writes,1);
});
test('safe creation previews connected values without contacting GitHub',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No write or provider request in preview');});const result=await executeGraph(graph(),{name:'Flux'},{dryRun:true});assert.equal(result.trace[1].status,'simulated');assert.equal(result.outputs.g.title,'Hello Flux');assert.equal(result.outputs.g.created,undefined);const g=graph();g.nodes[1].config.title='{{outside.name}}';assert.equal((await executeGraph(g,{},{dryRun:true})).ok,false);
});
test('hostile repository paths and invalid titles rejected before network',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw Error('No network expected');});for(const value of ['https://evil.test/x','a/..','a/.','a/b?x=1'])await assert.rejects(createGithubIssue({repository:value,operation:'create_issue',title:'Title'},token),/repository/);await assert.rejects(createGithubIssue({repository,operation:'create_issue',title:'x'.repeat(257)},token),/title/);await assert.rejects(listGithubRepositories(token,'201'),/page/);
});
test('denied/archived repository, HTTP errors and malformed delivery never count as success',async t=>{
 for(const [data,status,pattern] of [[{...repo,archived:true},200,/active repository/],[{},403,/access denied/],[{},429,/limit reached/]]){t.mock.method(globalThis,'fetch',async()=>reply(data,status));await assert.rejects(createGithubIssue({repository,operation:'create_issue',title:'Title'},token),pattern);t.mock.restoreAll();}
 t.mock.method(globalThis,'fetch',async(url,options)=>reply(options.method==='GET'?repo:{}));await assert.rejects(createGithubIssue({repository,operation:'create_issue',title:'Title'},token),/response incomplete/);
});
test('ambiguous issue creation is not automatically retried',async t=>{
 let writes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{if(options.method==='GET')return reply(repo);writes++;throw Error('timeout');});await assert.rejects(createGithubIssue({repository,operation:'create_issue',title:'Title'},token),/Check the repository before retrying/);assert.equal(writes,1);
});
test('live policy permits one GitHub issue creation with read/local steps, denies mixed writes',()=>{
 assert.equal(liveWorkflowKind(graph()),'github');const g=graph();g.nodes.push({id:'s',type:'slack',config:{operation:'send'}});assert.equal(liveWorkflowKind(g),null);g.nodes[3].config.operation='list_channels';assert.equal(liveWorkflowKind(g),'github');
});
test('authenticated endpoint requires confirmation, owner-scoped credential and accessible repo before charge',async t=>{
 env(t);let missing=false,denied=false;const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{url=String(url);calls.push(url);if(url.includes('/auth/v1/user'))return reply({id:'owner-a',aud:'authenticated'});if(url.includes('/flux_connector_credentials?')){assert.match(url,/owner_id=eq.owner-a&provider=eq.github/);return reply(missing?[]:[{token_ciphertext:encrypt(token)}]);}if(url.includes('flux_consume_credit'))return reply({ok:true});if(denied)return reply({},404);assert.equal(options.headers.authorization,'Bearer '+token);return options.method==='POST'?reply({id:123,number:4,title:'Hello Flux'},201):reply(repo);});
 const event=extra=>({httpMethod:'POST',headers:{authorization:'Bearer fixture-session'},body:JSON.stringify({graph:graph(),input:{name:'Flux'},dryRun:false,owner_id:'foreign-owner',...extra})});
 assert.equal((await handler(event({}))).statusCode,403);missing=true;assert.equal((await handler(event({confirmLiveGithub:true}))).statusCode,409);missing=false;denied=true;assert.equal((await handler(event({confirmLiveGithub:true}))).statusCode,409);assert.equal(calls.some(x=>x.includes('consume_credit')),false);denied=false;const r=await handler(event({confirmLiveGithub:true}));assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).outputs.g.created,true);assert.equal(r.body.includes(token),false);
});
test('repository resource handler isolates owner and never returns credentials',async t=>{
 env(t);t.mock.method(globalThis,'fetch',async url=>{if(String(url).includes('/auth/v1/user'))return reply({id:'owner-a',aud:'authenticated'});if(String(url).includes('/flux_connector_credentials?')){assert.match(String(url),/owner_id=eq.owner-a&provider=eq.github/);return reply([{token_ciphertext:encrypt(token)}]);}return reply([repo]);});assert.equal((await resources({httpMethod:'GET',headers:{}})).statusCode,401);const result=await resources({httpMethod:'GET',headers:{authorization:'Bearer fixture-session'},queryStringParameters:{owner_id:'foreign-owner'}});assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).items[0].name,repository);assert.equal(result.body.includes(token),false);
});
test('repository picker reuses selection controller and preserves selection across pages',async()=>{
 const draft={repository};let state;const c=githubRepositoryController({draft,render:s=>state=s,load:async cursor=>cursor?{items:[{id:repository,name:repository}]}:{items:[],nextCursor:'2'}});await c.refresh();assert.notEqual(c.validate(),'');await c.more();assert.equal(c.validate(),'');assert.equal(draft.repositoryName,repository);c.select('');assert.equal(draft.repository,'');assert.notEqual(c.validate(),'');assert.equal(state.selected,'');c.dispose();
});
