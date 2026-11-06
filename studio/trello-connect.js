/* Popup lifecycle is isolated from the canvas so opening authentication never navigates it. */
window.FluxTrelloConnect = function ({button, title, status, getToken}) {
 let popup=null, timer=null, busy=false, disposed=false, connected=null, generation=0;
 const render=()=>{
  button.disabled=busy;
  button.dataset.state=busy?'connecting':connected?'connected':'disconnected';
  button.setAttribute('aria-busy',String(busy));
  button.textContent=busy?'Connecting…':connected?'✓ Trello connected · Reconnect':'Connect Trello';
 };
 const check=async()=>{
  const current=++generation;
  const token=await getToken();
  if(disposed||current!==generation)return;
  if(!token){status.textContent='Sign in to Flux Studio first.';return;}
  try{
   const response=await fetch('/.netlify/functions/trello-connections',{headers:{authorization:'Bearer '+token},cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Connection status unavailable.');
   if(disposed||current!==generation)return;
   connected=data.connections?.find(c=>c.status==='connected')||null;
   title.textContent=connected?'Trello connected':'Trello account · TEST';
   status.textContent=connected?(connected.provider_account_label||'Account connected'):'Connect once, then reuse your account in your automations.';
   render();
  }catch(error){if(!disposed&&current===generation)status.textContent=error.message;}
 };
 const stop=()=>{clearInterval(timer);timer=null;busy=false;render();};
 const finish=async result=>{
  stop();
  await check();
  if(!disposed&&result&&result!=='connected'&&!connected){
   const labels={invalid:'Invalid OAuth callback or missing state cookie',expired:'OAuth session expired',exchange_failed:'Atlassian token exchange failed',connection_missing:'Connection record was not created',failed_state_lookup:'OAuth state database lookup failed',failed_token_exchange:'Atlassian token request failed',failed_connection_lookup:'Connection database lookup failed',failed_connection_create:'Connection database insert failed',failed_credentials_save:'Encrypted credential storage failed',failed_connection_update:'Connection status update failed'};
   status.textContent='Trello authorization: '+(labels[result]||result)+'. Please try again.';
  }
 };
 const onMessage=event=>{
  if(!busy||event.origin!==location.origin||event.source!==popup||event.data?.type!=='flux:trello-oauth')return;
  void finish(event.data.status);
 };
 const onClick=async()=>{
  if(busy)return;
  // Open synchronously in the click gesture, before fetching the session or OAuth URL.
  popup=window.open('about:blank','flux-trello-auth','popup=yes,width=570,height=720,resizable=yes,scrollbars=yes');
  if(!popup){status.textContent='Allow pop-ups for Flux Studio to connect Trello.';return;}
  const attempt=popup;
  busy=true;generation++;render();
  status.textContent='Complete authorization in the separate Trello window.';
  try{
   popup.document.title='Connecting Trello';
   popup.document.body.textContent='Preparing secure Trello authorization…';
   popup.focus();
   const token=await getToken();
   if(disposed||attempt.closed){stop();return;}
   if(!token)throw Error('Sign in to Flux Studio first.');
   const response=await fetch('/.netlify/functions/trello-oauth-start',{method:'POST',headers:{authorization:'Bearer '+token}});
   const data=await response.json();
   if(!response.ok||!data.authorizeUrl)throw Error(data.error||'Authorization unavailable');
   const destination=new URL(data.authorizeUrl);
   if(destination.origin!=='https://auth.atlassian.com')throw Error('Unexpected authorization destination');
   if(disposed||attempt.closed){stop();return;}
   attempt.location.replace(destination.href);
   const started=Date.now();
   timer=setInterval(()=>{
    // Also refresh after manual closure or an OAuth provider that severs window.opener.
    if(attempt.closed){void finish();return;}
    if(Date.now()-started>600000){stop();status.textContent='Authorization timed out. Please try again.';}
   },700);
  }catch(error){attempt.close();stop();if(!disposed)status.textContent=error.message;}
 };
 button.addEventListener('click',onClick);
 window.addEventListener('message',onMessage);
 render();void check();
 return ()=>{disposed=true;generation++;clearInterval(timer);window.removeEventListener('message',onMessage);button.removeEventListener('click',onClick);if(popup&&!popup.closed)popup.close();};
};
