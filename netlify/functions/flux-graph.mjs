import {createHash,timingSafeEqual} from 'node:crypto';
import {executeGraph,validateGraph} from './flux-graph-engine.mjs';
const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});

 if(event.isBase64Encoded||(event.body||'').length>75000)return json(413,{ok:false,error:'Payload too large'});
 let body;try{body=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
 if(!body||typeof body!=='object'||Array.isArray(body)||!body.input||typeof body.input!=='object'||Array.isArray(body.input))return json(422,{ok:false,error:'Graph and object input required'});
 const dryRun=body.dryRun!==false;
 const supplied=event.headers?.['x-flux-token']||event.headers?.['X-Flux-Token']||'';
 const token=process.env.FLUX_WEBHOOK_TOKEN;
 const legacy=typeof supplied==='string'&&token?.length>=24&&equal(supplied,token);
 let sessionToken='';
 if(!legacy){
  const authorization=event.headers?.authorization||event.headers?.Authorization||'';
  const bearer=authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  if(!bearer)return json(401,{ok:false,error:'Sign in to Flux Studio before running a workflow'});
  let authenticated=false;
  try{
   const response=await fetch('https://sgxinvmfkznzoueqjzop.supabase.co/auth/v1/user',{
    headers:{apikey:'sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu',authorization:'Bearer '+bearer[1]},
    signal:AbortSignal.timeout(5000)
   });
   if(response.ok){const identity=await response.json();authenticated=Boolean(identity?.id&&identity?.aud==='authenticated');}
  }catch{return json(503,{ok:false,error:'Authentication service unavailable'});}
  if(!authenticated)return json(401,{ok:false,error:'Flux Studio session expired. Sign in again.'});
  sessionToken=bearer[1];
  if(!dryRun)return json(403,{ok:false,error:'Live execution requires separate server authorization. Use Dry run.'});
 }

 let notificationUrl;
 if(process.env.FLUX_NOTIFICATION_WEBHOOK_URL){
  try{const url=new URL(process.env.FLUX_NOTIFICATION_WEBHOOK_URL);if(url.protocol!=='https:'||url.username||url.password)throw Error();notificationUrl=url.toString();}
  catch{return json(503,{ok:false,error:'Server notification URL invalid'});}
 }
 try{
  validateGraph(body.graph);
  let credits=null;
  if(sessionToken){
   const creditResponse=await fetch('https://sgxinvmfkznzoueqjzop.supabase.co/rest/v1/rpc/flux_consume_credit',{
    method:'POST',headers:{apikey:'sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu',authorization:'Bearer '+sessionToken,'content-type':'application/json'},
    body:JSON.stringify({p_action:dryRun?'workflow_test':'workflow_run'}),signal:AbortSignal.timeout(5000)
   });
   if(!creditResponse.ok)return json(503,{ok:false,error:'FluxCoins temporarily unavailable. No workflow executed.'});
   credits=await creditResponse.json();
   if(!credits?.ok)return json(402,{ok:false,error:'Insufficient FluxCoins',credits});
  }
  const result=await executeGraph(body.graph,body.input,{dryRun,notificationUrl,trelloKey:process.env.FLUX_TRELLO_API_KEY,trelloToken:process.env.FLUX_TRELLO_TOKEN});return json(200,{...result,credits});
 }
 catch(error){console.error(JSON.stringify({event:'flux.graph.failed',reason:String(error?.message||error)}));return json(422,{ok:false,error:String(error?.message||'Execution failed').slice(0,240)});}
}
