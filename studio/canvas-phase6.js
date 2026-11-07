// Flux TEST — server-authorized Super Admin metrics, never client-side role elevation.
(()=>{
 const bar=document.querySelector('.workspace-bar');
 if(!bar)return;
 const button=document.createElement('button');button.type='button';button.textContent='Admin overview';button.hidden=true;button.className='flux-admin-trigger';
 const dialog=document.createElement('dialog');dialog.className='flux-admin-dialog';
 const heading=document.createElement('h2');heading.textContent='Flux TEST · Super Admin';
 const explanation=document.createElement('p');explanation.textContent='Read-only operational overview. No user credentials or private workflow content are displayed.';
 const status=document.createElement('p');status.setAttribute('role','status');
 const metrics=document.createElement('div');metrics.className='flux-admin-metrics';
 const note=document.createElement('small');note.textContent='TEST environment only.';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>dialog.close());
 dialog.append(heading,explanation,status,metrics,note,refresh,close);bar.append(button);document.body.append(dialog);
 const labels={creditAccounts:'Credit accounts',coinsRemaining:'FluxCoins available',coinsUsed:'FluxCoins consumed',automations:'Saved automations',activeAutomations:'Active automations',scheduledAutomations:'Scheduled automations',recentRuns:'Recent runs (max 500)',successfulRuns:'Successful runs',failedRuns:'Failed runs',activeWebhooks:'Active webhooks'};
 async function load(){
  if(typeof window.fluxExecutionHeaders!=='function'){status.textContent='Sign in first.';return;}
  refresh.disabled=true;status.textContent='Loading TEST metrics…';metrics.replaceChildren();
  try{
   const headers=await window.fluxExecutionHeaders('');
   const response=await fetch('/.netlify/functions/flux-admin-overview',{headers,cache:'no-store'});
   const data=await response.json();
   if(response.status===403){button.hidden=true;dialog.close();return;}
   if(!response.ok)throw Error(data.error||'Unavailable');
   if(data.environment!=='test')throw Error('Unexpected environment');
   for(const [key,label] of Object.entries(labels)){
    const card=document.createElement('div');card.className='flux-admin-metric';
    const value=document.createElement('strong');value.textContent=String(data.metrics[key]??'—');
    const caption=document.createElement('span');caption.textContent=label;card.append(value,caption);metrics.append(card);
   }
   status.textContent='Updated '+new Date(data.snapshotAt).toLocaleString();
   note.textContent=(data.notes||[]).join(' ');
  }catch(error){status.textContent='Could not load overview: '+error.message;}
  finally{refresh.disabled=false;}
 }
 button.addEventListener('click',()=>{dialog.showModal();load();});
 refresh.addEventListener('click',load);
 // The button is only a convenience; server verifies the role on every request.
 window.addEventListener('flux:coins-loaded',event=>{
  if(!event.detail?.signedIn){button.hidden=true;dialog.close();return;}
  button.hidden=!event.detail.unlimited;
 });
})();
