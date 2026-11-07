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
 const adjustment=document.createElement('section');adjustment.className='flux-admin-adjustment';
 const adjustmentTitle=document.createElement('h3');adjustmentTitle.textContent='FluxCoins · manual adjustment (TEST)';
 const adjustmentHelp=document.createElement('p');adjustmentHelp.textContent='Requires the approved TEST database migration. All changes are audited; no payment is processed.';
 const target=document.createElement('input');target.placeholder='Target user UUID';target.setAttribute('aria-label','Target user UUID');
 const delta=document.createElement('input');delta.type='number';delta.min='-100000';delta.max='100000';delta.step='1';delta.placeholder='Coins to add (+) or remove (-)';delta.setAttribute('aria-label','FluxCoins adjustment');
 const reason=document.createElement('input');reason.maxLength=240;reason.placeholder='Reason (at least 8 characters)';reason.setAttribute('aria-label','Adjustment reason');
 const submit=document.createElement('button');submit.type='button';submit.textContent='Apply adjustment';
 const resultText=document.createElement('p');resultText.setAttribute('role','status');
 adjustment.append(adjustmentTitle,adjustmentHelp,target,delta,reason,submit,resultText);
 let pendingAdjustment=null;
 submit.addEventListener('click',async()=>{
  const value=Number(delta.value),why=reason.value.trim(),id=target.value.trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!Number.isSafeInteger(value)||!value||Math.abs(value)>100000||why.length<8)return resultText.textContent='Enter a valid user UUID, non-zero integer amount and reason (8+ characters).';
  if(!confirm('Apply '+value+' FluxCoins to user '+id+' in TEST? This creates an audit entry.'))return;
  submit.disabled=true;resultText.textContent='Applying…';
  const fingerprint=JSON.stringify([id,value,why]);
  if(!pendingAdjustment||pendingAdjustment.fingerprint!==fingerprint)pendingAdjustment={fingerprint,requestId:crypto.randomUUID()};
  const requestId=pendingAdjustment.requestId;
  try{
   const headers=await window.fluxExecutionHeaders('');
   const response=await fetch('/.netlify/functions/flux-admin-credits',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({targetUserId:id,delta:value,reason:why,requestId})});
   const payload=await response.json();
   if(!response.ok)throw Error((payload.error||'Adjustment failed')+(payload.databaseCode?' (PostgreSQL '+payload.databaseCode+')':''));
   resultText.textContent='Saved. New balance: '+payload.balance+' FCX'+(payload.duplicate?' (already processed)':'');
   delta.value='';reason.value='';pendingAdjustment=null;window.dispatchEvent(new Event('flux:coins-refresh'));load();
  }catch(error){resultText.textContent='No confirmed adjustment: '+error.message+'; verify audit before retrying.';}
  finally{submit.disabled=false;}
 });
  dialog.append(heading,explanation,status,metrics,note,adjustment,refresh,close);bar.append(button);document.body.append(dialog);
 const labels={creditAccounts:'Credit accounts',coinsRemaining:'FluxCoins available',coinsUsed:'FluxCoins consumed',automations:'Saved automations',activeAutomations:'Active automations',scheduledAutomations:'Scheduled automations',recentRuns:'Recent runs (max 500)',successfulRuns:'Successful runs',failedRuns:'Failed runs',activeWebhooks:'Active webhooks'};
 async function load(){
  if(typeof window.fluxExecutionHeaders!=='function'){status.textContent='Sign in first.';return;}
  refresh.disabled=true;status.textContent='Loading TEST metrics…';metrics.replaceChildren();
  try{
   const headers=await window.fluxExecutionHeaders('');
   const response=await fetch('/.netlify/functions/flux-admin-overview',{headers,cache:'no-store'});
   const data=await response.json();
   if(response.status===403){button.hidden=true;dialog.close();return;}
   if(!response.ok)throw Error((data.error||'Unavailable')+(data.stage?' ('+data.stage+')':'')+(data.upstreamStatus?' — Supabase HTTP '+data.upstreamStatus:'')+(data.reason?' — '+data.reason:''));
   if(data.environment!=='test')throw Error('Unexpected environment');
   for(const [key,label] of Object.entries(labels)){
    const card=document.createElement('div');card.className='flux-admin-metric';
    const value=document.createElement('strong');value.textContent=String(data.metrics[key]??'—');
    const caption=document.createElement('span');caption.textContent=label;card.append(value,caption);metrics.append(card);
   }
   status.textContent=(data.unavailable?.length?'Partial data — unavailable: '+data.unavailable.map(x=>typeof x==='string'?x:x.source+(x.httpStatus?' (HTTP '+x.httpStatus+')':'')).join(', ')+'. ':'')+'Updated '+new Date(data.snapshotAt).toLocaleString();
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
