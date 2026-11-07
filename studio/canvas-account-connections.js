import './structured-config.js';
import './slack-resource-picker.js';
import {CONNECTORS} from './connector-catalog.js';
(()=>{
 const bar=document.querySelector('.workspace-bar');if(!bar)return;
 const button=document.createElement('button');button.type='button';button.textContent='My connections';button.style.cssText='padding:9px;border-radius:8px;border:1px solid #9279cf;background:#35265c;color:#fff;cursor:pointer';bar.append(button);
 const dialog=document.createElement('dialog');dialog.style.cssText='max-height:85dvh;overflow:auto;width:min(640px,calc(100vw - 24px));border:1px solid #7466a2;border-radius:14px;padding:22px;background:#1d1a33;color:white';
 const heading=document.createElement('h2');heading.textContent='My connections';
 const info=document.createElement('p');info.textContent='TEST only. Credentials are encrypted server-side and scoped to your account. Credentials are checked with a read-only provider request before saving. Use test-only restricted tokens.';
 const status=document.createElement('p');status.setAttribute('role','status');
 const list=document.createElement('div'),close=document.createElement('button');close.textContent='Close';close.addEventListener('click',()=>dialog.close());dialog.append(heading,info,list,status,close);document.body.append(dialog);
 const providers=Object.entries(CONNECTORS).map(([id,c])=>[id,c.name]);
 async function call(method,body){if(typeof window.fluxExecutionHeaders!=='function')throw Error('Sign in first');const h=await window.fluxExecutionHeaders('');const r=await fetch('/.netlify/functions/flux-connector-connections',{method,headers:{...h,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
 async function refresh(){
  list.replaceChildren();status.textContent='Loading…';
  try{let unavailable='';let result;try{result=await call('GET');}catch(error){unavailable=error.message;result={connections:[]};}const connected=new Map(result.connections.map(c=>[c.provider,c]));
   for(const [provider,name] of providers){
    const spec=CONNECTORS[provider];
    const existing=connected.get(provider),row=document.createElement('section');row.style.cssText='padding:12px 0;border-top:1px solid #655d80';
    const label=document.createElement('strong');label.textContent=name+' · '+(existing?'Credential verified and saved':unavailable?'Sign in to check':'Not connected');row.append(label);
    const explanation=document.createElement('p');explanation.textContent=spec.actions+' · '+spec.execution+'. '+spec.help;row.append(explanation);
    if(spec.connection!=='token'){const state=document.createElement('p');state.textContent=spec.connection==='oauth'?'Connect securely from the Trello block.':'Connection setup required in Flux before personal authorization is available.';row.append(state);list.append(row);continue;}
    const form=document.createElement('form');form.style.cssText='display:grid;gap:8px;margin:8px 0';
    const input=document.createElement('input');input.type='password';input.autocomplete='off';input.required=true;input.minLength=12;input.placeholder='Personal access token';input.style.cssText='padding:10px;border-radius:7px';
    const save=document.createElement('button');save.type='submit';save.textContent=existing?'Replace token':'Save token';form.append(input,save);
    form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{await call('POST',{provider,token:input.value,label:name});input.value='';await refresh();}catch(error){status.textContent=error.message;}finally{save.disabled=false;}});row.append(form);
    if(existing){const remove=document.createElement('button');remove.type='button';remove.textContent='Disconnect';remove.addEventListener('click',async()=>{if(!confirm('Disconnect '+name+'?'))return;try{await call('DELETE',{provider});await refresh();}catch(error){status.textContent=error.message;}});row.append(remove);}
    list.append(row);
   }status.textContent=unavailable||'Credential verification is separate from action execution. Each connector shows its current execution support.';
  }catch(error){status.textContent=error.message;}
 }
 button.addEventListener('click',()=>{dialog.showModal();refresh();});
})();
