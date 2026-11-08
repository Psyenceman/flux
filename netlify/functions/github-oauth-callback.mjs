import {randomUUID,randomBytes} from 'node:crypto';
import {db,encrypt,hash,json,random} from './trello-shared.mjs';
import {ORIGIN,CALLBACK,COOKIE,cookie,configured,installationUrl,exchangeTokens,githubIdentity} from './github-oauth-shared.mjs';
function back(status){
 const nonce=randomBytes(18).toString('base64'),labels={connected:'GitHub connected',denied:'Authorization cancelled',invalid:'Authorization could not be verified',expired:'Authorization expired',failed:'Connection could not be completed',installation_required:'Select repositories and allow Issues access in the Flux GitHub App'};
 return {statusCode:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':cookie(''),'content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"},body:'<!doctype html><html><head><meta charset="utf-8"><title>Flux · GitHub</title></head><body style="font:16px system-ui;max-width:520px;margin:60px auto;padding:24px;color:#182c48"><h1>'+labels[status]+'</h1><p>Return to Flux to continue. You can close this window.</p><a href="'+ORIGIN+'/flow-canvas.html">Return to Flux</a><script nonce="'+nonce+'">history.replaceState(null,"","'+new URL(CALLBACK).pathname+'");if(window.opener){window.opener.postMessage({type:"flux:github-oauth",status:"'+status+'"},"'+ORIGIN+'");window.close();}</script></body></html>'};
}
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const q=event.queryStringParameters||{},expected=(event.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!/^[A-Za-z0-9_-]{43}$/.test(q.state||'')||q.state!==expected)return back('invalid');
 const claim=randomUUID(),stateHash=hash(q.state);
 try{
  // Atomic claim: parallel/replayed callbacks cannot exchange the same code.
  const rows=await db('flux_github_oauth_states?state_hash=eq.'+encodeURIComponent(stateHash)+'&claim_nonce=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),'PATCH',{claim_nonce:claim});
  if(rows?.length!==1)return back('expired');const state=rows[0];
  if(q.error){await db('flux_github_oauth_states?state_hash=eq.'+encodeURIComponent(stateHash),'DELETE');return back('denied');}
  if(!configured()||typeof q.code!=='string'||!q.code||q.code.length>2048)throw Error('Invalid authorization');
  const tokens=await exchangeTokens({code:q.code,redirect_uri:CALLBACK}),identity=await githubIdentity(tokens.accessToken);
  if(!identity.installed){
   if(state.phase==='install'){await db('flux_github_oauth_states?state_hash=eq.'+encodeURIComponent(stateHash),'DELETE');return back('installation_required');}
   // Continue inside this same popup; GitHub requests user authorization during installation.
   const next=random(),continued=await db('flux_github_oauth_states?state_hash=eq.'+encodeURIComponent(stateHash)+'&claim_nonce=eq.'+claim,'PATCH',{state_hash:hash(next),phase:'install',claim_nonce:null,expires_at:new Date(Date.now()+600000).toISOString()});if(continued?.length!==1)return back('expired');return {statusCode:302,headers:{location:installationUrl(next),'set-cookie':cookie(next),'cache-control':'no-store','referrer-policy':'no-referrer'},body:''};
  }
  // State consumption and credential replacement are one transaction. Disconnect cancels pending state.
  const saved=await db('rpc/flux_finalize_github_oauth','POST',{p_state_hash:stateHash,p_claim_nonce:claim,p_ciphertext:encrypt(JSON.stringify(tokens)),p_label:identity.label});
  return back(saved===true?'connected':'expired');
 }catch{
  try{await db('flux_github_oauth_states?state_hash=eq.'+encodeURIComponent(stateHash)+'&claim_nonce=eq.'+claim,'DELETE');}catch{}
  return back('failed');
 }
}
