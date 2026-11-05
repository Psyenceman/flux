/* FluxCoins wallet — server authoritative, read-only client view. */
(()=>{
 const execute=document.getElementById('execute');
 if(!execute)return;
 const badge=document.createElement('button');
 badge.type='button';badge.id='flux-credits-balance';badge.className='flux-coins-pill';
 badge.textContent='◈ FluxCoins · —';
 badge.title='View your FluxCoins balance and recent usage';
 execute.insertAdjacentElement('afterend',badge);
 const dock=document.createElement('aside');dock.id='flux-wallet-dock';dock.setAttribute('aria-label','FluxCoins balance');
 dock.innerHTML='<span>FCX · FluxCoins</span><strong id="flux-wallet-value">—</strong><div class="flux-wallet-track" role="progressbar" aria-label="Remaining FluxCoins" aria-valuemin="0" aria-valuemax="100"><div id="flux-wallet-fill"></div></div><button type="button" id="flux-wallet-add">+ Add FCX</button>';
 document.body.append(dock);
 const walletValue=dock.querySelector('#flux-wallet-value'),walletFill=dock.querySelector('#flux-wallet-fill'),walletTrack=dock.querySelector('.flux-wallet-track');
 const style=document.createElement('style');style.textContent='#flux-wallet-dock{position:fixed;bottom:12px;left:12px;z-index:1200;width:min(220px,calc(100vw - 24px));background:#17263b;border:1px solid #58718d;border-radius:12px;padding:12px;color:#f1f6fc;box-shadow:0 8px 28px #0008;display:grid;grid-template-columns:1fr auto;gap:8px;font:12px system-ui,sans-serif}#flux-wallet-value{font-size:17px}.flux-wallet-track{grid-column:1/-1;height:8px;background:#36465b;border-radius:8px;overflow:hidden}#flux-wallet-fill{height:100%;width:0%;background:#69baf0;transition:width .3s ease}#flux-wallet-add{grid-column:1/-1;padding:7px;border-radius:7px;border:1px solid #7294b7;background:#2b4f7a;color:white;cursor:pointer}@media(max-width:600px){#flux-wallet-dock{left:8px;bottom:8px;width:170px;padding:9px}}';document.head.append(style);
 dock.querySelector('#flux-wallet-add').addEventListener('click',()=>{details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));});
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
 const topup=document.createElement('p');topup.textContent='Add FCX is coming soon. No payments are enabled. Credits are managed on the server.';details.append(header,balance,subtitle,topup,historyTitle,history,refresh);
 document.body.append(details);
 badge.addEventListener('click',()=>{details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));});
 window.addEventListener('flux:coins-loaded',event=>{
  const data=event.detail||{};
  if(!data.signedIn){walletValue.textContent='Sign in';walletFill.style.width='0%';badge.textContent='◈ FluxCoins · Sign in';balance.textContent='Sign in to view your balance';history.replaceChildren();return;}
  if(data.error){walletValue.textContent='—';walletFill.style.width='0%';badge.textContent='◈ FluxCoins · —';balance.textContent='Balance unavailable';history.replaceChildren();return;}
  const value=data.unlimited?'Unlimited':String(data.balance);
  badge.textContent='◈ FluxCoins · '+value;balance.textContent=value;walletValue.textContent=data.unlimited?'∞':value;const percent=data.unlimited?100:Math.max(0,Math.min(100,Number(data.balance)||0));walletFill.style.width=percent+'%';walletFill.style.background=percent<=20?'#dc7979':percent<=50?'#e5ab55':'#69baf0';walletTrack.setAttribute('aria-valuenow',String(percent));walletTrack.setAttribute('aria-valuetext',data.unlimited?'Unlimited':value+' FCX remaining');
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