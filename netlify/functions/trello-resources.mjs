import {owner,getBearer,db,decrypt,json} from './trello-shared.mjs';
const allowed=new Set(['boards','lists']);
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const kind=event.queryStringParameters?.kind;
 if(!allowed.has(kind))return json(400,{ok:false,error:'Invalid resource'});
 const board=event.queryStringParameters?.board||'';
 if(kind==='lists'&&!/^[a-f0-9]{24}$/i.test(board))return json(400,{ok:false,error:'Invalid board ID'});
 try{
  const id=await owner(getBearer(event));
  if(!id)return json(401,{ok:false,error:'Sign in to Flux Studio first'});
  const credentials=await db('flux_trello_credentials?owner_id=eq.'+encodeURIComponent(id)+'&select=access_token_ciphertext,expires_at');
  if(!credentials?.length)return json(409,{ok:false,error:'Connect Trello first'});
  const item=credentials[0];
  if(item.expires_at&&Date.parse(item.expires_at)<Date.now())return json(409,{ok:false,error:'Trello connection expired. Reconnect Trello.'});
  const token=decrypt(item.access_token_ciphertext);
  const url=kind==='boards'?'https://api.trello.com/1/members/me/boards?fields=name,closed&filter=open':'https://api.trello.com/1/boards/'+board+'/lists?fields=name,closed&filter=open';
  const response=await fetch(url,{headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return json(response.status===401||response.status===403?409:502,{ok:false,error:response.status===401||response.status===403?'Trello access denied. Reconnect your account.':'Unable to retrieve Trello '+kind});
  const result=await response.json();
  if(!Array.isArray(result))return json(502,{ok:false,error:'Unexpected Trello response'});
  return json(200,{ok:true,items:result.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&!x.closed).slice(0,500).map(x=>({id:x.id,name:x.name.slice(0,150)}))});
 }catch{return json(503,{ok:false,error:'Trello '+kind+' unavailable in TEST'});}
}
