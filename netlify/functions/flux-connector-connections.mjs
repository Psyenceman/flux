import {owner,getBearer,db,json,encrypt} from './trello-shared.mjs';
const providers=['airtable','hubspot','notion'];
const fail=()=>json(503,{ok:false,error:'Connection service unavailable. Check TEST database migration and encryption settings.'});
export async function handler(event){
 if(!['GET','POST','DELETE'].includes(event.httpMethod))return json(405,{ok:false,error:'Method not supported'});
 if(event.isBase64Encoded||(event.body||'').length>4096)return json(413,{ok:false,error:'Payload too large'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to manage your connections'});
  if(event.httpMethod==='GET'){
   const rows=await db('flux_connector_credentials?owner_id=eq.'+id+'&select=provider,account_label,updated_at');
   return json(200,{ok:true,connections:(rows||[]).map(r=>({provider:r.provider,label:r.account_label,connected:true,updatedAt:r.updated_at}))});
  }
  let data;try{data=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
  const provider=String(data?.provider||'');
  if(!providers.includes(provider))return json(422,{ok:false,error:'Unsupported provider'});
  if(event.httpMethod==='DELETE'){
   await db('flux_connector_credentials?owner_id=eq.'+id+'&provider=eq.'+provider,'DELETE');
   return json(200,{ok:true,provider,connected:false});
  }
  const token=String(data?.token||'').trim(),label=String(data?.label||provider).trim().slice(0,100);
  if(token.length<12||token.length>2048||/[\s\r\n]/.test(token))return json(422,{ok:false,error:'Invalid credential format'});
  if(provider==='airtable'&&!token.startsWith('pat'))return json(422,{ok:false,error:'Use an Airtable personal access token'});
  const ciphertext=encrypt(token);
  await db('flux_connector_credentials','POST',{owner_id:id,provider,token_ciphertext:ciphertext,account_label:label,updated_at:new Date().toISOString()});
  return json(200,{ok:true,provider,connected:true,label,verified:false,message:'Credential encrypted and stored; API access has not been verified yet'});
 }catch(error){console.error('Connector credentials failed:',error?.name||'Error');return fail();}
}
