// Flux TEST: read-only Super Admin operational overview.
// Privileged data never reaches the browser until the server verifies the user's role.
import {db,owner,getBearer,json} from './trello-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 try{
  const userId=await owner(getBearer(event));
  if(!userId)return json(401,{ok:false,error:'Sign in required'});
  const profiles=await db('profiles?id=eq.'+encodeURIComponent(userId)+'&select=role');
  if(profiles?.length!==1||profiles[0].role!=='super_admin')return json(403,{ok:false,error:'Super Admin access required'});
  // Aggregates only; no user emails, tokens, connection details or payloads.
  const [accounts,automations,runs,webhooks]=await Promise.all([
   db('flux_credit_accounts?select=balance,lifetime_used&limit=1000'),
   db('automations?select=id,enabled,trigger_type&limit=1000'),
   db('automation_runs?select=status,started_at&order=started_at.desc&limit=500'),
   db('flux_webhooks?select=enabled,revoked_at&limit=1000')
  ]);
  const sum=(rows,key)=>rows.reduce((total,row)=>total+(Number(row[key])||0),0);
  return json(200,{ok:true,environment:'test',snapshotAt:new Date().toISOString(),metrics:{
   creditAccounts:accounts.length,coinsRemaining:sum(accounts,'balance'),coinsUsed:sum(accounts,'lifetime_used'),
   automations:automations.length,activeAutomations:automations.filter(a=>a.enabled).length,
   scheduledAutomations:automations.filter(a=>a.enabled&&a.trigger_type==='schedule').length,
   recentRuns:runs.length,successfulRuns:runs.filter(r=>r.status==='success').length,
   failedRuns:runs.filter(r=>r.status==='failed').length,
   activeWebhooks:webhooks.filter(w=>w.enabled&&!w.revoked_at).length
  },notes:['Run metrics are limited to the 500 most recent records; other aggregates are capped at 1000 rows.','This dashboard is read-only. No credits or permissions can be changed here.']});
 }catch{return json(503,{ok:false,error:'Admin overview unavailable; check TEST configuration'});}
}
