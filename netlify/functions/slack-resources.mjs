import {owner,getBearer,db,decrypt,json} from './trello-shared.mjs';
import {listSlackChannels} from './slack-connector.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const cursor=event.queryStringParameters?.cursor||'';
 if(typeof cursor!=='string'||cursor.length>500||/[\r\n]/.test(cursor))return json(422,{ok:false,error:'Invalid page'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to choose your Slack channels'});
  const rows=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.slack&select=token_ciphertext');
  if(rows?.length!==1)return json(409,{ok:false,error:'Connect Slack in My connections first'});
  let token;try{token=decrypt(rows[0].token_ciphertext);}catch{return json(503,{ok:false,error:'Slack connection unavailable. Reconnect your bot.'});}
  return json(200,{ok:true,...await listSlackChannels(token,cursor)});
 }catch(error){return json(502,{ok:false,error:error.message?.startsWith('Database')?'Slack connection service unavailable':String(error.message||'Slack channels unavailable').slice(0,240)});}
}
