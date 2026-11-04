import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const secret=process.env.FLUX_WEBHOOK_TOKEN;
 if(!secret||secret.length<24)return json(503,{ok:false,error:'Automation not configured'});
 const supplied=event.headers?.['x-flux-token']||event.headers?.['X-Flux-Token']||'';
 if(typeof supplied!=='string'||!equal(supplied,secret))return json(401,{ok:false,error:'Unauthorized'});
 try{
  const store=getStore('flux-requests');
  const items=[];let cursor;
  for(let page=0;page<10;page++){
   const batch=await store.list({prefix:'requests/',paginate:false,cursor});
   items.push(...batch.blobs.map(x=>x.key));
   if(!batch.cursor)break;
   cursor=batch.cursor;
  }
  const keys=items.sort().reverse().slice(0,30);
  const records=await Promise.all(keys.map(key=>store.get(key,{type:'json'})));
  return json(200,{ok:true,count:records.filter(Boolean).length,records:records.filter(Boolean).map(({id,name,email,message,receivedAt})=>({id,name,email,message,receivedAt})),note:'Up to 30 latest saved requests'});
 }catch(error){console.error(JSON.stringify({event:'flux.requests.list_failed',reason:String(error)}));return json(503,{ok:false,error:'Unable to read persistent storage'});}
}
