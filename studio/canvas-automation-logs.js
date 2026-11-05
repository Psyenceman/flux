/* Session-only debug history; never persist test payloads or secrets to browser storage. */
(()=>{
 const panel=document.getElementById('flux-automation-log-list');
 const output=document.getElementById('run-output');
 if(!panel||!output)return;
 let active=document.getElementById('canvas-automation')?.value||null;
 const selector=document.getElementById('canvas-automation');
 selector?.addEventListener('change',()=>{active=selector.value||null;show();});
 const history=new Map();
 const tools=document.createElement('div');tools.className='flux-log-tools';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filter debug logs');for(const [value,label] of [['all','All results'],['Failed','Failed'],['Simulation','Simulations'],['Execution','Executions']]){const option=new Option(label,value);filter.add(option);}filter.addEventListener('change',show);
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear session logs';clear.addEventListener('click',()=>{history.delete(selector?.value||active||'local');show();});
 tools.append(filter,clear);panel.before(tools);
 function show(){
  panel.replaceChildren();
  const entries=(history.get(selector?.value||active||'local')||[]).filter(item=>filter.value==='all'||item.status===filter.value);
  if(!entries.length){const p=document.createElement('p');p.textContent='No test logs in this browser session for the selected automation.';panel.append(p);return;}
  for(const item of entries.slice().reverse()){
   const details=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent=item.time+' · '+item.status+' · '+item.steps+' steps';
   const pre=document.createElement('pre');pre.textContent=item.details;
   details.append(summary,pre);panel.append(details);
  }
 }
 window.addEventListener('flux:automation-opened',event=>{active=event.detail?.id||null;show();});
 const observer=new MutationObserver(()=>{
  const raw=output.textContent||'';if(!raw.startsWith('HTTP '))return;
  const start=raw.indexOf('{');if(start<0)return;
  let result;try{result=JSON.parse(raw.slice(start));}catch{return;}
  const key=selector?.value||active||'local';
  const entries=history.get(key)||[];
  const fingerprint=raw;
  if(entries.length&&entries[entries.length-1].fingerprint===fingerprint)return;
  const statuses=(result.trace||[]).map(step=>step.type+': '+step.status+(step.reason?' — '+step.reason:''));
  entries.push({fingerprint,time:new Date().toLocaleTimeString(),status:result.ok?(result.dryRun?'Simulation':'Execution'):'Failed',steps:statuses.length,details:statuses.join('\n')||String(result.error||'No trace available')});
  if(entries.length>25)entries.shift();
  history.set(key,entries);show();
 });
 observer.observe(output,{childList:true,characterData:true,subtree:true});show();
})();
