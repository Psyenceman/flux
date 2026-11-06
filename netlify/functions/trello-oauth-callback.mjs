import {hash,decrypt,encrypt,db,json,REDIRECT,HOME} from './trello-shared.mjs';
const back=(result)=>({statusCode:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",'set-cookie':'flux_trello_state=; Path=/.netlify/functions/trello-oauth-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0'},body:'<!doctype html><html><head><meta charset="utf-8"><title>Trello connection</title></head><body style="font:16px system-ui;padding:30px"><h2>Trello: '+result+'</h2><p>You can close this window and return to Flux Studio.</p><a href="'+HOME+'">Return to Flux Studio</a><script>if(window.opener){window.opener.postMessage({type:"flux:trello-oauth",status:"'+result+'"},"https://flux-studio-test.netlify.app");window.close();}</script></body></html>'});
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const q=event.queryStringParameters||{};
 const cookie=(event.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('flux_trello_state='));
 const expected=cookie?.slice('flux_trello_state='.length);
 if(!expected||!q.state||expected!==q.state||!q.code||q.code.length>2048)return back('invalid');
 let stage='state_lookup';
 try{
  const rows=await db('flux_trello_oauth_states?state_hash=eq.'+encodeURIComponent(hash(q.state))+'&select=owner_id,verifier_ciphertext,expires_at');
  if(rows?.length!==1||Date.parse(rows[0].expires_at)<Date.now())return back('expired');
  const state=rows[0];
  await db('flux_trello_oauth_states?state_hash=eq.'+encodeURIComponent(hash(q.state)),'DELETE');
  stage='token_exchange';
  const tokenResponse=await fetch('https://auth.atlassian.com/oauth/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({grant_type:'authorization_code',client_id:process.env.TRELLO_CLIENT_ID,client_secret:process.env.TRELLO_CLIENT_SECRET,code:q.code,redirect_uri:REDIRECT,code_verifier:decrypt(state.verifier_ciphertext)}),signal:AbortSignal.timeout(12000)});
  if(!tokenResponse.ok)return back('exchange_failed');
  const tokens=await tokenResponse.json();
  if(typeof tokens.access_token!=='string'||!tokens.access_token)return back('exchange_failed');
  let account='Trello account';
  try{const r=await fetch('https://api.trello.com/1/members/me?fields=username,fullName',{headers:{authorization:'Bearer '+tokens.access_token},signal:AbortSignal.timeout(6000)});if(r.ok){const member=await r.json();account=String(member.fullName||member.username||account).slice(0,120);}}catch{}
  const ownerId=state.owner_id;
  stage='connection_lookup';
  let connections=await db('flux_connections?owner_id=eq.'+ownerId+'&provider=eq.trello&display_name=eq.Trello&select=id');
  if(!connections?.length){stage='connection_create';connections=await db('flux_connections','POST',{owner_id:ownerId,provider:'trello',display_name:'Trello',status:'pending'});}
  if(!connections?.[0]?.id)return back('connection_missing');
  const connectionId=connections[0].id;
  const expires=Number(tokens.expires_in)>0?new Date(Date.now()+Number(tokens.expires_in)*1000).toISOString():null;
  stage='credentials_save';
  await db('flux_trello_credentials?on_conflict=owner_id','POST',{owner_id:ownerId,connection_id:connectionId,access_token_ciphertext:encrypt(tokens.access_token),refresh_token_ciphertext:tokens.refresh_token?encrypt(tokens.refresh_token):null,expires_at:expires,account_label:account,updated_at:new Date().toISOString()});
  stage='connection_update';
  await db('flux_connections?id=eq.'+connectionId,'PATCH',{status:'connected',provider_account_label:account,updated_at:new Date().toISOString()});
  return back('connected');
 }catch{return back('failed_'+stage);}
}
