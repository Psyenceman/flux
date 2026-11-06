import {db,decrypt} from './trello-shared.mjs';
import {createHash,timingSafeEqual} from 'node:crypto';
import {executeGraph,validateGraph} from './flux-graph-engine.mjs';
const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});

 if(event.isBase64Encoded||(event.body||'').length>75000)return json(413,{ok:false,error:'Payload too large'});
 let body;try{body=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
 if(!body||typeof body!=='object'||Array.isArray(body)||!body.input||typeof body.input!=='object'||Array.isArray(body.input))return json(422,{ok:false,error:'Graph and object input required'});
 const dryRun=body.dryRun!==false;
 const supplied=event.headers?.['x-flux-token']||event.headers?.['X-Flux-Token']||'';
 const token=process.env.FLUX_WEBHOOK_TOKEN;
 const legacy=typeof supplied==='string'&&token?.length>=24&&equal(supplied,token);
 let sessionToken='';
 let sessionOwner='';
 if(!legacy){
  const authorization=event.headers?.authorization||event.headers?.Authorization||'';
  const bearer=authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  if(!bearer)return json(401,{ok:false,error:'Sign in to Flux Studio before running a workflow'});
  let authenticated=false;
  try{
   const response=await fetch('https://sgxinvmfkznzoueqjzop.supabase.co/auth/v1/user',{
    headers:{apikey:'sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu',authorization:'Bearer '+bearer[1]},
    signal:AbortSignal.timeout(5000)
   });
   if(response.ok){const identity=await response.json();authenticated=Boolean(identity?.id&&identity?.aud==='authenticated');if(authenticated)sessionOwner=identity.id;}
  }catch{return json(503,{ok:false,error:'Authentication service unavailable'});}
  if(!authenticated)return json(401,{ok:false,error:'Flux Studio session expired. Sign in again.'});
  sessionToken=bearer[1];
  if(!dryRun){
   const nodes=body.graph?.nodes,edges=body.graph?.edges;
   if(!Array.isArray(nodes)||nodes.length!==1||!Array.isArray(edges)||edges.length!==0||nodes[0]?.type!=='trello'||nodes[0]?.config?.operation!=='create_card')
    return json(403,{ok:false,error:'Live TEST execution is limited to a single Trello Create card block'});
   if(body.confirmLiveTrello!==true)return json(403,{ok:false,error:'Explicit Trello creation confirmation required'});
  }
 }

 let notificationUrl;
 if(process.env.FLUX_NOTIFICATION_WEBHOOK_URL){
  try{const url=new URL(process.env.FLUX_NOTIFICATION_WEBHOOK_URL);if(url.protocol!=='https:'||url.username||url.password)throw Error();notificationUrl=url.toString();}
  catch{return json(503,{ok:false,error:'Server notification URL invalid'});}
 }
 try{
  validateGraph(body.graph);
  if(!dryRun&&(!sessionOwner||body.confirmLiveTrello!==true))return json(403,{ok:false,error:'Authenticated confirmation required for Trello writes'});
  let credits=null;
  if(sessionToken){
   const creditResponse=await fetch('https://sgxinvmfkznzoueqjzop.supabase.co/rest/v1/rpc/flux_consume_credit',{
    method:'POST',headers:{apikey:'sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu',authorization:'Bearer '+sessionToken,'content-type':'application/json'},
    body:JSON.stringify({p_action:dryRun?'workflow_test':'workflow_run'}),signal:AbortSignal.timeout(5000)
   });
   if(!creditResponse.ok)return json(503,{ok:false,error:'FluxCoins temporarily unavailable. No workflow executed.'});
   credits=await creditResponse.json();
   if(!credits?.ok)return json(402,{ok:false,error:'Insufficient FluxCoins',credits});
  }
  let trelloAccessToken;
  if(sessionOwner&&body.graph.nodes.some(n=>n.type==='trello')){
   const records=await db('flux_trello_credentials?owner_id=eq.'+encodeURIComponent(sessionOwner)+'&select=access_token_ciphertext,expires_at');
   if(!records?.length)return json(409,{ok:false,error:'Connect Trello before testing this workflow'});
   if(records[0].expires_at&&Date.parse(records[0].expires_at)<Date.now())return json(409,{ok:false,error:'Trello connection expired. Reconnect your account.'});
   trelloAccessToken=decrypt(records[0].access_token_ciphertext);
  }
  // Never let graph authors select arbitrary server-connected resources.
  const connectorBlocks=body.graph.nodes.filter(n=>['airtable','sheets','supabase'].includes(n.type));
  if(connectorBlocks.length){
   const allowedAirtable=(process.env.FLUX_AIRTABLE_ALLOWED_BASES||'').split(',').map(v=>v.trim()).filter(Boolean);
   const allowedSheets=(process.env.FLUX_SHEETS_ALLOWED_IDS||'').split(',').map(v=>v.trim()).filter(Boolean);
   const allowedTables=(process.env.FLUX_SUPABASE_ALLOWED_TABLES||'').split(',').map(v=>v.trim()).filter(Boolean);
   for(const node of connectorBlocks){
    const config=node.config||{};
    if(node.type==='airtable'&&!allowedAirtable.includes(String(config.baseId||'')))return json(403,{ok:false,error:'Airtable base is not approved for Flux TEST'});
    if(node.type==='sheets'&&!allowedSheets.includes(String(config.spreadsheetId||'')))return json(403,{ok:false,error:'Google Sheets spreadsheet is not approved for Flux TEST'});
    if(node.type==='supabase'&&!allowedTables.includes(String(config.table||'')))return json(403,{ok:false,error:'Supabase table is not approved for Flux TEST'});
   }
  }
  const result=await executeGraph(body.graph,body.input,{dryRun,notificationUrl,trelloAccessToken,airtableToken:process.env.FLUX_AIRTABLE_READ_TOKEN,googleSheetsToken:process.env.FLUX_GOOGLE_SHEETS_TOKEN,supabaseUrl:process.env.FLUX_CONNECTOR_SUPABASE_URL,supabaseServiceToken:process.env.FLUX_CONNECTOR_SUPABASE_TOKEN,telegramToken:process.env.FLUX_TELEGRAM_BOT_TOKEN,telegramChatId:process.env.FLUX_TELEGRAM_CHAT_ID,resendApiKey:process.env.FLUX_RESEND_API_KEY,resendFrom:process.env.FLUX_RESEND_FROM});const metering={model:'preview-v1',unit:'standard_operation',rateFluxCoins:1,billableOperations:result.trace.filter(step=>step.status==='completed').length,simulatedOperations:result.trace.filter(step=>step.status==='simulated').length,excludedOperations:result.trace.filter(step=>['skipped','filtered','failed'].includes(step.status)).length,estimatedFluxCoins:result.trace.filter(step=>step.status==='completed').length,chargedByMetering:false};return json(200,{...result,credits,metering});
 }
 catch(error){console.error(JSON.stringify({event:'flux.graph.failed',reason:String(error?.message||error)}));return json(422,{ok:false,error:String(error?.message||'Execution failed').slice(0,240)});}
}
