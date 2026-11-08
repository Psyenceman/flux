import {owner,getBearer,db,decrypt,json} from './trello-shared.mjs';
import {listGithubRepositories} from './github-connector.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const page=event.queryStringParameters?.cursor||'1';
 if(!/^[1-9][0-9]{0,2}$/.test(String(page))||Number(page)>200)return json(422,{ok:false,error:'Invalid repository page'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to choose your GitHub repositories'});
  const rows=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.github&select=token_ciphertext');
  if(rows?.length!==1)return json(409,{ok:false,error:'Connect GitHub in My connections first'});
  let token;try{token=decrypt(rows[0].token_ciphertext);}catch{return json(503,{ok:false,error:'GitHub connection unavailable. Reconnect your account.'});}
  return json(200,{ok:true,...await listGithubRepositories(token,page)});
 }catch(error){return json(502,{ok:false,error:error.message?.startsWith('Database')?'GitHub connection service unavailable':String(error.message||'Repositories unavailable').slice(0,240)});}
}
