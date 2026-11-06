import {randomBytes,createHash,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto';
export const BASE='https://sgxinvmfkznzoueqjzop.supabase.co';
export const REDIRECT='https://flux-studio-test.netlify.app/.netlify/functions/trello-oauth-callback';
export const HOME='https://flux-studio-test.netlify.app/flow-canvas.html';
export const json=(code,data)=>({statusCode:code,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)});
export const hash=value=>createHash('sha256').update(value).digest('base64url');
export const random=()=>randomBytes(32).toString('base64url');
function cryptKey(){const value=process.env.FLUX_CONNECTION_ENCRYPTION_KEY;if(!value||value.length<32)throw Error('Missing connection encryption key');return Buffer.from(hkdfSync('sha256',Buffer.from(value),'flux-test','trello-v1',32));}
export function encrypt(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cryptKey(),iv),data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export function decrypt(value){const b=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',cryptKey(),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');}
function secret(){const value=process.env.FLUX_SUPABASE_SERVICE_ROLE_KEY;if(!value)throw Error('Missing database service key');return value;}
export async function db(path,method='GET',body){const key=secret(),response=await fetch(BASE+'/rest/v1/'+path,{method,headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json',prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Database error '+response.status);const text=await response.text();return text?JSON.parse(text):null;}
export async function owner(token){if(!/^[A-Za-z0-9._-]+$/.test(token||''))return null;const key=secret(),r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:key,authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});if(!r.ok)return null;const u=await r.json();return u.aud==='authenticated'?u.id:null;}
export const getBearer=event=>(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer /i,'');
export const safeError=()=>json(503,{ok:false,error:'Trello connection unavailable. Check TEST configuration.'});
