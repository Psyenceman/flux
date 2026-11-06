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
