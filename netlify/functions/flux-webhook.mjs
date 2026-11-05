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
 const serviceKey=process.env.FLUX_SUPABASE_SERVICE_ROLE_KEY;
 if(!serviceKey)return response(503,{ok:false,error:'Webhook execution not configured'});
 const hash=createHash('sha256').update(secret).digest('hex');
 try{
  const claim=await fetch(BASE+'/rest/v1/rpc/flux_claim_webhook',{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify({p_webhook_id:id,p_secret_hash:hash}),signal:AbortSignal.timeout(6000)});
  if(!claim.ok)return response(503,{ok:false,error:'Webhook authorization unavailable'});
  const result=await claim.json();
  if(!result.ok){const status=result.reason==='rate_limited'?429:result.reason==='insufficient_credits'?402:result.reason==='disabled'?403:404;return response(status,{ok:false,error:result.reason});}
  try{validateGraph(result.graph);}catch{return response(422,{ok:false,error:'Saved workflow invalid'});}
  const run=await executeGraph(result.graph,input,{dryRun:false,notificationUrl:process.env.FLUX_NOTIFICATION_WEBHOOK_URL,trelloKey:process.env.FLUX_TRELLO_API_KEY,trelloToken:process.env.FLUX_TRELLO_TOKEN,telegramToken:process.env.FLUX_TELEGRAM_BOT_TOKEN,telegramChatId:process.env.FLUX_TELEGRAM_CHAT_ID,resendApiKey:process.env.FLUX_RESEND_API_KEY,resendFrom:process.env.FLUX_RESEND_FROM});
  return response(run.ok?200:422,{ok:run.ok,runId:id,trace:run.trace?.map(x=>({id:x.id,status:x.status})),error:run.ok?undefined:String(run.error||'Execution failed').slice(0,180)});
 }catch{return response(503,{ok:false,error:'Webhook temporarily unavailable'});}
}
