import {owner,getBearer,db,json} from './trello-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 let stage='authentication';
 try{
  const id=await owner(getBearer(event));
  if(!id)return json(401,{ok:false,error:'Sign in first'});
  stage='connections_query';
  const rows=await db('flux_connections?owner_id=eq.'+id+'&provider=eq.trello&select=id,status,provider_account_label');
  return json(200,{ok:true,connections:rows||[]});
 }catch(error){
  // Do not expose database responses, session tokens or credentials to the browser.
  console.error('Trello connections TEST failed at '+stage+': '+(error instanceof Error?error.name:'UnknownError'));
  return json(503,{ok:false,error:'Cannot load Trello connections',stage});
 }
}
