import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';
const $ = id => document.getElementById(id);
const status = text => { $('canvas-cloud-status').textContent = text; };
let client, user, rows = [];
const selection = () => rows.find(row => row.id === $('canvas-automation').value);
async function refresh() {
  const { data: auth, error: authError } = await client.auth.getUser();
  user = auth?.user;
  if (authError || !user) {
    $('canvas-cloud-user').textContent = 'Sign in from Flux Studio to use cloud automations';
    status('Local canvas is still available.');
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
  try{await restoreGraph(graph);status('Canvas loaded from Supabase. No workflow was executed.');}
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
    status('Canvas saved to Supabase. Automation remains disabled.');
  } catch(error){status('Save failed: '+error.message);}
});
try {
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.10');
  client=createClient(supabaseUrl,supabasePublishableKey);
  await refresh();
  client.auth.onAuthStateChange(()=>queueMicrotask(refresh));
} catch(error){status('Cloud connection failed: '+error.message);}

window.addEventListener('flux:session-request',async()=>{const {data}=await client.auth.getSession();window.dispatchEvent(new CustomEvent('flux:session-response',{detail:data?.session?.access_token||null}));});
