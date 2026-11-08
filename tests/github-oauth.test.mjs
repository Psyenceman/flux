import test from 'node:test';
import assert from 'node:assert/strict';
import {handler as start} from '../netlify/functions/github-oauth-start.mjs';
import {handler as callback} from '../netlify/functions/github-oauth-callback.mjs';
import {handler as status} from '../netlify/functions/github-oauth-status.mjs';
import {githubAccessToken,configured} from '../netlify/functions/github-oauth-shared.mjs';
import {encrypt,decrypt,hash} from '../netlify/functions/trello-shared.mjs';
import {mountGithubConnect} from '../studio/github-connect.js';
const state='s'.repeat(43),owner='owner-a';
const reply=data=>new Response(JSON.stringify(data));
const tokens={access_token:'ghu_testaccess123',refresh_token:'ghr_testrefresh123',expires_in:28800,refresh_token_expires_in:15897600};
const envelope=extra=>({format:'flux-github-oauth-v1',accessToken:'ghu_old',refreshToken:'ghr_old',expiresAt:Date.now()+3600000,refreshExpiresAt:Date.now()+86400000,...extra});
function env(t){const values={FLUX_SUPABASE_SERVICE_ROLE_KEY:'fixture-service',FLUX_CONNECTION_ENCRYPTION_KEY:'fixture-encryption-material-at-least-32-long',FLUX_GITHUB_APP_CLIENT_ID:'Ivfixture',FLUX_GITHUB_APP_CLIENT_SECRET:'fixture-secret',FLUX_GITHUB_APP_SLUG:'flux-test-app'};for(const [k,v]of Object.entries(values)){const old=process.env[k];process.env[k]=v;t.after(()=>{if(old===undefined)delete process.env[k];else process.env[k]=old;});}}
const event=extra=>({httpMethod:'GET',headers:{cookie:'flux_github_state='+state},queryStringParameters:{state,code:'provider-code',...extra}});
test('start is authenticated, stores hashed owner-bound state, sends no secret to browser',async t=>{
 env(t);let saved;t.mock.method(globalThis,'fetch',async(url,options)=>url.includes('/auth/v1/user')?reply({id:owner,aud:'authenticated'}):(saved=JSON.parse(options.body),reply([])));
 assert.equal((await start({httpMethod:'POST',headers:{}})).statusCode,401);
 const r=await start({httpMethod:'POST',headers:{authorization:'Bearer fixture-session'}});assert.equal(r.statusCode,200);const url=new URL(JSON.parse(r.body).authorizeUrl);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/login/oauth/authorize');assert.equal(url.searchParams.get('scope'),'offline_access');assert.equal(saved.owner_id,owner);assert.equal(saved.state_hash,hash(url.searchParams.get('state')));assert.equal(r.body.includes('fixture-secret'),false);assert.match(r.headers['set-cookie'],/HttpOnly; Secure; SameSite=Lax/);
});
test('missing app configuration is truthful and cannot initiate authorization',async t=>{
 env(t);delete process.env.FLUX_GITHUB_APP_CLIENT_SECRET;assert.equal(configured(),false);t.mock.method(globalThis,'fetch',async url=>{assert.match(url,/auth\/v1\/user/);return reply({id:owner,aud:'authenticated'});});assert.equal((await start({httpMethod:'POST',headers:{authorization:'Bearer fixture-session'}})).statusCode,503);const r=await status({httpMethod:'GET',headers:{}});assert.equal(JSON.parse(r.body).configured,false);assert.equal(JSON.parse(r.body).connected,false);
});
test('callback rejects missing/mismatched cookies and expired/replayed states before exchange',async t=>{
 env(t);let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return reply([]);});assert.match((await callback({...event(),headers:{}})).body,/could not be verified/);assert.equal(calls,0);assert.match((await callback(event({state:'x'.repeat(43)}))).body,/could not be verified/);assert.equal(calls,0);assert.match((await callback(event())).body,/expired/);assert.equal(calls,1);
});
test('callback verifies GitHub identity and installation, finalizes atomically, never emits tokens/code',async t=>{
 env(t);let finalBody,claimed=false,exchanges=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url.includes('flux_github_oauth_states?')&&options.method==='PATCH'){assert.match(url,/claim_nonce=is.null/);if(claimed)return reply([]);claimed=true;return reply([{owner_id:owner,phase:'authorize'}]);}
  if(url==='https://github.com/login/oauth/access_token'){exchanges++;assert.equal(new URLSearchParams(options.body).get('code'),'provider-code');assert.equal(options.redirect,'error');return reply(tokens);}
  if(url==='https://api.github.com/user')return reply({login:'octocat'});
  if(url.includes('/user/installations'))return reply({installations:[{app_slug:'flux-test-app',permissions:{issues:'write'}}]});
  if(url.endsWith('/rpc/flux_finalize_github_oauth')){finalBody=JSON.parse(options.body);return reply(true);}throw Error('Unexpected request');
 });
 const r=await callback(event());assert.match(r.body,/GitHub connected/);assert.equal(r.body.includes(tokens.access_token),false);assert.equal(r.body.includes('provider-code'),false);assert.equal(finalBody.p_owner_id,undefined);assert.equal(finalBody.p_state_hash,hash(state));assert.equal(JSON.parse(decrypt(finalBody.p_ciphertext)).refreshToken,tokens.refresh_token);assert.match(r.headers['content-security-policy'],/script-src 'nonce-/);assert.equal(r.headers['referrer-policy'],'no-referrer');await callback(event());assert.equal(exchanges,1);
});
test('no installation continues inside popup using a new conditional state, never saves yet',async t=>{
 env(t);let continuation;t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url.includes('flux_github_oauth_states?')&&options.method==='PATCH'){const body=JSON.parse(options.body);if(body.state_hash)continuation=body;return reply([{owner_id:owner,phase:'authorize'}]);}
  if(url==='https://github.com/login/oauth/access_token')return reply(tokens);if(url==='https://api.github.com/user')return reply({login:'u'});if(url.includes('/user/installations'))return reply({installations:[]});throw Error('No credential save expected');
 });
 const r=await callback(event());assert.equal(r.statusCode,302);const url=new URL(r.headers.location);assert.equal(url.pathname,'/apps/flux-test-app/installations/new');assert.notEqual(url.searchParams.get('state'),state);assert.equal(continuation.state_hash,hash(url.searchParams.get('state')));assert.equal(continuation.phase,'install');assert.equal(continuation.claim_nonce,null);
});
test('denied authorization, failed exchange and cancelled finalization do not report connected',async t=>{
 env(t);let mode='denied';t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url.includes('flux_github_oauth_states?'))return reply(options.method==='PATCH'?[{owner_id:owner,phase:'authorize'}]:[]);
  if(url==='https://github.com/login/oauth/access_token')return reply(mode==='exchange'?{error:'invalid_grant'}:tokens);
  if(url==='https://api.github.com/user')return reply({login:'u'});if(url.includes('/user/installations'))return reply({installations:[{app_slug:'flux-test-app',permissions:{issues:'write'}}]});if(url.includes('/rpc/'))return reply(false);throw Error('Unexpected');
 });assert.match((await callback(event({error:'access_denied'}))).body,/cancelled/);mode='exchange';assert.match((await callback(event())).body,/could not be completed/);mode='cancelled';assert.match((await callback(event())).body,/expired/);
});
test('legacy PAT and valid OAuth access remain compatible without unnecessary network',async t=>{
 env(t);t.mock.method(globalThis,'fetch',()=>{throw Error('No network');});assert.equal(await githubAccessToken(owner,{token_ciphertext:encrypt('legacy-pat')}),'legacy-pat');assert.equal(await githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope()))}),'ghu_old');
});
test('token refresh uses a ciphertext compare-and-swap lease and saves rotated tokens',async t=>{
 env(t);let patches=0,refreshes=0;t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(url==='https://github.com/login/oauth/access_token'){refreshes++;assert.equal(new URLSearchParams(options.body).get('grant_type'),'refresh_token');return reply(tokens);}
  assert.match(url,/owner_id=eq.owner-a&provider=eq.github&token_ciphertext=eq./);assert.equal(options.method,'PATCH');patches++;const stored=JSON.parse(decrypt(JSON.parse(options.body).token_ciphertext));if(patches===1)assert.ok(stored.leaseUntil>Date.now());else assert.equal(stored.accessToken,tokens.access_token);return reply([{}]);
 });const access=await githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope({expiresAt:Date.now()-1})))});assert.equal(access,tokens.access_token);assert.equal(refreshes,1);assert.equal(patches,2);
});
test('concurrent refresh lease, expired refresh, and disconnect during rotation fail closed',async t=>{
 env(t);let refreshes=0;t.mock.method(globalThis,'fetch',async(url)=>{if(url==='https://github.com/login/oauth/access_token'){refreshes++;return reply(tokens);}return reply([]);});await assert.rejects(githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope({expiresAt:0,leaseUntil:Date.now()+30000})))}),/refreshing/);await assert.rejects(githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope({expiresAt:0,refreshExpiresAt:0})))}),/expired/);await assert.rejects(githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope({expiresAt:0})))}),/refreshing/);assert.equal(refreshes,0);
 let count=0;t.mock.method(globalThis,'fetch',async url=>url==='https://github.com/login/oauth/access_token'?reply(tokens):reply(++count===1?[{}]:[]));await assert.rejects(githubAccessToken(owner,{token_ciphertext:encrypt(JSON.stringify(envelope({expiresAt:0})))}),/could not be renewed/);
});

