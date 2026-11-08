import {owner,getBearer,db,json} from './trello-shared.mjs';
import {configured,unpackCredential} from './github-oauth-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const available=configured();
 try{
  const bearer=getBearer(event),id=bearer?await owner(bearer):null;
  if(!id)return json(200,{ok:true,configured:available,signedIn:false,connected:false});
  const rows=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.github&select=token_ciphertext,account_label');
  if(!rows?.length)return json(200,{ok:true,configured:available,signedIn:true,connected:false});
  const credential=unpackCredential(rows[0].token_ciphertext),valid=credential.format==='personal-token'||credential.expiresAt>Date.now()||available&&credential.refreshExpiresAt>Date.now();
  return json(200,{ok:true,configured:available,signedIn:true,connected:valid,label:rows[0].account_label,method:credential.format==='personal-token'?'personal_token':'github_app'});
 }catch{return json(503,{ok:false,configured:available,error:'GitHub connection status unavailable. Try again.'});}
}
