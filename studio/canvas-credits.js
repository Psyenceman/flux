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
 dock.innerHTML='<span>FCX · FluxCoins</span><button type="button" id="flux-wallet-value" aria-label="Open account and FluxCoins">—</button><div class="flux-wallet-track" role="progressbar" aria-label="Remaining FluxCoins" aria-valuemin="0" aria-valuemax="100"><div id="flux-wallet-fill"></div></div><button type="button" id="flux-wallet-add">+ Add FCX</button>';
 dock.style.visibility='hidden';document.body.append(dock);
 const handle=document.createElement('div');handle.textContent='Drag FCX';handle.style.cssText='grid-column:1/-1;cursor:move;touch-action:none;user-select:none';dock.prepend(handle);
 let key='fcx-position-guest',drag=null;
 function restore(){try{const p=JSON.parse(localStorage.getItem(key));if(p){dock.style.left=Math.max(0,Math.min(innerWidth-dock.offsetWidth,p.x))+'px';dock.style.top=Math.max(0,Math.min(innerHeight-dock.offsetHeight,p.y))+'px';dock.style.bottom='auto';}}catch{}}
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;const b=dock.getBoundingClientRect();drag={x:e.clientX-b.left,y:e.clientY-b.top};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag)return;dock.style.left=Math.max(0,Math.min(innerWidth-dock.offsetWidth,e.clientX-drag.x))+'px';dock.style.top=Math.max(0,Math.min(innerHeight-dock.offsetHeight,e.clientY-drag.y))+'px';dock.style.bottom='auto';});
 handle.addEventListener('pointerup',()=>{if(!drag)return;drag=null;try{localStorage.setItem(key,JSON.stringify({x:dock.offsetLeft,y:dock.offsetTop}));}catch{}});
 // Wait for the authenticated user's position before revealing the dock.
 let walletSignedIn=false;
 dock.querySelector('#flux-wallet-value').addEventListener('click',()=>{if(walletSignedIn){details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));}else window.dispatchEvent(new Event('flux:account-open'));});
 const walletValue=dock.querySelector('#flux-wallet-value'),walletFill=dock.querySelector('#flux-wallet-fill'),walletTrack=dock.querySelector('.flux-wallet-track');
 const style=document.createElement('style');style.textContent='#flux-wallet-dock{position:fixed;bottom:12px;left:12px;z-index:1200;width:min(220px,calc(100vw - 24px));background:#17263b;border:1px solid #58718d;border-radius:12px;padding:12px;color:#f1f6fc;box-shadow:0 8px 28px #0008;display:grid;grid-template-columns:1fr auto;gap:8px;font:12px system-ui,sans-serif}#flux-wallet-value{font-size:17px}.flux-wallet-track{grid-column:1/-1;height:8px;background:#36465b;border-radius:8px;overflow:hidden}#flux-wallet-fill{height:100%;width:0%;background:#69baf0;transition:width .3s ease}#flux-wallet-add{grid-column:1/-1;padding:7px;border-radius:7px;border:1px solid #7294b7;background:#2b4f7a;color:white;cursor:pointer}@media(max-width:600px){#flux-wallet-dock{left:8px;bottom:8px;width:170px;padding:9px}}';document.head.append(style);
 dock.querySelector('#flux-wallet-add').addEventListener('click',()=>{if(!walletSignedIn){window.dispatchEvent(new Event('flux:account-open'));return;}details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));});
 const details=document.createElement('dialog');details.className='flux-coins-dialog';
 const header=document.createElement('div');header.className='flux-coins-header';
 const title=document.createElement('h2');title.textContent='◈ FluxCoins';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>details.close());
 header.append(title,close);
 const balance=document.createElement('strong');balance.className='flux-coins-total';balance.textContent='—';
 const subtitle=document.createElement('p');subtitle.textContent='Current TEST billing: 1 FluxCoin per workflow test · Super Admin: unlimited. Future operation-based pricing is a proposal, not yet active.';
 const pricing=document.createElement('section');pricing.className='flux-coin-pricing';pricing.setAttribute('aria-label','FluxCoins pricing preview');
 const pricingHeading=document.createElement('h3');pricingHeading.textContent='Pricing preview · not yet for sale';
 const pricingIntro=document.createElement('p');pricingIntro.textContent='Proposed package: €10 = 5,000 FluxCoins. Purchases are not enabled.';
 const pricingUnit=document.createElement('p');pricingUnit.textContent='Example rate: 1 FCX per completed standard operation. Failed, skipped and filtered operations need explicit billing rules before launch.';
 const estimateLabel=document.createElement('label');estimateLabel.textContent='Estimate standard operations';
 const estimateInput=document.createElement('input');estimateInput.type='number';estimateInput.min='1';estimateInput.max='1000000';estimateInput.step='1';estimateInput.value='1000';estimateInput.setAttribute('aria-label','Number of standard operations');
 const estimateOutput=document.createElement('output');estimateOutput.className='flux-coin-estimate';estimateOutput.setAttribute('aria-live','polite');
 const format=new Intl.NumberFormat('en-US');
 const updateEstimate=()=>{
  const amount=Number(estimateInput.value);
  if(!Number.isSafeInteger(amount)||amount<1||amount>1000000){estimateOutput.textContent='Enter between 1 and 1,000,000 operations.';return;}
  const coins=amount;const euro=coins/500;
  estimateOutput.textContent=format.format(coins)+' FCX · €'+euro.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' equivalent at the proposed rate';
 };
 estimateInput.addEventListener('input',updateEstimate);updateEstimate();
 const pricingDisclaimer=document.createElement('small');pricingDisclaimer.textContent='Illustrative only. No credits are deducted by this calculator. Final tariffs, taxes, refunds, failed-operation rules and payment integration are not configured.';
 pricing.append(pricingHeading,pricingIntro,pricingUnit,estimateLabel,estimateInput,estimateOutput,pricingDisclaimer);
 const historyTitle=document.createElement('h3');historyTitle.textContent='Recent activity';
 const history=document.createElement('ul');history.className='flux-coins-history';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh balance';refresh.addEventListener('click',()=>window.dispatchEvent(new Event('flux:coins-refresh')));
 const topup=document.createElement('p');topup.textContent='Add FCX is coming soon. No payments are enabled. Credits are managed on the server.';details.append(header,balance,subtitle,pricing,topup,historyTitle,history,refresh);
 document.body.append(details);
 const pricingStyle=document.createElement('style');pricingStyle.textContent='.flux-coin-pricing{margin:14px 0;padding:16px;border:1px solid #ddd2ef;border-radius:14px;background:#faf8ff;color:#302647}.flux-coin-pricing h3{margin:0 0 9px;color:#5636ad}.flux-coin-pricing p{font-size:13px;line-height:1.5;color:#4f4760}.flux-coin-pricing label{display:block;font-size:12px;font-weight:700;margin:12px 0 5px}.flux-coin-pricing input{display:block;width:100%;padding:10px;border:1px solid #bfaee5;border-radius:9px;background:#fff;color:#29213e}.flux-coin-pricing output{display:block;margin:10px 0;font-weight:750;color:#5636ad}.flux-coin-pricing small{font-size:11px;color:#655b74;line-height:1.5}';document.head.append(pricingStyle);
 badge.addEventListener('click',()=>{if(!walletSignedIn){window.dispatchEvent(new Event('flux:account-open'));return;}details.showModal();window.dispatchEvent(new Event('flux:coins-refresh'));});
 window.addEventListener('flux:coins-loaded',event=>{
  const data=event.detail||{};walletSignedIn=Boolean(data.signedIn);const next='fcx-position-'+(data.userId||'guest');if(next!==key){key=next;dock.style.left='12px';dock.style.top='';dock.style.bottom='12px';restore();}dock.style.visibility='visible';
  if(!data.signedIn){walletTrack.setAttribute('aria-valuenow','0');walletTrack.setAttribute('aria-valuetext','Sign in to view balance');walletValue.textContent='Sign in';walletFill.style.width='0%';badge.textContent='◈ FluxCoins · Sign in';balance.textContent='Sign in to view your balance';history.replaceChildren();return;}
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
/* FluxCoins preview styles are attached by the wallet script to preserve TEST-only scope. */
