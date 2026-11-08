export function mountGithubConnect({button,title,status,getToken,onStatus=()=>{}}){
 let popup,timer,busy=false,disposed=false,generation=0,state={configured:false,connected:false};
 function render(){button.disabled=busy||!state.configured;button.dataset.state=busy?'connecting':state.connected?'connected':'disconnected';button.setAttribute('aria-busy',String(busy));button.textContent=busy?'Connecting…':state.connected?(state.configured?'✓ GitHub connected · Reconnect':'✓ GitHub connected'):'Connect GitHub';}
 async function check(){
  const current=++generation;
  try{
   const token=await getToken();if(disposed||current!==generation)return;
   const response=await fetch('/.netlify/functions/github-oauth-status',{headers:token?{authorization:'Bearer '+token}:{},cache:'no-store'}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Connection status unavailable');if(disposed||current!==generation)return;
   state=data;title.textContent=data.connected?'GitHub · Connected':'GitHub';
   status.textContent=data.connected?((data.label||'Your GitHub account is connected')+(!data.configured?' · One-click reconnection is being prepared in TEST.':'')):!data.configured?'GitHub authorization is being prepared in TEST. Public repository reads are available.':!data.signedIn?'Sign in to Flux, then connect your GitHub account.':'Choose the repositories Flux can use. No tokens to copy or paste.';
   render();onStatus(data);return data;
  }catch(error){if(!disposed&&current===generation){status.textContent=error.message;state={configured:false,connected:false};render();}}
 }
 const stop=()=>{clearInterval(timer);timer=null;busy=false;render();};
 async function finish(result){
  stop();const data=await check();if(disposed)return;
  if(result&&result!=='connected'){status.textContent=result==='denied'?'GitHub authorization cancelled. Your previous connection is unchanged.':result==='installation_required'?'Select repositories and allow issue access in the Flux GitHub App, then reconnect.':'GitHub authorization did not finish. Please try again.';return;}
  if(data?.connected)window.dispatchEvent(new Event('flux:github-connected'));
 }
 function message(event){if(!busy||event.origin!==location.origin||event.source!==popup||event.data?.type!=='flux:github-oauth'||!['connected','denied','invalid','expired','failed','installation_required'].includes(event.data.status))return;void finish(event.data.status);}
 async function click(){
  if(busy||!state.configured)return;
  popup=window.open('about:blank','flux-github-auth','popup=yes,width=600,height=760,resizable=yes,scrollbars=yes');
  if(!popup){status.textContent='Allow pop-ups for Flux to connect GitHub.';return;}
  const attempt=popup;busy=true;generation++;render();status.textContent='Finish authorization in the GitHub window. Your workflow stays open.';
  try{
   attempt.document.title='Connect GitHub';attempt.document.body.textContent='Preparing your secure GitHub connection…';attempt.focus();
   const token=await getToken();if(disposed||attempt.closed){stop();return;}if(!token)throw Error('Sign in to Flux first.');
   const response=await fetch('/.netlify/functions/github-oauth-start',{method:'POST',headers:{authorization:'Bearer '+token}}),data=await response.json();
   if(!response.ok)throw Error(data.error||'GitHub authorization unavailable');const target=new URL(data.authorizeUrl);
   if(target.origin!=='https://github.com'||target.pathname!=='/login/oauth/authorize')throw Error('Unexpected authorization destination');
   if(disposed||attempt.closed){stop();return;}attempt.location.replace(target.href);
   const started=Date.now();timer=setInterval(()=>{if(attempt.closed){void finish();return;}if(Date.now()-started>600000){stop();status.textContent='Authorization timed out. Please try again.';}},700);
  }catch(error){attempt.close();stop();if(!disposed)status.textContent=error.message;}
 }
 button.classList.add('fx-oauth-connect');button.addEventListener('click',click);window.addEventListener('message',message);render();void check();
 return ()=>{disposed=true;generation++;clearInterval(timer);button.removeEventListener('click',click);window.removeEventListener('message',message);if(popup&&!popup.closed)popup.close();};
}
if(typeof window!=='undefined')window.FluxGithubConnect=mountGithubConnect;
