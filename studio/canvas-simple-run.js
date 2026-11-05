window.fluxExecutionHeaders=async function(token){
 const headers={'content-type':'application/json'};
 if(token){headers['x-flux-token']=token;return headers;}
 const access=await new Promise(resolve=>{
  const timeout=setTimeout(()=>{window.removeEventListener('flux:session-response',receive);resolve(null);},3500);
  function receive(event){clearTimeout(timeout);window.removeEventListener('flux:session-response',receive);resolve(event.detail);}
  window.addEventListener('flux:session-response',receive);
  window.dispatchEvent(new Event('flux:session-request'));
 });
 if(!access)throw Error('Sign in to Flux Studio first, then try again.');
 headers.authorization='Bearer '+access;
 return headers;
};
const tokenField=document.getElementById('run-token');
if(tokenField){tokenField.closest('.field').style.display='none';}
const runButton=document.getElementById('run-now');
if(runButton)runButton.textContent='Test automation';
const runTitle=document.querySelector('#runner h2');
if(runTitle)runTitle.textContent='Test your automation';
const dry=document.getElementById('run-dry');
if(dry){dry.checked=true;dry.closest('label').title='Safe test: no external actions are sent';}
