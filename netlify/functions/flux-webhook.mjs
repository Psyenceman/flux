import {createHash,timingSafeEqual} from 'node:crypto';
import {executeGraph,validateGraph} from './flux-graph-engine.mjs';
const BASE='https://sgxinvmfkznzoueqjzop.supabase.co';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)});
export async function handler(event){
 if(event.httpMethod!=='POST')return response(405,{ok:false,error:'POST required'});
 if(event.isBase64Encoded||Buffer.byteLength(event.body||'','utf8')>16384)return response(413,{ok:false,error:'Payload too large'});
 const id=event.queryStringParameters?.id,secret=event.headers?.['x-flux-webhook-key']||event.headers?.['X-Flux-Webhook-Key'];
 if(!uuid.test(id||'')||typeof secret!=='string'||!/^fw_[a-f0-9]{64}$/.test(secret))return response(401,{ok:false,error:'Invalid webhook credentials'});
 let input;try{input=JSON.parse(event.body||'{}');if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}catch{return response(400,{ok:false,error:'Expected JSON object'});}
 // TEST compatibility: existing Netlify Deploy Preview secret was saved with a missing initial F.
 const serviceKey=process.env.FLUX_SUPABASE_SERVICE_ROLE_KEY || process.env.LUX_SUPABASE_SERVICE_ROLE_KEY;
 if(!serviceKey)return response(503,{ok:false,error:'Webhook execution not configured'});
 const hash=createHash('sha256').update(secret).digest('hex');
 try{
  const claim=await fetch(BASE+'/rest/v1/rpc/flux_claim_webhook',{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify({p_webhook_id:id,p_secret_hash:hash}),signal:AbortSignal.timeout(6000)});
  if(!claim.ok){let upstreamCode='unknown';try{const payload=await claim.json();if(typeof payload?.code==='string'&&/^[A-Za-z0-9_]{1,30}$/.test(payload.code))upstreamCode=payload.code;}catch{}return response(503,{ok:false,error:'Webhook authorization unavailable',upstreamStatus:claim.status,upstreamCode});}
  const result=await claim.json();
  if(!result.ok){const status=result.reason==='rate_limited'?429:result.reason==='insufficient_credits'?402:result.reason==='disabled'?403:404;return response(status,{ok:false,error:result.reason});}
  try{validateGraph(result.graph);}catch{return response(422,{ok:false,error:'Saved workflow invalid'});}
  // Until per-user credentials and live writes are fully verified, webhooks
  // may execute only deterministic internal blocks. Reject before any side effect.
  const safeBlocks=new Set(['webhook','manual','filter','router','mapper','merge','flux','log']);
  const unsupported=result.graph.nodes.filter(node=>!safeBlocks.has(node.type));
  if(unsupported.length)return response(409,{ok:false,error:'Webhook workflow contains connectors not yet approved for unattended execution',blocks:unsupported.map(n=>({id:n.id,type:n.type}))});
  const run=await executeGraph(result.graph,input,{dryRun:false,notificationUrl:process.env.FLUX_NOTIFICATION_WEBHOOK_URL,trelloKey:process.env.FLUX_TRELLO_API_KEY,trelloToken:process.env.FLUX_TRELLO_TOKEN,telegramToken:process.env.FLUX_TELEGRAM_BOT_TOKEN,telegramChatId:process.env.FLUX_TELEGRAM_CHAT_ID,resendApiKey:process.env.FLUX_RESEND_API_KEY,resendFrom:process.env.FLUX_RESEND_FROM});
  // Persist a sanitized run summary server-side; never store webhook payloads or secrets.
  const steps=Array.isArray(run.trace)?run.trace.slice(0,100).map(step=>({id:String(step.id||'').slice(0,80),status:String(step.status||'').slice(0,30)})):[];
  let historySaved=false;
  try{
   const history=await fetch(BASE+'/rest/v1/automation_runs',{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json','prefer':'return=minimal'},body:JSON.stringify({owner_id:result.owner_id,automation_id:result.automation_id,status:run.ok?'success':'failed',finished_at:new Date().toISOString(),result:{source:'webhook',dryRun:false,steps},error_message:run.ok?null:String(run.error||'Execution failed').slice(0,200)}),signal:AbortSignal.timeout(5000)});
   historySaved=history.ok;
  }catch{}
  return response(run.ok?200:422,{ok:run.ok,runId:id,trace:steps,error:run.ok?undefined:String(run.error||'Execution failed').slice(0,180),historySaved});
 }catch{return response(503,{ok:false,error:'Webhook temporarily unavailable'});}
}
