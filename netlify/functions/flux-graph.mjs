import {createHash,timingSafeEqual} from 'node:crypto';
import {executeGraph} from './flux-graph-engine.mjs';
const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 const token=process.env.FLUX_WEBHOOK_TOKEN;
 if(!token||token.length<24)return json(503,{ok:false,error:'Execution not configured'});
 const supplied=event.headers?.['x-flux-token']||event.headers?.['X-Flux-Token']||'';
 if(typeof supplied!=='string'||!equal(supplied,token))return json(401,{ok:false,error:'Unauthorized'});
 if(event.isBase64Encoded||(event.body||'').length>75000)return json(413,{ok:false,error:'Payload too large'});
 let body;try{body=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
 if(!body||typeof body!=='object'||Array.isArray(body)||!body.input||typeof body.input!=='object'||Array.isArray(body.input))return json(422,{ok:false,error:'Graph and object input required'});
 const dryRun=body.dryRun!==false;
 let notificationUrl;
 if(process.env.FLUX_NOTIFICATION_WEBHOOK_URL){
  try{const url=new URL(process.env.FLUX_NOTIFICATION_WEBHOOK_URL);if(url.protocol!=='https:'||url.username||url.password)throw Error();notificationUrl=url.toString();}
  catch{return json(503,{ok:false,error:'Server notification URL invalid'});}
 }
 try{const result=await executeGraph(body.graph,body.input,{dryRun,notificationUrl});return json(200,result);}
 catch(error){console.error(JSON.stringify({event:'flux.graph.failed',reason:String(error?.message||error)}));return json(422,{ok:false,error:String(error?.message||'Execution failed').slice(0,240)});}
}
