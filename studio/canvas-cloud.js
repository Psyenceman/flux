import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';
const $ = id => document.getElementById(id);
const status = text => { $('canvas-cloud-status').textContent = text; };
let client, user, rows = [];
const cards = $('flux-automation-cards');
const libraryStatus = $('flux-automation-library-status');
function drawLibrary(){
 if(!cards)return;
 cards.replaceChildren();
 if(!user){libraryStatus.textContent='Sign in to see your saved automations.';return;}
 libraryStatus.textContent=rows.length+' saved automations';
 if(!rows.length){const p=document.createElement('p');p.textContent='No automations yet. Create one in Flux Studio.';cards.append(p);return;}
 for(const row of rows){
  const button=document.createElement('button');button.type='button';button.className='flux-automation-card';button.setAttribute('role','listitem');button.setAttribute('aria-current',String(selection()?.id===row.id));
  const title=document.createElement('strong');title.textContent=row.name;
  const subtitle=document.createElement('small');subtitle.textContent=row.action_config?.graph?'Canvas saved · Open editor':'Canvas not saved yet';
  button.append(title,subtitle);button.addEventListener('click',async()=>{
   $('canvas-automation').value=row.id;drawLibrary();
   if(!row.action_config?.graph){status('This automation has no canvas yet.');return;}
   if(!confirm('Open '+row.name+'? Unsaved canvas changes will be replaced.'))return;
   try{await restoreGraph(row.action_config.graph);status('Opened '+row.name+'.');window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:row.id,name:row.name}}));}
   catch(error){status('Open failed: '+error.message);}
  });cards.append(button);
 }
}

