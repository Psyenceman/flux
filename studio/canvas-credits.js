/* FluxCoins wallet — server authoritative, read-only client view. */
(()=>{
 const execute=document.getElementById('execute');
 if(!execute)return;
 const badge=document.createElement('button');
 badge.type='button';badge.id='flux-credits-balance';badge.className='flux-coins-pill';
 badge.textContent='◈ FluxCoins · —';
 badge.title='View your FluxCoins balance and recent usage';
 execute.insertAdjacentElement('afterend',badge);
 const details=document.createElement('dialog');details.className='flux-coins-dialog';
 const header=document.createElement('div');header.className='flux-coins-header';
 const title=document.createElement('h2');title.textContent='◈ FluxCoins';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>details.close());
 header.append(title,close);
 const balance=document.createElement('strong');balance.className='flux-coins-total';balance.textContent='—';
 const subtitle=document.createElement('p');subtitle.textContent='1 FluxCoin per workflow test · Super Admin: unlimited';
 const historyTitle=document.createElement('h3');historyTitle.textContent='Recent activity';
 const history=document.createElement('ul');history.className='flux-coins-history';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh balance';refresh.addEventListener('click',()=>window.dispatchEvent(new Event('flux:coins-refresh')));
 details.append(header,balance,subtitle,historyTitle,history,refresh);
 document.body.append(details);
 badge.addEventListener('click',()=>{details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));});
 window.addEventListener('flux:coins-loaded',event=>{
  const data=event.detail||{};
  if(!data.signedIn){badge.textContent='◈ FluxCoins · Sign in';balance.textContent='Sign in to view your balance';history.replaceChildren();return;}
  if(data.error){badge.textContent='◈ FluxCoins · —';balance.textContent='Balance unavailable';history.replaceChildren();return;}
  const value=data.unlimited?'Unlimited':String(data.balance);
  badge.textContent='◈ FluxCoins · '+value;balance.textContent=value;
  history.replaceChildren();
  if(!data.entries?.length){const item=document.createElement('li');item.textContent='No transactions yet';history.append(item);}
  for(const entry of data.entries||[]){
   const item=document.createElement('li');
   const action=entry.action==='workflow_test'?'Workflow test':entry.action==='workflow_run'?'Workflow run':'Credit grant';
   item.textContent=action+' · '+(entry.delta>0?'+':'')+entry.delta+' · '+new Date(entry.created_at).toLocaleString();
   history.append(item);
  }
 });
 window.addEventListener('flux:run-completed',event=>{
  if(event.detail?.credits?.reason==='insufficient_credits'){badge.textContent='◈ FluxCoins · 0';}
 });
})();