function popupHarness(t,{available=true,blocked=false}={}){
 const originalWindow=globalThis.window,originalLocation=globalThis.location;const messages=new Map(),events=[],order=[];
 const popup={closed:false,document:{title:'',body:{textContent:''}},focus(){},close(){this.closed=true;},location:{replace(url){order.push('navigate');this.url=url;}}};
 globalThis.window={open(){order.push('open');return blocked?null:popup;},addEventListener(k,fn){messages.set(k,fn);},removeEventListener(k){messages.delete(k);},dispatchEvent(e){events.push(e.type);}};globalThis.location={origin:'https://flux-studio-test.netlify.app'};
 t.after(()=>{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;});
 t.mock.method(globalThis,'setInterval',()=>1);t.mock.method(globalThis,'clearInterval',()=>{});
 let connected=false;const handlers={};const button={dataset:{},classList:{add(){}},setAttribute(){},addEventListener(k,fn){handlers[k]=fn;},removeEventListener(k){delete handlers[k];}},title={},status={};
 t.mock.method(globalThis,'fetch',async url=>String(url).includes('-status')?reply({configured:available,signedIn:true,connected,label:'octocat'}):reply({authorizeUrl:'https://github.com/login/oauth/authorize?client_id=fixture'}));
 const dispose=mountGithubConnect({button,title,status,getToken:async()=>{order.push('session');return 'fixture-session';}});
 return {button,status,popup,order,events,dispose,click:()=>handlers.click?.(),send:message=>messages.get('message')?.(message),connect:()=>{connected=true;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('GitHub popup opens synchronously, validates origin/source and refreshes actual status',async t=>{
 const h=popupHarness(t);await flush();h.order.length=0;await h.click();assert.deepEqual(h.order.slice(0,2),['open','session']);assert.match(h.popup.location.url,/^https:\/\/github.com\/login\/oauth\/authorize/);h.connect();h.send({origin:'https://evil.test',source:h.popup,data:{type:'flux:github-oauth',status:'connected'}});await flush();assert.equal(h.button.dataset.state,'connecting');h.send({origin:location.origin,source:{},data:{type:'flux:github-oauth',status:'connected'}});await flush();assert.equal(h.button.dataset.state,'connecting');h.send({origin:location.origin,source:h.popup,data:{type:'flux:github-oauth',status:'connected'}});await flush();assert.equal(h.button.dataset.state,'connected');assert.ok(h.events.includes('flux:github-connected'));h.dispose();assert.equal(h.popup.closed,true);
});
test('popup blocked and missing configuration leave Flux usable and never fake a connection',async t=>{
 const h=popupHarness(t,{blocked:true});await flush();await h.click();assert.match(h.status.textContent,/Allow pop-ups/);h.dispose();
});
test('unconfigured GitHub button is disabled and explains platform setup',async t=>{
 const h=popupHarness(t,{available:false});await flush();assert.equal(h.button.disabled,true);await h.click();assert.equal(h.order.includes('open'),false);assert.match(h.status.textContent,/being prepared/);h.dispose();
});
