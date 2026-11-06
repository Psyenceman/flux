import {owner,getBearer,db,json} from './trello-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 let stage='authentication';
 try{
  const id=await owner(getBearer(event));
  if(!id)return json(401,{ok:false,error:'Sign in first'});
  stage='connections_query';
  const rows=await db('flux_connections?owner_id=eq.'+id+'&provider=eq.trello&select=id,status,provider_account_label');
  const credentials=await db('flux_trello_credentials?owner_id=eq.'+id+'&select=expires_at');
  const valid=Boolean(credentials?.length)&&(!credentials[0].expires_at||Date.parse(credentials[0].expires_at)>Date.now());
  const connections=(rows||[]).map(row=>({...row,status:row.status==='connected'&&valid?'connected':'disconnected'}));
  return json(200,{ok:true,connections});
 }catch(error){
  // Do not expose database responses, session tokens or credentials to the browser.
  console.error('Trello connections TEST failed at '+stage+': '+(error instanceof Error?error.name:'UnknownError'));
  return json(503,{ok:false,error:'Cannot load Trello connections',stage});
 }
}
