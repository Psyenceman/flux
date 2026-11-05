/* Human-readable test results; original server response remains accessible. */
const output=document.getElementById('run-output');
if(output){
 const panel=document.createElement('div');panel.id='flux-test-results';panel.setAttribute('aria-live','polite');
 output.before(panel);
 const observer=new MutationObserver(()=>{
  const raw=output.textContent||'';
  if(!raw.startsWith('HTTP ')){panel.replaceChildren();return;}
  const start=raw.indexOf('{');if(start<0)return;
  let result;try{result=JSON.parse(raw.slice(start));}catch{return;}
  if(result.ok&&result.outputs&&typeof result.outputs==='object')window.dispatchEvent(new CustomEvent('flux:test-outputs',{detail:{outputs:result.outputs}}));
  panel.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=result.ok?'Test completed':'Test could not finish';panel.append(heading);
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
     const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='View output';
     const data=document.createElement('pre');data.textContent=JSON.stringify(result.outputs[step.id],null,2);details.append(summary,data);item.append(details);
    }
    list.append(item);
   }
   panel.append(list);
  }
 });
 observer.observe(output,{childList:true,characterData:true,subtree:true});
 const advanced=document.createElement('details');advanced.className='flux-raw-result';const label=document.createElement('summary');label.textContent='Technical response (advanced)';advanced.append(label);
 output.before(advanced);advanced.append(output);
}
