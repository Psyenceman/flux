import {executeGraph,validateGraph} from './flux-graph-engine.mjs';
const BASE='https://sgxinvmfkznzoueqjzop.supabase.co';
const KEY='sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu';
const reply=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'null'},body:JSON.stringify(data)});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(event){
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'POST required'});
 if(event.isBase64Encoded||(event.body||'').length>20000)return reply(413,{ok:false,error:'Payload too large'});
 const id=new URLSearchParams(event.queryStringParameters||{}).get('automation');
 if(!uuid.test(id||''))return reply(400,{ok:false,error:'Valid automation ID required'});
 const bearer=(event.headers?.authorization||event.headers?.Authorization||'').match(/^Bearer ([A-Za-z0-9._-]+)$/);
 if(!bearer)return reply(401,{ok:false,error:'Authenticated Flux session required'});
 const token=bearer[1],headers={apikey:KEY,authorization:'Bearer '+token};
 let input;try{input=JSON.parse(event.body||'{}');if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}catch{return reply(400,{ok:false,error:'JSON object input required'});}
 try{
  const identity=await fetch(BASE+'/auth/v1/user',{headers,signal:AbortSignal.timeout(5000)});
  if(!identity.ok)return reply(401,{ok:false,error:'Invalid or expired session'});
  const user=await identity.json();if(!user.id||user.aud!=='authenticated')return reply(401,{ok:false,error:'Invalid session'});
  const url=new URL(BASE+'/rest/v1/automations');
  url.searchParams.set('id','eq.'+id);url.searchParams.set('owner_id','eq.'+user.id);url.searchParams.set('select','id,owner_id,action_config');
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(5000)});
  if(!response.ok)return reply(503,{ok:false,error:'Automation lookup unavailable'});
  const rows=await response.json(),row=rows[0];
  if(!row)return reply(404,{ok:false,error:'Automation not found'});
  const graph=row.action_config?.graph;
  try{validateGraph(graph);}catch{return reply(422,{ok:false,error:'Saved workflow is invalid'});}
  // Authenticated API is dry-run only until activation, quotas and per-user secrets are shipped.
  const debit=await fetch(BASE+'/rest/v1/rpc/flux_consume_credit',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_action:'workflow_test'}),signal:AbortSignal.timeout(5000)});
  if(!debit.ok)return reply(503,{ok:false,error:'FluxCoins unavailable; no workflow executed'});
  const coins=await debit.json();if(!coins?.ok)return reply(402,{ok:false,error:'Insufficient FluxCoins'});
  const result=await executeGraph(graph,input,{dryRun:true});
  return reply(result.ok?200:422,{...result,credits:coins,automationId:id,mode:'authenticated_dry_run'});
 }catch{return reply(503,{ok:false,error:'Flux API temporarily unavailable'});}
}
