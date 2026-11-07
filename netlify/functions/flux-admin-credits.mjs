// Flux TEST — audited adjustments via authenticated Postgres RPC.
// Requires 20261107_flux_phase6_billing_test.sql on TEST Supabase before use.
import {owner,getBearer,json} from './trello-shared.mjs';
const BASE='https://sgxinvmfkznzoueqjzop.supabase.co';
const KEY='sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 if(event.isBase64Encoded||Buffer.byteLength(event.body||'','utf8')>2048)return json(413,{ok:false,error:'Request too large'});
 const token=getBearer(event);
 try{
  if(!await owner(token))return json(401,{ok:false,error:'Sign in required'});
  let body;try{body=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
  if(!body||Array.isArray(body)||typeof body!=='object'||!UUID.test(body.targetUserId||'')||!UUID.test(body.requestId||'')
   ||!Number.isSafeInteger(body.delta)||body.delta===0||Math.abs(body.delta)>100000
   ||typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.trim().length>240)
   return json(422,{ok:false,error:'Invalid adjustment fields'});
  // The caller's JWT is passed unchanged: the SECURITY DEFINER RPC verifies auth.uid() and super_admin.
  const response=await fetch(BASE+'/rest/v1/rpc/flux_admin_adjust_coins_test',{
   method:'POST',headers:{apikey:KEY,authorization:'Bearer '+token,'content-type':'application/json'},
   body:JSON.stringify({p_target:body.targetUserId,p_delta:body.delta,p_reason:body.reason.trim(),p_request_id:body.requestId}),
   signal:AbortSignal.timeout(8000)
  });
  if(!response.ok){
   if(response.status===401||response.status===403)return json(403,{ok:false,error:'Super Admin access required'});
   if(response.status===404)return json(503,{ok:false,error:'TEST credit migration not installed'});
   let diagnostic=null;
   try{const failure=await response.json();diagnostic=typeof failure?.code==='string'&&/^[A-Z0-9]{5}$/.test(failure.code)?failure.code:null;}catch{}
   return json(409,{ok:false,error:'Adjustment rejected by database',databaseCode:diagnostic});
  }
  const result=await response.json();
  return json(200,{ok:result.ok===true,balance:result.balance,duplicate:result.duplicate===true});
 }catch{return json(503,{ok:false,error:'TEST credit administration unavailable'});}
}
