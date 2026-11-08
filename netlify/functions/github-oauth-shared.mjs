import {db,decrypt,encrypt,random,hash} from './trello-shared.mjs';
export const ORIGIN='https://flux-studio-test.netlify.app';
export const CALLBACK=ORIGIN+'/.netlify/functions/github-oauth-callback';
export const COOKIE='flux_github_state';
export const cookie=value=>COOKIE+'='+value+'; Path=/.netlify/functions/github-oauth-callback; HttpOnly; Secure; SameSite=Lax; Max-Age='+(value?'600':'0');
export function configured(){return Boolean(process.env.FLUX_GITHUB_APP_CLIENT_ID&&process.env.FLUX_GITHUB_APP_CLIENT_SECRET&&/^[a-z0-9][a-z0-9-]{0,80}$/.test(process.env.FLUX_GITHUB_APP_SLUG||'')&&process.env.FLUX_CONNECTION_ENCRYPTION_KEY?.length>=32);}
export async function newState(id,phase='authorize'){
 const state=random();await db('flux_github_oauth_states?on_conflict=owner_id','POST',{state_hash:hash(state),owner_id:id,phase,claim_nonce:null,expires_at:new Date(Date.now()+600000).toISOString()});return state;
}
export function authorizationUrl(state){return 'https://github.com/login/oauth/authorize?'+new URLSearchParams({client_id:process.env.FLUX_GITHUB_APP_CLIENT_ID,redirect_uri:CALLBACK,state,scope:'offline_access'});}
export function installationUrl(state){return 'https://github.com/apps/'+process.env.FLUX_GITHUB_APP_SLUG+'/installations/new?'+new URLSearchParams({state});}
export async function exchangeTokens(parameters){
 if(!configured())throw Error('GitHub authorization setup is pending');
 const body=new URLSearchParams({client_id:process.env.FLUX_GITHUB_APP_CLIENT_ID,client_secret:process.env.FLUX_GITHUB_APP_CLIENT_SECRET,...parameters});
 let response;try{response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded'},body:body.toString(),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error('GitHub authorization unavailable. Please reconnect.');}
 let data;try{data=await response.json();}catch{throw Error('GitHub authorization response invalid');}
 if(!response.ok||data.error||typeof data.access_token!=='string'||!/^ghu_[A-Za-z0-9_]+$/.test(data.access_token)||data.access_token.length>4096||typeof data.refresh_token!=='string'||!/^ghr_[A-Za-z0-9_]+$/.test(data.refresh_token)||data.refresh_token.length>4096||!Number.isFinite(data.expires_in)||data.expires_in<60||data.expires_in>86400||!Number.isFinite(data.refresh_token_expires_in)||data.refresh_token_expires_in<60||data.refresh_token_expires_in>31968000)throw Error('GitHub authorization rejected. Please reconnect.');
 return {format:'flux-github-oauth-v1',accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+data.expires_in*1000,refreshExpiresAt:Date.now()+data.refresh_token_expires_in*1000};
}
export function unpackCredential(ciphertext){const value=decrypt(ciphertext);if(!value.startsWith('{'))return {format:'personal-token',accessToken:value};const data=JSON.parse(value);if(data?.format!=='flux-github-oauth-v1'||typeof data.accessToken!=='string'||typeof data.refreshToken!=='string'||!Number.isFinite(data.expiresAt)||!Number.isFinite(data.refreshExpiresAt))throw Error('Invalid GitHub connection');return data;}
export async function githubAccessToken(id,row){
 if(!row){const rows=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.github&select=token_ciphertext');row=rows?.[0];}
 if(!row)throw Error('Connect GitHub before continuing');
 const data=unpackCredential(row.token_ciphertext);
 if(data.format==='personal-token'||data.expiresAt>Date.now()+60000)return data.accessToken;
 if(data.refreshExpiresAt<=Date.now())throw Error('GitHub authorization expired. Reconnect your account.');
 if(data.leaseUntil>Date.now())throw Error('GitHub connection is refreshing. Try again shortly.');
 if(!configured())throw Error('GitHub authorization setup is pending');
 const leased=encrypt(JSON.stringify({...data,leaseUntil:Date.now()+30000}));
 const path='flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.github&token_ciphertext=eq.'+encodeURIComponent(row.token_ciphertext);
 const claimed=await db(path,'PATCH',{token_ciphertext:leased});
 if(claimed?.length!==1)throw Error('GitHub connection changed or is refreshing. Try again shortly.');
 try{
  const fresh=await exchangeTokens({grant_type:'refresh_token',refresh_token:data.refreshToken});
  const saved=await db('flux_connector_credentials?owner_id=eq.'+encodeURIComponent(id)+'&provider=eq.github&token_ciphertext=eq.'+encodeURIComponent(leased),'PATCH',{token_ciphertext:encrypt(JSON.stringify(fresh)),updated_at:new Date().toISOString()});
  if(saved?.length!==1)throw Error('GitHub connection changed. Please try again.');
  return fresh.accessToken;
 }catch{
  // Retain a short lease after an ambiguous refresh: never race reuse of a rotating token.
  throw Error('GitHub session could not be renewed. Try again shortly or reconnect.');
 }
}
export async function githubIdentity(token){
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json','User-Agent':'Flux-Studio-TEST','X-GitHub-Api-Version':'2022-11-28'};
 const [identity,installations]=await Promise.all([fetch('https://api.github.com/user',{headers,redirect:'error',signal:AbortSignal.timeout(8000)}),fetch('https://api.github.com/user/installations?per_page=100',{headers,redirect:'error',signal:AbortSignal.timeout(8000)})]);
 if(!identity.ok||!installations.ok)throw Error('GitHub account verification failed');
 const user=await identity.json(),apps=await installations.json();if(typeof user.login!=='string'||!Array.isArray(apps.installations))throw Error('Invalid GitHub identity');
 return {label:user.login.slice(0,100),installed:apps.installations.some(app=>app.app_slug===process.env.FLUX_GITHUB_APP_SLUG&&!app.suspended_at&&app.permissions?.issues==='write')};
}
