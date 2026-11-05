/* FluxCoins: display server-confirmed usage, never calculate balances in the browser. */
(()=>{
 const execute=document.getElementById('execute');
 if(!execute)return;
 const badge=document.createElement('span');
 badge.id='flux-credits-balance';
 badge.setAttribute('role','status');
 badge.setAttribute('aria-live','polite');
 badge.textContent='FluxCoins · —';
 badge.title='Each workflow test costs 1 FluxCoin. Super Admin accounts are unlimited.';
 execute.insertAdjacentElement('afterend',badge);
 window.addEventListener('flux:run-completed',event=>{
  const credits=event.detail?.credits;
  if(!credits)return;
  if(credits.unlimited){badge.textContent='FluxCoins · Unlimited';return;}
  if(Number.isInteger(credits.balance)){badge.textContent='FluxCoins · '+credits.balance;return;}
  if(credits.reason==='insufficient_credits')badge.textContent='FluxCoins · 0';
 });
})();
