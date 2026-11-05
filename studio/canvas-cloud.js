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
async function refresh() {
  const { data: auth, error: authError } = await client.auth.getUser();
  user = auth?.user;
  if (authError || !user) {
    $('canvas-cloud-user').textContent = 'Sign in from Flux Studio to use cloud automations';
    status('Local canvas is still available.');
    rows=[];drawLibrary();
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
  drawLibrary();
  status(rows.length+' automation(s) available. Select one to load or save its canvas.');
}
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
    drawLibrary();status('Canvas saved to Supabase. Automation remains disabled.');
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
async function refreshRunHistory(){
 const row=selection();if(!client||!user||!row||!runHistory)return;
 const {data,error}=await client.from('automation_runs').select('id,status,started_at,finished_at,result,error_message').eq('automation_id',row.id).order('started_at',{ascending:false}).limit(30);
 if(error){status('History unavailable: '+error.message);return;}
 window.dispatchEvent(new CustomEvent('flux:persistent-runs',{detail:{automationId:row.id,runs:data||[]}}));
}
window.addEventListener('flux:automation-opened',refreshRunHistory);
$('canvas-automation')?.addEventListener('change',refreshRunHistory);
window.addEventListener('flux:run-summary',async event=>{
 const row=selection();if(!client||!user||!row)return;
 const detail=event.detail||{},steps=Array.isArray(detail.trace)?detail.trace:[];
 const result={dryRun:detail.dryRun!==false,steps:steps.slice(0,100).map(step=>({id:String(step.id||'').slice(0,80),type:String(step.type||'').slice(0,60),status:String(step.status||'').slice(0,30),reason:String(step.reason||'').slice(0,200)}))};
 const {error}=await client.from('automation_runs').insert({automation_id:row.id,owner_id:user.id,status:detail.ok?'completed':'failed',started_at:new Date().toISOString(),finished_at:new Date().toISOString(),result,error_message:detail.ok?null:String(detail.error||'Execution failed').slice(0,200)});
 if(error)status('Run history could not be saved: '+error.message);
 else refreshRunHistory();
});
