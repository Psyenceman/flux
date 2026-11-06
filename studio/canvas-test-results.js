/* Human-readable test results; original server response remains accessible. */
const output=document.getElementById('run-output');
if(output){
 const panel=document.createElement('div');panel.id='flux-test-results';panel.setAttribute('aria-live','polite');
 output.before(panel);
 const logArea=document.createElement('details');logArea.id='flux-execution-log';logArea.className='flux-technical-toggle';
 const logHeading=document.createElement('summary');logHeading.textContent='Execution log · technical details';
 logArea.append(logHeading);
 const logBody=document.createElement('div');logBody.className='flux-log-body';logArea.append(logBody);
 output.before(logArea);
 logBody.append(output);

 const observer=new MutationObserver(()=>{
  const raw=output.textContent||'';
  if(!raw.startsWith('HTTP ')){panel.replaceChildren();return;}
  const start=raw.indexOf('{');if(start<0)return;
  let result;try{result=JSON.parse(raw.slice(start));}catch{return;}
  if(raw!==window.fluxLastLoggedResponse){window.fluxLastLoggedResponse=raw;window.dispatchEvent(new CustomEvent('flux:run-summary',{detail:{...result,dryRun:document.getElementById('run-dry')?.checked!==false}}));}
  window.dispatchEvent(new CustomEvent('flux:test-outputs',{detail:{outputs:result.ok&&result.outputs&&typeof result.outputs==='object'?result.outputs:{}}}));
  for(const node of document.querySelectorAll('#nodes .node')){node.classList.remove('flux-run-completed','flux-run-filtered','flux-run-skipped','flux-run-simulated');}
  if(Array.isArray(result.trace))for(const step of result.trace){const node=[...document.querySelectorAll('#nodes .node')].find(el=>el.dataset.nodeId===step.id);if(node&&['completed','filtered','skipped','simulated'].includes(step.status))node.classList.add('flux-run-'+step.status);}
  panel.replaceChildren();for(const stepLog of logBody.querySelectorAll('.flux-step-raw'))stepLog.remove();
  // Flux Explain: actionable diagnostics derived only from actual execution results.
  const explain=document.createElement('section');explain.className='flux-explain';explain.setAttribute('aria-label','Flux Explain');
  const explainHeader=document.createElement('div');explainHeader.className='flux-explain-header';
  const explainTitle=document.createElement('strong');explainTitle.textContent='Flux Explain';
  const explainState=document.createElement('span');explainState.className='flux-explain-state';
  const trace=Array.isArray(result.trace)?result.trace:[];
  const errors=trace.filter(step=>step.status==='error'||step.status==='failed');
  const skipped=trace.filter(step=>step.status==='skipped');
  const filtered=trace.filter(step=>step.status==='filtered');
  const simulated=trace.filter(step=>step.status==='simulated');
  const successes=trace.filter(step=>step.status==='completed');
  const safePreview=result.dryRun===true||document.getElementById('run-dry')?.checked===true;
  const explainText=document.createElement('p');explainText.className='flux-explain-summary';
  if(!result.ok){
   explainState.textContent='Needs attention';explainState.dataset.kind='error';
   explainText.textContent='The execution did not finish successfully. '+(errors.length?'The trace identifies '+errors.length+' block(s) with an error.':'The server returned an error without a failing block in its trace.');
  }else if(skipped.length||filtered.length){
   explainState.textContent='Partially processed';explainState.dataset.kind='warning';
   explainText.textContent=successes.length+' block(s) completed; '+skipped.length+' skipped and '+filtered.length+' filtered. Skipped or filtered steps do not perform their downstream actions.';
  }else{
   explainState.textContent=safePreview?'Test completed':'Execution completed';explainState.dataset.kind='success';
   explainText.textContent=successes.length+' block(s) completed'+(simulated.length?' and '+simulated.length+' simulated':'')+'. '+(safePreview?'This was a safe test: simulated actions did not change external services.':'Check the individual block outputs for the actions performed.');
  }
  explainHeader.append(explainTitle,explainState);explain.append(explainHeader,explainText);
  const advice=document.createElement('ul');advice.className='flux-explain-advice';
  const addAdvice=(message)=>{const li=document.createElement('li');li.textContent=message;advice.append(li);};
  const message=String(result.error||'');
  if(message){
   const details=document.createElement('p');details.className='flux-explain-error';details.textContent='Reported error: '+message;explain.append(details);
   if(/connect|token|authoriz|authenticat|401|403/i.test(message))addAdvice('Check the connector account and reconnect it if authorization has expired.');
   else if(/list|destination|field|mapping|configuration|valid|required|unsupported/i.test(message))addAdvice('Open the affected block and check its required fields and selected operation.');
   else if(/timeout|network|fetch|429|rate limit/i.test(message))addAdvice('Check the service availability and request limits. Before retrying a write, verify whether the external action already happened.');
   else addAdvice('Inspect the failing block output and its configuration. The technical log below contains the server details.');
  }
  for(const step of errors.slice(0,3))addAdvice('Block '+String(step.type||step.id||'unknown')+': '+String(step.reason||'execution failed')+'.');
  if(skipped.length)addAdvice(skipped.length+' step(s) were skipped. Check connection settings and the reasons shown under each step.');
  if(filtered.length)addAdvice(filtered.length+' path(s) were filtered by conditions. This can be expected behavior; check the condition values if not.');
  if(simulated.length)addAdvice(simulated.length+' step(s) were simulated. Their external actions were not performed.');
  if(advice.children.length)explain.append(advice);
  const detailsButton=document.createElement('button');detailsButton.type='button';detailsButton.className='flux-explain-details';detailsButton.textContent='View technical execution log';
  detailsButton.addEventListener('click',()=>{logArea.open=true;logArea.scrollIntoView({block:'nearest',behavior:'smooth'});});
  explain.append(detailsButton);panel.append(explain);
  const heading=document.createElement('strong');heading.textContent=result.ok?(result.dryRun?'Safe test completed — no external changes made':'Execution completed'):'Test could not finish';panel.append(heading);
  if(result.error){const error=document.createElement('p');error.textContent=result.error;panel.append(error);}
  if(Array.isArray(result.trace)){
   const counts={completed:0,simulated:0,filtered:0,skipped:0};
   for(const step of result.trace)counts[step.status]=(counts[step.status]||0)+1;
   const summary=document.createElement('p');summary.textContent=counts.completed+' completed · '+counts.simulated+' simulated · '+counts.filtered+' filtered · '+counts.skipped+' skipped';panel.append(summary);
   const list=document.createElement('ol');list.className='flux-test-steps';
   for(const step of result.trace){
    const item=document.createElement('li');
    const title=document.createElement('strong');title.textContent=step.type+' ('+step.id+')';
    const status=document.createElement('span');status.className='flux-step-status '+step.status;status.textContent=step.status;
    item.append(title,status);
    if(step.reason){const reason=document.createElement('p');reason.textContent=step.reason;item.append(reason);}
    if(result.outputs&&Object.hasOwn(result.outputs,step.id)){
     const stepOutput=result.outputs[step.id];
     if(step.type==='trello'&&Array.isArray(stepOutput?.items)){
      const count=document.createElement('p');count.textContent=stepOutput.items.length+' Trello cards retrieved';item.append(count);
      const cards=document.createElement('ul');cards.style.cssText='padding-left:20px;max-height:300px;overflow:auto';
      for(const card of stepOutput.items){
       const line=document.createElement('li');
       if(typeof card.url==='string'&&/^https:\/\/trello\.com\/c\//.test(card.url)){const link=document.createElement('a');link.href=card.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=String(card.name||'Untitled card');line.append(link);}
       else line.textContent=String(card.name||'Untitled card');
       cards.append(line);
      }
      item.append(cards);
     }
     if(step.type==='trello'&&stepOutput?.created===true&&typeof stepOutput.url==='string'&&/^https:\/\/trello\.com\/c\//.test(stepOutput.url)){
      const link=document.createElement('a');link.href=stepOutput.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open created Trello card';link.style.cssText='display:inline-block;margin:8px 0;font-weight:700';item.append(link);
     }
     const details=document.createElement('details');details.className='flux-step-raw';const summary=document.createElement('summary');summary.textContent='View output';
     const data=document.createElement('pre');data.textContent=JSON.stringify(result.outputs[step.id],null,2);details.append(summary,data);logBody.append(details);
    }
    list.append(item);
   }
   panel.append(list);
   if(counts.skipped||counts.simulated){const warning=document.createElement('p');warning.className='inspector-help';warning.textContent='Important: simulated or skipped steps did not perform a real external action. Check connector configuration before going live.';panel.append(warning);}
  }
 });
 observer.observe(output,{childList:true,characterData:true,subtree:true});
}
