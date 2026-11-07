// Flux TEST: Super Admin read-only aggregates; errors identify the failing stage, never secrets.
import {db,owner,getBearer,json} from './trello-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 let stage='authentication';
 try{
  const userId=await owner(getBearer(event));
  if(!userId)return json(401,{ok:false,error:'Sign in required'});
  stage='role_lookup';
  // Use the caller's verified JWT to read their own profile through RLS.
  // This avoids coupling role lookup to service-role PostgREST permissions.
  const jwt=getBearer(event);
  let profiles;
  try{
   const response=await fetch('https://sgxinvmfkznzoueqjzop.supabase.co/rest/v1/profiles?id=eq.'+encodeURIComponent(userId)+'&select=role',{
    headers:{apikey:'sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu',authorization:'Bearer '+jwt},
    signal:AbortSignal.timeout(8000)
   });
   if(!response.ok)return json(503,{ok:false,error:'Role lookup unavailable',stage:'role_lookup',upstreamStatus:response.status,reason:'upstream_http'});
   profiles=await response.json();
  }catch(error){
   return json(503,{ok:false,error:'Role lookup unavailable',stage:'role_lookup',reason:error?.name==='TimeoutError'?'upstream_timeout':'upstream_network'});
  }
  if(profiles?.length!==1||profiles[0].role!=='super_admin')return json(403,{ok:false,error:'Super Admin access required'});
  // After the server-side authorization succeeds, failures may be reported by stage.
  const read=async (name,path)=>{try{return await db(path);}catch(error){return {error:true,source:name};}};
  const [accounts,automations,runs,webhooks]=await Promise.all([
   read('credits','flux_credit_accounts?select=balance,lifetime_used&limit=1000'),
   read('automations','automations?select=enabled,trigger_type&limit=1000'),
   read('runs','automation_runs?select=status&limit=500'),
   read('webhooks','flux_webhooks?select=enabled,revoked_at&limit=1000')
  ]);
  const sources={credits:accounts,automations,runs,webhooks};
  const unavailable=Object.entries(sources).filter(([,value])=>!Array.isArray(value)).map(([name])=>name);
  const sum=(rows,key)=>Array.isArray(rows)?rows.reduce((total,row)=>total+(Number(row[key])||0),0):null;
  return json(200,{ok:true,environment:'test',snapshotAt:new Date().toISOString(),
   metrics:{
    creditAccounts:Array.isArray(accounts)?accounts.length:null,
    coinsRemaining:sum(accounts,'balance'),coinsUsed:sum(accounts,'lifetime_used'),
    automations:Array.isArray(automations)?automations.length:null,
    activeAutomations:Array.isArray(automations)?automations.filter(a=>a.enabled).length:null,
    scheduledAutomations:Array.isArray(automations)?automations.filter(a=>a.enabled&&a.trigger_type==='schedule').length:null,
    recentRuns:Array.isArray(runs)?runs.length:null,
    successfulRuns:Array.isArray(runs)?runs.filter(r=>r.status==='success').length:null,
    failedRuns:Array.isArray(runs)?runs.filter(r=>r.status==='failed').length:null,
    activeWebhooks:Array.isArray(webhooks)?webhooks.filter(w=>w.enabled&&!w.revoked_at).length:null
   },unavailable,notes:['Counts are capped at 1000 rows; runs at 500.','Unavailable data sources show a dash, not zero.']});
 }catch{
  return json(503,{ok:false,error:'Admin overview unavailable',stage});
 }
}
