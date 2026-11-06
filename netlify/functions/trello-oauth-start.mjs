import {random,hash,encrypt,owner,db,getBearer,json,REDIRECT} from './trello-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 if(!process.env.TRELLO_CLIENT_ID||!process.env.TRELLO_CLIENT_SECRET||!process.env.FLUX_CONNECTION_ENCRYPTION_KEY)return json(503,{ok:false,error:'Trello OAuth is not fully configured'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to Flux Studio first'});
  const state=random(),verifier=random(),challenge=hash(verifier);
  await db('flux_trello_oauth_states','POST',{state_hash:hash(state),owner_id:id,verifier_ciphertext:encrypt(verifier),expires_at:new Date(Date.now()+600000).toISOString()});
  const params=new URLSearchParams({client_id:process.env.TRELLO_CLIENT_ID,scope:'read:board:trello write:board:trello read:organization:trello read:member:trello offline_access',redirect_uri:REDIRECT,response_type:'code',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
  const result=json(200,{ok:true,authorizeUrl:'https://auth.atlassian.com/authorize?'+params.toString()});
  result.headers['set-cookie']='flux_trello_state='+state+'; Path=/.netlify/functions/trello-oauth-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600';
  return result;
 }catch{return json(503,{ok:false,error:'Unable to initiate secure Trello connection'});}
}
