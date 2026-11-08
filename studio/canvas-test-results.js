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

 // Execution overlay follows real server trace, including canvas re-renders.
 let latestTrace=null,latestError='';
 const statusClasses=['completed','filtered','skipped','simulated','failed'];
 const statusLabels={completed:'Completed',filtered:'Filtered',skipped:'Skipped',simulated:'Simulated',failed:'Error'};
 const humanAdvice=(message)=>{
  if(/connect|token|authoriz|authenticat|401|403/i.test(message))return 'Check the connection and sign in again if necessary.';
  if(/list|destination|field|mapping|configuration|valid|required|unsupported/i.test(message))return 'Check the required fields and operation in this block.';
  if(/timeout|network|fetch|429|rate limit/i.test(message))return 'Check service availability. Before retrying a write, verify whether the external action already occurred.';
  return 'Open the technical execution log for more information.';
 };
 const renderFlowStatus=()=>{
  const nodes=[...document.querySelectorAll('#nodes .node')];
  const byId=new Map(nodes.map(node=>[node.dataset.nodeId,node]));
  for(const node of nodes){
   for(const status of statusClasses)node.classList.remove('flux-run-'+status);
   node.querySelector('.flux-run-marker')?.remove();
   node.removeAttribute('data-flux-run-reason');
  }
  const edges=[...document.querySelectorAll('#edges .flux-connection-path')];
  for(const edge of edges)edge.classList.remove('flux-run-edge-completed','flux-run-edge-simulated');
  if(!latestTrace)return;
  const state=new Map();
  for(const step of latestTrace){
   const node=byId.get(step.id);if(!node)continue;
   const status=statusClasses.includes(step.status)?step.status:'failed';
   state.set(step.id,status);
   node.classList.add('flux-run-'+status);
   const marker=document.createElement('span');marker.className='flux-run-marker';marker.textContent=status==='completed'?'✓':status==='filtered'?'−':status==='skipped'?'·':status==='simulated'?'◌':'!';
   marker.setAttribute('aria-label',statusLabels[status]);
   const reason=String(step.reason|| (status==='failed'?latestError:'')).slice(0,500);
   if(reason)node.dataset.fluxRunReason=reason;
   marker.title=statusLabels[status]+(reason?' · '+reason:'');
   node.append(marker);
  }
  // A server error may omit a failing step from the trace: never mark it as successful.
  if(latestError&&!latestTrace.some(step=>step.status==='failed'||step.status==='error')){
   const matched=latestError.match(/(?:at|block|node)\s+([a-zA-Z][\w-]{0,79})/i);
   const target=matched&&byId.get(matched[1]);
   if(target&&!state.has(matched[1])){
    target.classList.add('flux-run-failed');target.dataset.fluxRunReason=latestError.slice(0,500);
    const marker=document.createElement('span');marker.className='flux-run-marker';marker.textContent='!';marker.title='Error · '+latestError.slice(0,500);target.append(marker);
   }
  }
  for(const edge of edges){
   const from=state.get(edge.dataset.from),to=state.get(edge.dataset.to);
   if(from==='completed'&&to==='completed')edge.classList.add('flux-run-edge-completed');
   else if(['completed','simulated'].includes(from)&&to==='simulated')edge.classList.add('flux-run-edge-simulated');
  }
 };
 const graphNodes=document.getElementById('nodes'),graphEdges=document.getElementById('edges');
 if(graphNodes)new MutationObserver(records=>{if(records.some(record=>record.type==='childList'&&[...record.addedNodes].some(node=>node.nodeType===1&&node.classList?.contains('node'))))renderFlowStatus();}).observe(graphNodes,{childList:true});
 if(graphEdges)new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))renderFlowStatus();}).observe(graphEdges,{childList:true});
 const inspector=document.createElement('aside');inspector.id='flux-run-inspector';inspector.hidden=true;inspector.setAttribute('aria-label','Block execution details');
 const inspectorHeading=document.createElement('strong');inspectorHeading.textContent='Block execution';
 const inspectorClose=document.createElement('button');inspectorClose.type='button';inspectorClose.textContent='Close';inspectorClose.addEventListener('click',()=>inspector.hidden=true);
 const inspectorStatus=document.createElement('p'),inspectorReason=document.createElement('p'),inspectorAdvice=document.createElement('p');
 const inspectorData=document.createElement('details');const inspectorSummary=document.createElement('summary');inspectorSummary.textContent='View block output';
 const inspectorPre=document.createElement('pre');inspectorData.append(inspectorSummary,inspectorPre);
 inspector.append(inspectorHeading,inspectorClose,inspectorStatus,inspectorReason,inspectorAdvice,inspectorData);
 document.body.append(inspector);
 graphNodes?.addEventListener('click',event=>{
  const node=event.target.closest('.node');if(!node||!latestTrace)return;
  const step=latestTrace.find(item=>item.id===node.dataset.nodeId);
  if(!step)return;
  const status=step.status==='error'?'failed':step.status;
  inspectorHeading.textContent=String(step.type||'Block')+' · '+String(step.id);
  inspectorStatus.textContent='Status: '+(statusLabels[status]||status);
  inspectorReason.textContent=step.reason?'Details: '+String(step.reason):'No additional details reported.';
  inspectorAdvice.textContent=status==='failed'?'Suggestion: '+humanAdvice(String(step.reason||latestError)):'';
  const value=latestOutputs&&Object.hasOwn(latestOutputs,step.id)?latestOutputs[step.id]:undefined;
  inspectorData.hidden=value===undefined;
  inspectorPre.textContent=value===undefined?'':JSON.stringify(value,null,2);
  inspector.hidden=false;
 });
 let latestOutputs=null;
 const observer=new MutationObserver(()=>{
  const raw=output.textContent||'';
  if(!raw.startsWith('HTTP ')){panel.replaceChildren();return;}
  const start=raw.indexOf('{');if(start<0)return;
  let result;try{result=JSON.parse(raw.slice(start));}catch{return;}
  if(raw!==window.fluxLastLoggedResponse){window.fluxLastLoggedResponse=raw;window.dispatchEvent(new CustomEvent('flux:run-summary',{detail:{...result,dryRun:document.getElementById('run-dry')?.checked!==false}}));}
  window.dispatchEvent(new CustomEvent('flux:test-outputs',{detail:{outputs:result.ok&&result.outputs&&typeof result.outputs==='object'?result.outputs:{}}}));
  latestTrace=Array.isArray(result.trace)?result.trace:[];latestError=String(result.error||'');latestOutputs=result.outputs&&typeof result.outputs==='object'?result.outputs:{};renderFlowStatus();
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
  if(result.metering){
   const metering=document.createElement('p');metering.className='flux-metering-preview';
   metering.textContent='FluxCoins estimate · '+result.metering.estimatedFluxCoins+' FCX for '+result.metering.billableOperations+' completed operations · '+result.metering.simulatedOperations+' simulated · '+result.metering.excludedOperations+' excluded. Preview only: existing billing remains unchanged.';
   panel.append(metering);
  }
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
     if(step.type==='miro'){
      const summary=document.createElement('p');summary.textContent=stepOutput?.simulated?'Miro preview · '+stepOutput.boardName+' · no changes made':stepOutput?.created?'Miro card created':stepOutput?.updated?'Miro card updated':(stepOutput?.count||0)+' Miro cards retrieved';item.append(summary);
      if(stepOutput?.title){const title=document.createElement('p');title.textContent=stepOutput.title;item.append(title);}
      if(Array.isArray(stepOutput?.items)){const cards=document.createElement('ul');for(const card of stepOutput.items){const line=document.createElement('li');line.textContent=card.title||card.name;cards.append(line);}item.append(cards);if(stepOutput.hasMore){const more=document.createElement('p');more.textContent='Results cover the first 50 cards. More cards are available on the board.';item.append(more);}}
      if(stepOutput?.url&&stepOutput.url.startsWith('https://miro.com/app/board/')){const link=document.createElement('a');link.href=stepOutput.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open Miro board';item.append(link);}
     }
     if(step.type==='slack'){
      const summary=document.createElement('p');
      summary.textContent=stepOutput?.delivered===true?'Message delivered to #'+stepOutput.channelName:stepOutput?.simulated===true?'Message preview for #'+stepOutput.channelName+' · not sent':(stepOutput?.count||0)+' available Slack channels';
      item.append(summary);
      if(stepOutput?.simulated===true){const preview=document.createElement('p');preview.style.whiteSpace='pre-wrap';preview.textContent=stepOutput.message;item.append(preview);}
      if(Array.isArray(stepOutput?.items)){const channels=document.createElement('p');channels.textContent=stepOutput.items.map(c=>'#'+c.name).join(', ');item.append(channels);if(stepOutput.hasMore){const more=document.createElement('p');more.textContent='More channels are available. Use the channel picker to load the next page.';item.append(more);}}
     }
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
