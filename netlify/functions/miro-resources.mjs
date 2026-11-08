import {owner,getBearer,db,decrypt,json} from './trello-shared.mjs';
import {listMiroBoards,listMiroCards} from './miro-connector.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const {kind='boards',board='',cursor=''}=event.queryStringParameters||{};
 if(!['boards','cards'].includes(kind)||typeof cursor!=='string'||cursor.length>500)return json(422,{ok:false,error:'Invalid resource request'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to choose your Miro boards'});
  const rows=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.miro&select=token_ciphertext');
  if(rows?.length!==1)return json(409,{ok:false,error:'Connect Miro in My connections first'});
  let token;try{token=decrypt(rows[0].token_ciphertext);}catch{return json(503,{ok:false,error:'Miro connection unavailable. Reconnect your account.'});}
  const data=kind==='boards'?await listMiroBoards(token,cursor||'0'):await listMiroCards(token,board,cursor);
  return json(200,{ok:true,...data,items:data.items.map(x=>({id:x.id,name:x.name}))});
 }catch(error){return json(502,{ok:false,error:error.message?.startsWith('Database')?'Miro connection service unavailable':String(error.message||'Miro resources unavailable').slice(0,240)});}
}
