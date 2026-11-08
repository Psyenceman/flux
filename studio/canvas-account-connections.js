import {mountGithubConnect} from './github-connect.js';
import './structured-config.js';
import './slack-resource-picker.js';
import './miro-resource-picker.js';
import './github-resource-picker.js';
import {CONNECTORS} from './connector-catalog.js';
(()=>{
 const bar=document.querySelector('.workspace-bar');if(!bar)return;
 const button=document.createElement('button');button.type='button';button.textContent='My connections';button.className='fx-connections-trigger';bar.append(button);
 const dialog=document.createElement('dialog');dialog.id='flux-connections-dialog';dialog.setAttribute('aria-label','My connections');
 const heading=document.createElement('h2');heading.textContent='My connections';
 const info=document.createElement('p');info.textContent='Connect your apps once. Reuse them in every automation. Your credentials stay private to your account.';
 const status=document.createElement('p');status.setAttribute('role','status');
 const search=document.createElement('input');search.type='search';search.placeholder='Search your apps…';search.setAttribute('aria-label','Search connections');
 const list=document.createElement('div');list.className='fx-connections-grid';let disposers=[],refreshRevision=0;
 const filter=()=>{const query=search.value.trim().toLowerCase();for(const row of list.children)row.hidden=!row.dataset.provider?.includes(query);};search.addEventListener('input',filter);
 const close=document.createElement('button');close.textContent='Close';close.addEventListener('click',()=>dialog.close());dialog.append(heading,info,search,list,status,close);document.body.append(dialog);
 const providers=Object.entries(CONNECTORS).map(([id,c])=>[id,c.name]);
 async function call(method,body){if(typeof window.fluxExecutionHeaders!=='function')throw Error('Sign in first');const h=await window.fluxExecutionHeaders('');const r=await fetch('/.netlify/functions/flux-connector-connections',{method,headers:{...h,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
 async function refresh(){
  const revision=++refreshRevision;disposers.forEach(dispose=>dispose());disposers=[];list.replaceChildren();status.textContent='Loading your connections…';
  try{let unavailable='';let result;try{result=await call('GET');}catch(error){unavailable=error.message;result={connections:[]};}if(revision!==refreshRevision||!dialog.open)return;const connected=new Map(result.connections.map(c=>[c.provider,c]));
   for(const [provider,name] of providers){
    const spec=CONNECTORS[provider];
    const existing=connected.get(provider),row=document.createElement('section');row.className='fx-connection-card';row.dataset.provider=(provider+' '+name).toLowerCase();
    const label=document.createElement('strong');label.textContent=name;const badge=document.createElement('span');badge.className='fx-connection-badge';badge.dataset.connected=String(Boolean(existing));badge.textContent=existing?'Credential saved':unavailable?'Sign in to connect':'Not connected';row.append(label,badge);
    const explanation=document.createElement('p');explanation.textContent=spec.actions;row.append(explanation);
    const detail=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Connection details';const help=document.createElement('p');help.textContent=spec.execution+'. '+spec.help;detail.append(summary,help);row.append(detail);
    if(provider==='github'){
     const connect=document.createElement('button');connect.type='button';const feedback=document.createElement('p');feedback.className='fx-connection-feedback';feedback.setAttribute('role','status');
     const disconnect=document.createElement('button');disconnect.type='button';disconnect.textContent='Disconnect';disconnect.className='fx-connection-disconnect';disconnect.hidden=true;
     disconnect.onclick=async()=>{if(!confirm('Disconnect GitHub from Flux?'))return;disconnect.disabled=true;try{await call('DELETE',{provider:'github'});await refresh();}catch(error){status.textContent=error.message;}finally{disconnect.disabled=false;}};
     row.append(connect,feedback,disconnect);disposers.push(mountGithubConnect({button:connect,title:label,status:feedback,getToken:async()=>{try{return (await window.fluxExecutionHeaders('')).authorization?.slice(7)||null;}catch{return null;}},onStatus:data=>{badge.textContent=data.connected?'Connected':'Not connected';badge.dataset.connected=String(Boolean(data.connected));disconnect.hidden=!data.connected;}}));
    }
    if(spec.connection!=='token'){const state=document.createElement('p');state.textContent=spec.connection==='oauth'?'Connect securely from the Trello block.':'Connection setup required in Flux before personal authorization is available.';row.append(state);list.append(row);continue;}
    const form=document.createElement('form');form.style.cssText='display:grid;gap:8px;margin:8px 0';
    const input=document.createElement('input');input.type='password';input.autocomplete='off';input.required=true;input.minLength=12;input.placeholder='Personal access token';input.style.cssText='padding:10px;border-radius:7px';
    const save=document.createElement('button');save.type='submit';save.textContent=existing?'Replace token':'Save token';form.append(input,save);
    form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{await call('POST',{provider,token:input.value,label:name});input.value='';await refresh();}catch(error){status.textContent=error.message;}finally{save.disabled=false;}});const advanced=document.createElement('details');advanced.className='fx-connection-advanced';const advancedTitle=document.createElement('summary');advancedTitle.textContent=provider==='github'?'Advanced: use a personal token':'Connect with a token';advanced.append(advancedTitle,form);row.append(advanced);
    if(existing&&provider!=='github'){const remove=document.createElement('button');remove.type='button';remove.textContent='Disconnect';remove.addEventListener('click',async()=>{if(!confirm('Disconnect '+name+'?'))return;try{await call('DELETE',{provider});await refresh();}catch(error){status.textContent=error.message;}});row.append(remove);}
    list.append(row);
   }filter();status.textContent=unavailable||'TEST workspace · Open Connection details to check each app’s available actions.';
  }catch(error){status.textContent=error.message;}
 }
 dialog.addEventListener('close',()=>{refreshRevision++;disposers.forEach(dispose=>dispose());disposers=[];});
 button.addEventListener('click',()=>{dialog.showModal();refresh();});
})();