const selection = () => rows.find(row => row.id === $('canvas-automation').value);
const apiPanel=document.createElement('div');apiPanel.className='flux-api-endpoint';
const apiLabel=document.createElement('strong');apiLabel.textContent='Workflow API · authenticated test';
const apiInput=document.createElement('input');apiInput.readOnly=true;apiInput.setAttribute('aria-label','Generated workflow API URL');
const copyApi=document.createElement('button');copyApi.type='button';copyApi.textContent='Copy API URL';copyApi.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(apiInput.value);status('API URL copied. Requires a valid Flux user session token.');}catch{apiInput.select();status('Select and copy the URL.');}});
const apiHelp=document.createElement('small');apiHelp.textContent='POST JSON with Authorization: Bearer <Flux session token>. Only the owner can run it. Test mode only; 1 FluxCoin per call.';
apiPanel.append(apiLabel,apiInput,copyApi,apiHelp);
$('canvas-cloud')?.append(apiPanel);
function updateApiPanel(){
 const row=selection();apiPanel.hidden=!user||!row?.action_config?.graph;
 if(apiPanel.hidden)return;
 apiInput.value=location.origin+'/.netlify/functions/flux-automation-api?automation='+encodeURIComponent(row.id);
}
$('canvas-automation')?.addEventListener('change',updateApiPanel);
const webhookPanel=document.createElement('section');webhookPanel.className='flux-webhook-panel';
const webhookTitle=document.createElement('strong');webhookTitle.textContent='Incoming webhook · TEST';
const webhookInfo=document.createElement('p');webhookInfo.textContent='Generate a unique URL and secret. The key is shown only once. Keep it private.';
const webhookUrl=document.createElement('input');webhookUrl.readOnly=true;webhookUrl.setAttribute('aria-label','Webhook URL');
const webhookKey=document.createElement('input');webhookKey.readOnly=true;webhookKey.placeholder='Secret appears once when generated';webhookKey.setAttribute('aria-label','New webhook secret');
const webhookCreate=document.createElement('button');webhookCreate.textContent='Generate / rotate key';
const webhookToggle=document.createElement('button');webhookToggle.textContent='Activate webhook';
const webhookRevoke=document.createElement('button');webhookRevoke.textContent='Revoke key';
const webhookHistory=document.createElement('div');webhookHistory.className='flux-webhook-history';
const webhookTest=document.createElement('div');webhookTest.className='flux-webhook-test';
const webhookTestLabel=document.createElement('label');webhookTestLabel.textContent='Private test key (never saved)';
const webhookTestSecret=document.createElement('input');webhookTestSecret.type='password';webhookTestSecret.autocomplete='off';webhookTestSecret.placeholder='Paste fw_… key here';
webhookTestLabel.append(webhookTestSecret);
const webhookTestButton=document.createElement('button');webhookTestButton.type='button';webhookTestButton.textContent='Send TEST webhook';
const webhookTestResult=document.createElement('pre');webhookTestResult.setAttribute('aria-live','polite');
webhookTest.append(webhookTestLabel,webhookTestButton,webhookTestResult);
webhookPanel.append(webhookTitle,webhookInfo,webhookUrl,webhookKey,webhookCreate,webhookToggle,webhookRevoke,webhookTest,webhookHistory);
webhookTestButton.addEventListener('click',async()=>{
 const row=selection();
 if(row?.name!=='Flux – Test webhook'||!currentWebhook?.enabled){webhookTestResult.textContent='Only the active Flux – Test webhook can be tested here.';return;}
 const graph=row.action_config?.graph;
 if(!graph||graph.nodes?.length!==2||!graph.nodes.some(n=>n.type==='webhook')||!graph.nodes.some(n=>n.type==='log')||graph.nodes.some(n=>!['webhook','log'].includes(n.type))){webhookTestResult.textContent='Safety check failed: expected Webhook → Log only.';return;}
 const secret=webhookTestSecret.value.trim();
 if(!/^fw_[a-f0-9]{64}$/.test(secret)){webhookTestResult.textContent='Paste the original webhook key (fw_…) to test.';return;}
 if(!confirm('Send one TEST request? This may deduct 1 FluxCoin.'))return;
 webhookTestButton.disabled=true;webhookTestResult.textContent='Sending TEST request…';
 try{
  const response=await fetch(webhookUrl.value,{method:'POST',headers:{'content-type':'application/json','x-flux-webhook-key':secret},body:JSON.stringify({source:'flux-studio-test',status:'approved'})});
  const data=await response.json();
  webhookTestResult.textContent='HTTP '+response.status+'\\n'+JSON.stringify(data,null,2);
  window.dispatchEvent(new Event('flux:coins-refresh'));
  await updateWebhookPanel();
 }catch(error){webhookTestResult.textContent='Request failed: '+error.message;}
 finally{webhookTestSecret.value='';webhookTestButton.disabled=false;}
});
$('canvas-cloud')?.append(webhookPanel);
let currentWebhook=null;
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function updateWebhookPanel(){
 const row=selection();webhookPanel.hidden=!user||!row?.action_config?.graph;
 if(webhookPanel.hidden){currentWebhook=null;return;}
 const {data,error}=await client.from('flux_webhooks').select('id,enabled,revoked_at').eq('automation_id',row.id).maybeSingle();
 if(error){webhookInfo.textContent='Webhook unavailable: '+error.message;return;}
 currentWebhook=data;
 webhookUrl.value=data?location.origin+'/.netlify/functions/flux-webhook?id='+data.id:'';
 webhookKey.value='';
 webhookToggle.disabled=!data||!!data.revoked_at;
 webhookToggle.textContent=data?.enabled?'Deactivate webhook':'Activate webhook';
 webhookRevoke.disabled=!data||!!data.revoked_at;
 webhookInfo.textContent=data?.revoked_at?'Key revoked. Generate a new key.':data?'Use POST JSON with x-flux-webhook-key header. Keep the secret private.':'Generate a webhook key to begin.';
 webhookHistory.replaceChildren();
 if(data){
  const logs=await client.from('flux_webhook_requests').select('received_at,status,http_status,error_code').eq('webhook_id',data.id).order('received_at',{ascending:false}).limit(20);
  if(logs.error){webhookHistory.textContent='Request history unavailable';return;}
  for(const log of logs.data||[]){const p=document.createElement('p');p.textContent=new Date(log.received_at).toLocaleString()+' · '+log.status;webhookHistory.append(p);}
 }
}
webhookCreate.addEventListener('click',async()=>{
 const row=selection();if(!row||!user)return;
 if(currentWebhook&&!confirm('Rotate webhook key? The old key will stop working immediately.'))return;
 const secret='fw_'+toHex(crypto.getRandomValues(new Uint8Array(32)));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));
 const secret_hash=toHex(new Uint8Array(digest));
 const result=currentWebhook
 ?await client.from('flux_webhooks').update({secret_hash,enabled:false,revoked_at:null}).eq('id',currentWebhook.id).eq('owner_id',user.id)
 :await client.from('flux_webhooks').insert({automation_id:row.id,owner_id:user.id,secret_hash});
 if(result.error){status('Webhook generation failed: '+result.error.message);return;}
 await updateWebhookPanel();webhookKey.value=secret;status('Webhook generated. Copy the secret now: it cannot be retrieved later.');
});
webhookToggle.addEventListener('click',async()=>{
 const row=selection();if(!currentWebhook||!row)return;
 const enabled=!currentWebhook.enabled;
 if(enabled&&!confirm('Enable external webhook execution for '+row.name+'? Incoming requests can trigger live actions and use FluxCoins.'))return;
 const automation=await client.from('automations').update({enabled}).eq('id',row.id).eq('owner_id',user.id);
 if(automation.error){status(automation.error.message);return;}
 const result=await client.from('flux_webhooks').update({enabled}).eq('id',currentWebhook.id).eq('owner_id',user.id);
 if(result.error){await client.from('automations').update({enabled:false}).eq('id',row.id).eq('owner_id',user.id);status('Activation failed: '+result.error.message);return;}
 await updateWebhookPanel();status(enabled?'Webhook enabled.':'Webhook disabled.');
});
webhookRevoke.addEventListener('click',async()=>{
 if(!currentWebhook||!confirm('Revoke this webhook key immediately?'))return;
 const result=await client.from('flux_webhooks').update({enabled:false,revoked_at:new Date().toISOString()}).eq('id',currentWebhook.id).eq('owner_id',user.id);
 if(result.error){status(result.error.message);return;}
 await updateWebhookPanel();status('Webhook key revoked.');
});
$('canvas-automation')?.addEventListener('change',updateWebhookPanel);


