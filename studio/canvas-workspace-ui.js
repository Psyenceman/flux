/* Flux Studio: one canvas, one toolbar, one contextual panel at a time. */
(()=>{
 const main=document.querySelector('#canvas-shell > main');
 const bar=main?.querySelector('.workspace-bar');
 const library=document.getElementById('flux-automation-library');
 const cloud=document.getElementById('canvas-cloud');
 const assistant=document.getElementById('flux-assistant-panel');
 const logs=document.getElementById('flux-automation-logs');
 const actions=main?.querySelector('.toolbar:not(#canvas-cloud)');
 const runner=document.getElementById('runner');
 const navigation=main?.querySelector('.canvas-tools');
 const viewport=document.getElementById('viewport');
 if(!main||!bar||!library||!cloud||!assistant||!logs||!actions||!navigation||!viewport)return;
 const nav=document.createElement('nav');nav.className='flux-mode-tabs';nav.setAttribute('aria-label','Studio sections');
 const tabs=[['automations','My automations'],['editor','Advanced editor'],['logs','Activity'],['assistant','Assistant']];
 const views={editor:viewport,automations:library,assistant,logs};
 const buttons=new Map();
 for(const [id,label] of tabs){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('click',()=>activate(id));buttons.set(id,button);nav.append(button);
 }
 bar.prepend(nav);
 const options=document.createElement('details');options.className='flux-settings';
 const optionsTitle=document.createElement('summary');optionsTitle.textContent='Settings';options.append(optionsTitle,cloud);
 const workspaceActions=bar.querySelector('.workspace-actions');
 // Keep Settings exclusively inside the More actions menu.
 const body=document.createElement('div');body.className='flux-main-view';
 main.insertBefore(body,navigation);
 main.insertBefore(navigation,body);
 main.insertBefore(actions,navigation);
 const primaryIds=['save','load','validate','execute'];
 const overflow=document.createElement('details');overflow.className='more-actions';
 const overflowLabel=document.createElement('summary');overflowLabel.textContent='More ···';overflow.append(overflowLabel);
 for(const id of ['export','import','reset']){const button=document.getElementById(id);if(button)overflow.append(button);}
 const labels={save:'Save',load:'Open',validate:'Validate',execute:'Test workflow'};
 for(const id of primaryIds){const button=document.getElementById(id);if(button)button.textContent=labels[id];}
 const inspectorToggle=workspaceActions?.querySelector('#toggle-inspector');
 if(inspectorToggle)overflow.append(inspectorToggle);
 overflow.append(options);
 actions.append(overflow);
 // The workspace replaces the legacy toolbar: explicitly move the live-run control.
 const liveRun=document.getElementById('flux-run-live');
 if(liveRun){actions.insertBefore(liveRun,overflow);liveRun.hidden=false;liveRun.style.display='inline-flex';}
 actions.classList.add('compact-actions');
 for(const view of Object.values(views))body.append(view);
 const footer=main.querySelector('#status');
 // Running a test should not unexpectedly switch away from the editor.
 function activate(id){
  for(const [key,view] of Object.entries(views)){view.hidden=key!==id;view.style.display=key===id?'':'none';}
  actions.hidden=id!=='editor';navigation.hidden=id!=='editor';
  if(runner)runner.hidden=id!=='editor';
  for(const [key,button] of buttons){button.setAttribute('aria-current',String(key===id));}
  body.dataset.view=id;
  if(id==='editor')window.dispatchEvent(new Event('resize'));
 }
 // Keep cloud/webhook administration out of the main automation dashboard.
 const technical=document.createElement('details');technical.className='flux-technical';
 const technicalTitle=document.createElement('summary');technicalTitle.textContent='Advanced settings · Cloud and webhooks';technical.append(technicalTitle,cloud);library.append(technical);
 const homeHeader=document.createElement('div');homeHeader.className='flux-home-header';
 const homeIntro=document.createElement('p');homeIntro.textContent='Create and manage automations. Open one to edit its workflow.';
 const start=document.createElement('button');start.type='button';start.className='primary';start.textContent='+ Create automation';
 const wizard=document.createElement('section');wizard.className='flux-guide';wizard.hidden=true;
 const heading=document.createElement('h3');heading.textContent='Create your automation';
 const explanation=document.createElement('p');explanation.textContent='Choose what happens, optionally add a condition, and choose the result.';
 const triggerLabel=document.createElement('label');triggerLabel.textContent='1. When this happens';
 const trigger=document.createElement('select');trigger.innerHTML='<option value="trello_read">Read cards from a Trello list</option>';triggerLabel.append(trigger);
 const conditionLabel=document.createElement('label');conditionLabel.textContent='2. Only if (optional)';
 const condition=document.createElement('select');condition.innerHTML='<option value="none">No condition</option><option value="compare">Compare incoming data</option>';conditionLabel.append(condition);
 const actionLabel=document.createElement('label');actionLabel.textContent='3. Then do this';
 const action=document.createElement('select');action.innerHTML='<option value="trello_create">Create a Trello card</option><option value="log">Record a log entry</option>';actionLabel.append(action);
 const hint=document.createElement('p');hint.textContent='The blocks will be connected automatically. Configure the Trello lists and card details in the editor before running.';
 const controls=document.createElement('div');controls.className='flux-guide-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>{wizard.hidden=true;});
 const create=document.createElement('button');create.type='button';create.className='primary';create.textContent='Build workflow';
 create.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('flux:guided-build',{detail:{action:action.value,condition:condition.value==='compare'}})));
 controls.append(cancel,create);wizard.append(heading,explanation,triggerLabel,conditionLabel,actionLabel,hint,controls);
 library.prepend(wizard);
 start.addEventListener('click',()=>{wizard.hidden=false;wizard.scrollIntoView({block:'nearest',behavior:'smooth'});});
 window.addEventListener('flux:guided-build-complete',()=>{wizard.hidden=true;activate('editor');});
 homeHeader.append(homeIntro,start);library.prepend(homeHeader);
 const style=document.createElement('style');style.textContent='.flux-guide{padding:18px;margin:10px 0 20px;border:1px solid #4a6587;border-radius:14px;background:#f7faff;color:#18314d}.flux-guide h3,.flux-guide label{color:#18314d}.flux-guide p{color:#52657d}.flux-guide[hidden]{display:none}.flux-guide label{display:flex;flex-direction:column;gap:8px;margin:14px 0;font-weight:650}.flux-guide select{width:100%;padding:12px;border:1px solid #bfd0e4;border-radius:8px;background:#fff;color:#18314d}.flux-guide-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.flux-guide-actions button{padding:11px 16px;border-radius:8px;cursor:pointer}.flux-guide-actions .primary{background:#176baf;color:white;border:0}.flux-technical{margin-top:24px;border:1px solid #d4dfed;border-radius:10px;padding:12px;background:#f7faff;color:#18314d}.flux-technical>summary{cursor:pointer;font-weight:650;padding:5px}.flux-technical:not([open]) #canvas-cloud{display:none}.flux-home-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 0 18px}.flux-home-header p{margin:0}.flux-home-header button{background:#176baf;color:#fff;border:0;border-radius:9px;padding:12px 16px;font-weight:700;cursor:pointer}@media(max-width:600px){.flux-home-header{align-items:stretch;flex-direction:column}.flux-home-header button{width:100%}}';document.head.append(style);
 // Remove obsolete stacked drawers, while preserving their content.
 for(const details of main.querySelectorAll('.flux-drawer'))details.remove();
 activate('automations');
 window.addEventListener('flux:automation-opened',()=>activate('editor'));
 const inspector=document.getElementById('inspector-panel');
 const libraryPanel=document.getElementById('library-panel');
 // A closed sidebar is available through the existing toolbar toggle.
 if(libraryPanel)libraryPanel.classList.add('flux-library-compact');
 if(inspector)inspector.classList.add('flux-inspector-context');
})();
