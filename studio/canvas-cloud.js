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
  const indicator=document.createElement('small');indicator.textContent=row.enabled?'Active':'Paused';indicator.className=row.enabled?'flux-state-active':'flux-state-paused';button.append(title,subtitle,indicator);button.addEventListener('click',async()=>{
   $('canvas-automation').value=row.id;drawLibrary();renderManage();
   if(!row.action_config?.graph){status('This automation has no canvas yet.');return;}
   if(!confirm('Open '+row.name+'? Unsaved canvas changes will be replaced.'))return;
   try{await restoreGraph(row.action_config.graph);status('Opened '+row.name+'.');window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:row.id,name:row.name}}));}
   catch(error){status('Open failed: '+error.message);}
  });cards.append(button);
 }
}

const selection = () => rows.find(row => row.id === $('canvas-automation').value);
// Phase 5: owner-only workflow management. RLS enforces ownership server-side.
const managePanel=document.createElement('section');managePanel.className='flux-manage-panel';
managePanel.setAttribute('aria-label','Manage selected automation');
const manageTitle=document.createElement('strong');manageTitle.textContent='Manage selected automation';
const manageState=document.createElement('p');manageState.setAttribute('role','status');
const pauseButton=document.createElement('button');pauseButton.type='button';pauseButton.textContent='Pause';
const renameButton=document.createElement('button');renameButton.type='button';renameButton.textContent='Rename';
const deleteButton=document.createElement('button');deleteButton.type='button';deleteButton.textContent='Delete';
deleteButton.className='flux-manage-danger';
managePanel.append(manageTitle,manageState,pauseButton,renameButton,deleteButton);
cards?.after(managePanel);
let manageBusy=false;
function renderManage(){
 const row=selection(),available=Boolean(user&&row);
 managePanel.hidden=!available;
 if(!available)return;
 manageState.textContent=(row.enabled?'Active':'Paused')+' · '+(row.trigger_type||'manual')+' trigger';
 pauseButton.textContent=row.enabled?'Pause automation':'Resume automation';
 for(const button of [pauseButton,renameButton,deleteButton])button.disabled=manageBusy;
}
async function manageChange(action){
 const row=selection();if(!client||!user||!row||manageBusy)return;
 let name=null;
 if(action==='delete'){
  if(!confirm('Delete "'+row.name+'" permanently? Saved graph and its linked records may be removed. This cannot be undone.'))return;
 }else if(action==='rename'){
  name=prompt('New automation name',row.name);
  if(name===null)return;
  name=name.trim();
  if(!name||name.length>100)return status('Enter a name between 1 and 100 characters.');
 }else if(action==='resume'){
  if(row.trigger_type==='schedule'&&(!Number.isInteger(Number(row.trigger_config?.interval_minutes))||Number(row.trigger_config?.interval_minutes)<5||Number(row.trigger_config?.interval_minutes)>1440))return status('Configure a valid schedule interval (5–1440 minutes) before resuming.');
  if(!confirm('Resume "'+row.name+'"? Incoming triggers or scheduled runs may execute and consume FluxCoins.'))return;
 }
 manageBusy=true;renderManage();
 try{
  const query=client.from('automations');
  const result=action==='delete'
   ?await query.delete().eq('id',row.id).eq('owner_id',user.id).select('id')
   :await query.update(action==='rename'?{name,updated_at:new Date().toISOString()}:{enabled:action==='resume',updated_at:new Date().toISOString()}).eq('id',row.id).eq('owner_id',user.id).select('id,name,enabled,trigger_type,trigger_config');
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error('No matching automation was changed.');
  if(action==='delete'){
   rows=rows.filter(item=>item.id!==row.id);
   $('canvas-automation').value='';
   status('Automation deleted.');
  }else Object.assign(row,result.data[0]);
  drawLibrary();renderManage();updateApiPanel();refreshRunHistory();
  if(action!=='delete')status('Automation '+(action==='rename'?'renamed':action==='resume'?'resumed':'paused')+'.');
 }catch(error){status('Could not '+action+' automation: '+error.message);}
 finally{manageBusy=false;renderManage();}
}
pauseButton.addEventListener('click',()=>manageChange(selection()?.enabled?'pause':'resume'));
renameButton.addEventListener('click',()=>manageChange('rename'));
deleteButton.addEventListener('click',()=>manageChange('delete'));
$('canvas-automation')?.addEventListener('change',renderManage);

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
    rows=[];drawLibrary();renderManage();updateApiPanel();updateWebhookPanel();refreshFluxCoins();
    return;
  }
  $('canvas-cloud-user').textContent = user.email;
  const { data, error } = await client.from('automations').select('id,name,enabled,trigger_type,trigger_config,action_config,project_id').order('updated_at',{ascending:false});
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
  drawLibrary();updateApiPanel();renderManage();
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
  signedIn:true,userId:user.id,unlimited:!profileError&&profile?.role==='super_admin',
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
window.addEventListener('flux:create-scenario',async event=>{
 const name=String(event.detail?.name||'').trim();
 if(!name||name.length>100)return status('Enter a Flux name (up to 100 characters).');
 if(!client||!user)return status('Sign in to Flux Studio before creating a scenario.');
 try{
  const {data:projects,error:projectError}=await client.from('projects').select('id').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1);
  if(projectError)throw projectError;
  let projectId=projects?.[0]?.id;
  if(!projectId){
   const created=await client.from('projects').insert({owner_id:user.id,name:'My scenarios',description:'Flux Studio scenarios'}).select('id').single();
   if(created.error)throw created.error;
   projectId=created.data.id;
  }
  const graph={version:1,nodes:[],edges:[]};
  const created=await client.from('automations').insert({owner_id:user.id,project_id:projectId,name,enabled:false,trigger_type:'manual',trigger_config:{},action_config:{graph,version:2}}).select('id,name,action_config,project_id').single();
  if(created.error)throw created.error;
  rows.unshift({...created.data,enabled:false,trigger_type:'manual',trigger_config:{}});
  $('canvas-automation').add(new Option(name,created.data.id));
  $('canvas-automation').value=created.data.id;
  try{await restoreGraph(graph);}catch(error){status('Scenario created, but opening the empty canvas failed: '+error.message);return;}
  drawLibrary();updateApiPanel();
  window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:created.data.id,name}}));
  status('New Flux "'+name+'" created and saved as a disabled draft.');
 }catch(error){status('Could not create Flux: '+error.message);}
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
// Primary Save stores the current workflow in the signed-in user's TEST cloud account.
const primarySave=document.getElementById('save');
let primarySaveBusy=false;
if(primarySave)primarySave.addEventListener('click',async event=>{
 event.preventDefault();event.stopImmediatePropagation();
 if(primarySaveBusy)return;
 if(!client||!user){status('Sign in to save your Flux to the cloud.');window.fluxShowFeedback?.('Sign in to save your Flux.','error');return;}
 primarySaveBusy=true;primarySave.disabled=true;primarySave.textContent='Saving…';
 try{
  const graph=await requestSnapshot();
  let row=selection();
  if(row){
   const action_config={...row.action_config,graph,version:2};
   const {error}=await client.from('automations').update({action_config,enabled:false,updated_at:new Date().toISOString()}).eq('id',row.id).eq('owner_id',user.id);
   if(error)throw error;
   row.action_config=action_config;
   status('Saved "'+row.name+'" to Flux TEST.');
   window.fluxShowFeedback?.('Saved "'+row.name+'" to your Flux account.','success');
  }else{
   const proposed=prompt('Name this Flux before saving','My Trello workflow');
   if(proposed===null){status('Save cancelled. Your canvas is unchanged.');return;}
   const name=proposed.trim();if(!name||name.length>100)throw Error('Enter a name between 1 and 100 characters');
   let {data:projects,error:projectError}=await client.from('projects').select('id').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1);
   if(projectError)throw projectError;
   let projectId=projects?.[0]?.id;
   if(!projectId){const created=await client.from('projects').insert({owner_id:user.id,name:'My scenarios'}).select('id').single();if(created.error)throw created.error;projectId=created.data.id;}
   const payload={name,owner_id:user.id,project_id:projectId,trigger_type:'manual',action_config:{graph,version:2},enabled:false};
   const {data,error}=await client.from('automations').insert(payload).select('id,name,action_config,project_id').single();
   if(error)throw error;
   rows.unshift(data);$('canvas-automation').value=data.id;
   window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:data.id,name:data.name}}));
   status('Created and saved "'+name+'" in Flux TEST.');
   window.fluxShowFeedback?.('Created and saved "'+name+'" to your Flux account.','success');
  }
  drawLibrary();updateApiPanel();
 }catch(error){status('Save failed: '+error.message);window.fluxShowFeedback?.('Save failed: '+error.message,'error');}
 finally{primarySaveBusy=false;primarySave.disabled=false;primarySave.textContent='Save';}
},true);
// New scenario: create a separate, disabled cloud automation; never overwrite the selected one.
const newScenarioButton=document.createElement('button');
newScenarioButton.type='button';newScenarioButton.id='flux-new-scenario';newScenarioButton.textContent='+ New Flux';
newScenarioButton.style.cssText='border:1px solid #2473a5;border-radius:9px;background:#176d9d;color:white;padding:10px 14px;font-weight:700;cursor:pointer';
const editorToolbar=document.querySelector('#canvas-shell > main .toolbar:not(#canvas-cloud)');
if(editorToolbar)editorToolbar.prepend(newScenarioButton);
let scenarioBusy=false;
newScenarioButton.addEventListener('click',async()=>{
 if(scenarioBusy)return;
 if(!client||!user){status('Sign in to Flux Studio to create a saved scenario.');return;}
 const proposed=prompt('Name your new Flux','My new Flux');
 if(proposed===null)return;
 const name=proposed.trim();
 if(!name||name.length>100){status('Enter a Flux name between 1 and 100 characters.');return;}
 if(!confirm('Create a new empty Flux? Unsaved changes in the current canvas will be replaced. Your saved scenarios will remain unchanged.'))return;
 scenarioBusy=true;newScenarioButton.disabled=true;
 try{
  const graph={version:1,nodes:[],edges:[]};
  // Every automation requires a project_id (NOT NULL in Flux TEST).
  let {data:projects,error:projectsError}=await client.from('projects').select('id,name').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1);
  if(projectsError)throw projectsError;
  let projectId=projects?.[0]?.id;
  if(!projectId){
   const created=await client.from('projects').insert({owner_id:user.id,name:'My scenarios'}).select('id').single();
   if(created.error)throw created.error;
   projectId=created.data.id;
  }
  const payload={name,owner_id:user.id,project_id:projectId,trigger_type:'manual',action_config:{graph,version:2},enabled:false};
  const {data,error}=await client.from('automations').insert(payload).select('id,name,action_config,project_id').single();
  if(error)throw error;
  // Persist first; only replace the canvas after the database confirms creation.
  rows.unshift(data);
  $('canvas-automation').add(new Option(data.name,data.id));
  $('canvas-automation').value=data.id;
  try{await restoreGraph(graph);}catch(restoreError){status('Scenario saved, but canvas could not be cleared: '+restoreError.message);drawLibrary();return;}
  drawLibrary();updateApiPanel();
  window.dispatchEvent(new CustomEvent('flux:automation-opened',{detail:{id:data.id,name:data.name}}));
  window.dispatchEvent(new Event('flux:coins-refresh'));
  status('New Flux "'+name+'" saved to Flux TEST. Add your first block.');
  document.getElementById('flux-add-block')?.focus();
 }catch(error){status('Could not create Flux: '+error.message);}
 finally{scenarioBusy=false;newScenarioButton.disabled=false;}
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
let safeRetryBusy=false;
window.addEventListener('flux:retry-dry-run',async event=>{
 if(safeRetryBusy)return status('A safe retry is already running.');
 const row=selection(),requested=event.detail?.automationId;
 if(!user||!row||row.id!==requested||!row.action_config?.graph)return status('Select a saved automation before retrying.');
 if(!confirm('Retry this workflow as a SAFE SIMULATION? External actions will NOT run. This costs 1 FCX for standard users.'))return;
 const {data:sessionData}=await client.auth.getSession(),token=sessionData?.session?.access_token;
 if(!token)return status('Sign in again before retrying.');
 safeRetryBusy=true;
 status('Running safe simulation...');
 try{
  const response=await fetch('/.netlify/functions/flux-automation-api?automation='+encodeURIComponent(row.id),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({})});
  const result=await response.json();
  status('Safe retry HTTP '+response.status+': '+(result.ok?'Simulation completed':String(result.error||'Simulation failed')));
  if(result.credits?.ok)window.dispatchEvent(new Event('flux:coins-refresh'));
  if(result.credits?.ok){
   const steps=Array.isArray(result.trace)?result.trace.slice(0,100).map(step=>({id:String(step.id||'').slice(0,80),type:String(step.type||'').slice(0,60),status:String(step.status||'').slice(0,30)})):[];
   const {error}=await client.from('automation_runs').insert({automation_id:row.id,owner_id:user.id,status:result.ok?'success':'failed',finished_at:new Date().toISOString(),result:{source:'manual_retry',retryOf:event.detail?.runId||null,dryRun:true,steps},error_message:result.ok?null:String(result.error||'Simulation failed').slice(0,200)});
   if(error)status('Simulation completed, but saving its history failed: '+error.message);
  }
  await refreshRunHistory();
 }catch(error){status('Safe retry unavailable: '+error.message);}finally{safeRetryBusy=false;}
});
window.addEventListener('flux:automation-opened',refreshRunHistory);
window.addEventListener('flux:run-completed',()=>{if(selection())refreshRunHistory();});
$('canvas-automation')?.addEventListener('change',refreshRunHistory);
window.addEventListener('flux:run-summary',async event=>{
 const row=selection();if(!client||!user||!row)return;
 const detail=event.detail||{},steps=Array.isArray(detail.trace)?detail.trace:[];
 const result={dryRun:detail.dryRun!==false,steps:steps.slice(0,100).map(step=>({id:String(step.id||'').slice(0,80),type:String(step.type||'').slice(0,60),status:String(step.status||'').slice(0,30),reason:String(step.reason||'').slice(0,200)}))};
 const {error}=await client.from('automation_runs').insert({automation_id:row.id,owner_id:user.id,status:detail.ok?'success':'failed',started_at:new Date().toISOString(),finished_at:new Date().toISOString(),result,error_message:detail.ok?null:String(detail.error||'Execution failed').slice(0,200)});
 if(error)status('Run history could not be saved: '+error.message);
 else refreshRunHistory();
});