async function refresh() {
  const { data: auth, error: authError } = await client.auth.getUser();
  user = auth?.user;
  if (authError || !user) {
    $('canvas-cloud-user').textContent = 'Sign in from Flux Studio to use cloud automations';
    status('Local canvas is still available.');
    rows=[];drawLibrary();updateApiPanel();updateWebhookPanel();refreshFluxCoins();
    return;
  }
  $('canvas-cloud-user').textContent = user.email;
  const { data, error } = await client.from('automations').select('id,name,action_config,project_id').order('updated_at',{ascending:false});
  if (error) return status(error.message);
  rows = data || [];
  const chosen = $('canvas-automation').value;
  $('canvas-automation').replaceChildren(new Option('Select saved automation',''));
  for (const row of rows) $('canvas-automation').add(new Option(row.name,row.id));
  if (rows.some(row=>row.id===chosen)) $('canvas-automation').value=chosen;
  else {
    const requested = new URLSearchParams(location.search).get('automation');
    if (requested && rows.some(row=>row.id===requested)) $('canvas-automation').value=requested;
  }
  drawLibrary();updateApiPanel();
  refreshFluxCoins();
  status(rows.length+' automation(s) available. Select one to load or save its canvas.');
}
async function refreshFluxCoins(){
 if(!client||!user){window.dispatchEvent(new CustomEvent('flux:coins-loaded',{detail:{signedIn:false}}));return;}
 const [{data:profile,error:profileError},{data:wallet,error:walletError},{data:ledger,error:ledgerError}]=await Promise.all([
  client.from('profiles').select('role').eq('id',user.id).maybeSingle(),
  client.from('flux_credit_accounts').select('balance,lifetime_used').eq('user_id',user.id).maybeSingle(),
  client.from('flux_credit_ledger').select('delta,action,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
 ]);
 window.dispatchEvent(new CustomEvent('flux:coins-loaded',{detail:{
  signedIn:true,unlimited:!profileError&&profile?.role==='super_admin',
  balance:walletError?null:(wallet?.balance??100),used:wallet?.lifetime_used??0,
  entries:ledgerError?[]:(ledger||[]),error:walletError?.message||ledgerError?.message||null
 }}));
}
window.addEventListener('flux:run-completed',refreshFluxCoins);
window.addEventListener('flux:coins-refresh',refreshFluxCoins);
function requestSnapshot() {
  return new Promise((resolve,reject)=>{
    const timeout = setTimeout(()=>{cleanup();reject(new Error('Canvas did not respond'));},2000);
    const receive = event=>{cleanup();resolve(event.detail);};
    const cleanup=()=>{clearTimeout(timeout);window.removeEventListener('flux:canvas-snapshot',receive);};
    window.addEventListener('flux:canvas-snapshot',receive,{once:true});
    window.dispatchEvent(new Event('flux:canvas-snapshot-request'));
  });
}
function restoreGraph(graph) {
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{cleanup();reject(new Error('Canvas did not respond'));},2000);
    const success=()=>{cleanup();resolve();};
    const fail=event=>{cleanup();reject(new Error(event.detail));};
    const cleanup=()=>{clearTimeout(timeout);window.removeEventListener('flux:canvas-restored',success);window.removeEventListener('flux:canvas-restore-error',fail);};
    window.addEventListener('flux:canvas-restored',success,{once:true});
    window.addEventListener('flux:canvas-restore-error',fail,{once:true});
    window.dispatchEvent(new CustomEvent('flux:canvas-restore-request',{detail:graph}));
  });
}
$('canvas-cloud-load').addEventListener('click',async()=>{
  const row=selection();
  if(!row) return status('Select an automation first.');
  const graph=row.action_config?.graph;
  if(!graph) return status('This automation has no saved canvas yet. Design it and click Save canvas to cloud.');
  if(!confirm('Replace the current canvas with the saved cloud graph? Export any unsaved changes first.')) return;
  try{await restoreGraph(graph);drawLibrary();window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:row.id,name:row.name}}));status('Canvas loaded from Supabase. No workflow was executed.');}
  catch(error){status('Load failed: '+error.message);}
});
$('canvas-cloud-save').addEventListener('click',async()=>{
  const row=selection();
  if(!row) return status('Select an automation first.');
  if(!confirm('Overwrite the saved canvas for this automation? This does not activate execution.')) return;
  try {
    const graph=await requestSnapshot();
    const action_config={...row.action_config,graph,version:2};
    const {data,error}=await client.from('automations').update({action_config,enabled:false,updated_at:new Date().toISOString()}).eq('id',row.id).select('id').single();
    if(error) throw error;
    row.action_config=action_config;
    drawLibrary();updateApiPanel();status('Canvas saved to Supabase. Automation remains disabled.');
  } catch(error){status('Save failed: '+error.message);}
});
try {
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.10');
  client=createClient(supabaseUrl,supabasePublishableKey);
  await refresh();
  client.auth.onAuthStateChange(()=>queueMicrotask(refresh));
} catch(error){status('Cloud connection failed: '+error.message);}

