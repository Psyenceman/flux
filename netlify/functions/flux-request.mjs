// First real Flux automation: authenticated request intake with optional outbound webhook.
// This is a Netlify Function; it does not execute arbitrary Flux source or store data.
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { getStore, connectLambda } from '@netlify/blobs';

const json = (statusCode, data) => ({
  statusCode,
  headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'none'},
  body: JSON.stringify(data)
});
const equal = (a,b) => {
  const x=createHash('sha256').update(a).digest(), y=createHash('sha256').update(b).digest();
  return timingSafeEqual(x,y);
};
const validEmail = value => typeof value==='string' && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export async function handler(event) {
  if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
  const token=process.env.FLUX_WEBHOOK_TOKEN;
  if(!token || token.length<24)return json(503,{ok:false,error:'Automation is not configured'});
  const supplied=event.headers?.['x-flux-token']||event.headers?.['X-Flux-Token']||'';
  if(typeof supplied!=='string'||!equal(supplied,token))return json(401,{ok:false,error:'Unauthorized'});
  if((event.body||'').length>16000 || event.isBase64Encoded)return json(413,{ok:false,error:'Request too large'});
  let payload;
  try{payload=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
  if(!payload || typeof payload!=='object' || Array.isArray(payload))return json(400,{ok:false,error:'Expected JSON object'});
  const {name,email,message}=payload;
  if(typeof name!=='string'||!name.trim()||name.length>120||!validEmail(email)||typeof message!=='string'||!message.trim()||message.length>2000)
    return json(422,{ok:false,error:'Provide name (max 120), valid email and message (max 2000)'});
  const id=randomUUID(),dryRun=payload.dryRun===true;
  const record={id,name:name.trim(),email:email.trim(),message:message.trim(),receivedAt:new Date().toISOString()};
  const trace=[{step:'Receive webhook',status:'completed'},{step:'Validate request',status:'completed'}];
  if(dryRun){trace.push({step:'Notify destination',status:'skipped'});return json(200,{ok:true,dryRun:true,id,trace,note:'Validated only; no notification or storage'});}
  try {
    connectLambda(event);
    const store=getStore('flux-requests');
    await store.setJSON('requests/'+record.receivedAt.slice(0,10)+'/'+id,record);
    trace.push({step:'Store request',status:'completed'});
  } catch (error) {
    console.error(JSON.stringify({event:'flux.request.storage_failed',id,reason:String(error)}));
    trace.push({step:'Store request',status:'failed'});
    return json(503,{ok:false,id,error:'Persistent storage unavailable; request not accepted',diagnostic:String(error?.message||'').includes('environment')?'storage_environment':String(error?.message||'').includes('token')?'storage_credentials':String(error?.message||'').includes('site')?'storage_site_context':'storage_unknown',trace});
  }
  const endpoint=process.env.FLUX_NOTIFICATION_WEBHOOK_URL;
  if(!endpoint){trace.push({step:'Notify destination',status:'skipped'});return json(200,{ok:true,id,trace,note:'Request saved; notification is not configured'});}
  let url;
  try{url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid endpoint');}
  catch{return json(503,{ok:false,id,error:'Notification endpoint must be an HTTPS URL',trace});}
  try{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:'flux.request.received',record}),signal:AbortSignal.timeout(5000),redirect:'error'});
    if(!response.ok)throw Error('Destination returned HTTP '+response.status);
    trace.push({step:'Notify destination',status:'completed'});
    console.info(JSON.stringify({event:'flux.request.forwarded',id,at:record.receivedAt}));
    return json(200,{ok:true,id,trace,note:'Request saved and notification delivered'});
  }catch(e){
    trace.push({step:'Notify destination',status:'failed'});
    console.error(JSON.stringify({event:'flux.request.failed',id,reason:String(e)}));
    return json(502,{ok:false,id,error:'Notification delivery failed',trace});
  }
}