window.addEventListener('flux:session-request',async()=>{if(!client){window.dispatchEvent(new CustomEvent('flux:session-response',{detail:null}));return;}const {data}=await client.auth.getSession();window.dispatchEvent(new CustomEvent('flux:session-response',{detail:data?.session?.access_token||null}));});

/* Persistent per-user execution summaries. No raw inputs, outputs or tokens stored. */
const runHistory=$('flux-automation-log-list');
const historyRefresh=document.createElement('button');historyRefresh.type='button';historyRefresh.textContent='Refresh cloud history';historyRefresh.title='Load saved execution records';historyRefresh.addEventListener('click',()=>refreshRunHistory());runHistory?.before(historyRefresh);
async function refreshRunHistory(){
 const row=selection();if(!client||!user||!row||!runHistory)return;
 const {data,error}=await client.from('automation_runs').select('id,status,started_at,finished_at,result,error_message').eq('automation_id',row.id).order('started_at',{ascending:false}).limit(30);
 if(error){window.dispatchEvent(new CustomEvent('flux:persistent-runs',{detail:{automationId:row.id,runs:[],error:error.message}}));status('History unavailable: '+error.message);return;}
 window.dispatchEvent(new CustomEvent('flux:persistent-runs',{detail:{automationId:row.id,runs:data||[]}}));
}
window.addEventListener('flux:automation-opened',refreshRunHistory);
window.addEventListener('flux:run-completed',()=>{if(selection())refreshRunHistory();});
$('canvas-automation')?.addEventListener('change',refreshRunHistory);
window.addEventListener('flux:run-summary',async event=>{
 const row=selection();if(!client||!user||!row)return;
 const detail=event.detail||{},steps=Array.isArray(detail.trace)?detail.trace:[];
 const result={dryRun:detail.dryRun!==false,steps:steps.slice(0,100).map(step=>({id:String(step.id||'').slice(0,80),type:String(step.type||'').slice(0,60),status:String(step.status||'').slice(0,30),reason:String(step.reason||'').slice(0,200)}))};
 const {error}=await client.from('automation_runs').insert({automation_id:row.id,owner_id:user.id,status:detail.ok?'completed':'failed',started_at:new Date().toISOString(),finished_at:new Date().toISOString(),result,error_message:detail.ok?null:String(detail.error||'Execution failed').slice(0,200)});
 if(error)status('Run history could not be saved: '+error.message);
 else refreshRunHistory();
});
