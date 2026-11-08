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
 document.querySelector('.flux-product-home')?.addEventListener('click',event=>{event.preventDefault();activate('automations');});
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
 const addBlock=document.createElement('button');addBlock.type='button';addBlock.id='flux-add-block';addBlock.textContent='+ Add block';addBlock.setAttribute('aria-expanded','false');
 const picker=document.createElement('dialog');picker.id='flux-block-picker';picker.setAttribute('aria-label','Choose a block');
 const pickerHeading=document.createElement('h3');pickerHeading.textContent='Add a block';
 const pickerHelp=document.createElement('p');pickerHelp.textContent='Search for a block, then select it to place it on your canvas. Some integrations are still planned.';
 const pickerSearch=document.createElement('input');pickerSearch.type='search';pickerSearch.placeholder='Search Trello, Condition, Log…';pickerSearch.setAttribute('aria-label','Search blocks');
 const pickerItems=document.createElement('div');pickerItems.className='flux-picker-items';
 const pickerClose=document.createElement('button');pickerClose.type='button';pickerClose.textContent='Close';pickerClose.addEventListener('click',()=>picker.close());
 picker.append(pickerHeading,pickerHelp,pickerSearch,pickerItems,pickerClose);document.body.append(picker);
 const refreshPicker=()=>{
  pickerItems.replaceChildren();const query=pickerSearch.value.trim().toLowerCase();
  for(const source of document.querySelectorAll('#palette button[data-type]')){
   if(query&&!source.dataset.search?.includes(query))continue;
   const item=document.createElement('button');item.type='button';item.className='flux-picker-item';
   const title=document.createElement('strong');title.textContent=source.querySelector('span:not(.integration-status)')?.textContent||source.dataset.type;
   const status=document.createElement('small');const supported={trello:'Trello · read cards / create card',filter:'Condition · executable',mapper:'Data mapping · executable',flux:'Transform · limited operations',manual:'Manual trigger · executable',webhook:'Webhook · requires setup',log:'Log · executable',telegram:'Telegram · requires bot setup',resend:'Resend · requires email setup'};const description=supported[source.dataset.type];status.textContent=description||'Planned or experimental · check before running';item.dataset.ready=description?'supported':'planned';
   item.append(title,status);item.addEventListener('click',()=>{source.click();picker.close();});pickerItems.append(item);
  }
  if(!pickerItems.children.length){const empty=document.createElement('p');empty.textContent='No matching blocks';pickerItems.append(empty);}
 };
 pickerSearch.addEventListener('input',refreshPicker);
 addBlock.addEventListener('click',()=>{refreshPicker();picker.showModal();pickerSearch.focus();});
 picker.addEventListener('close',()=>addBlock.setAttribute('aria-expanded','false'));
 actions.prepend(addBlock);
 const pickerStyle=document.createElement('style');pickerStyle.textContent='#flux-add-block{background:#176baf!important;color:#fff!important;border-radius:10px!important;font-weight:700!important}#flux-block-picker{width:min(540px,calc(100vw - 24px));max-height:85vh;border:1px solid #b9cce3;border-radius:16px;padding:22px;background:#fff;color:#17324f;box-shadow:0 18px 70px #10213a55}#flux-block-picker::backdrop{background:#0d1c30a8}#flux-block-picker h3{margin:0 0 10px}#flux-block-picker input{width:100%;padding:12px;border:1px solid #b9cce3;border-radius:8px;margin:10px 0;color:#17324f;background:#fff}#flux-block-picker .flux-picker-items{max-height:45vh;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:14px}#flux-block-picker .flux-picker-item{text-align:left;display:flex;flex-direction:column;gap:5px;padding:12px;border:1px solid #cbd9ea;border-radius:10px;background:#f6f9fd;color:#17324f;cursor:pointer}#flux-block-picker .flux-picker-item:hover{border-color:#176baf;background:#eaf3ff}#flux-block-picker small{font-size:11px;color:#566b82}';document.head.append(pickerStyle);

 // Prototype: human-readable execution overview, never infer a successful remote action.
 const overview=document.createElement('section');overview.id='flux-flow-overview';overview.setAttribute('aria-label','Workflow overview');
 const overviewTitle=document.createElement('strong');overviewTitle.textContent='Workflow overview';
 const overviewStats=document.createElement('span');overviewStats.id='flux-flow-stats';overviewStats.textContent='No blocks yet';
 const overviewHelp=document.createElement('span');overviewHelp.className='flux-flow-help';overviewHelp.textContent='Select a block to configure · Connect output to input';
 overview.append(overviewTitle,overviewStats,overviewHelp);
 main.insertBefore(overview,navigation);
 const updateOverview=()=>{
  const nodes=document.querySelectorAll('#nodes .node');
  const links=document.querySelectorAll('#edges path');
  const completed=document.querySelectorAll('#nodes .node.flux-run-completed').length;
  const failed=document.querySelectorAll('#nodes .node.flux-run-error,#nodes .node.flux-run-failed').length;
  overviewStats.textContent=nodes.length+' block'+(nodes.length===1?'':'s')+' · '+links.length+' connection'+(links.length===1?'':'s')+(completed?' · '+completed+' completed':'')+(failed?' · '+failed+' failed':'');
 };
 const nodesContainer=document.getElementById('nodes'),edgesContainer=document.getElementById('edges');
 if(nodesContainer){const observer=new MutationObserver(updateOverview);observer.observe(nodesContainer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
 if(edgesContainer){const observer=new MutationObserver(updateOverview);observer.observe(edgesContainer,{childList:true,subtree:true});}
 updateOverview();
 const shortcuts=document.createElement('span');shortcuts.className='flux-shortcut-hint';shortcuts.textContent='Tip: press / to find a block';
 overview.append(shortcuts);
 document.addEventListener('keydown',event=>{
  if(event.key!=='/'||event.metaKey||event.ctrlKey||event.altKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
  if(body.dataset.view!=='editor'||picker.open)return;
  event.preventDefault();addBlock.click();
 });
 const footer=main.querySelector('#status');
 // Running a test should not unexpectedly switch away from the editor.
 function activate(id){
  for(const [key,view] of Object.entries(views)){view.hidden=key!==id;view.style.display=key===id?'':'none';}
  actions.hidden=id!=='editor';navigation.hidden=id!=='editor';overview.hidden=id!=='editor';
  if(runner)runner.hidden=id!=='editor';
  for(const [key,button] of buttons){button.setAttribute('aria-current',String(key===id));}
  body.dataset.view=id;
  if(id==='editor')window.dispatchEvent(new Event('resize'));
 }
 // Keep cloud/webhook administration out of the main automation dashboard.
 const technical=document.createElement('details');technical.className='flux-technical';
 // Remove the old cloud panel from its original settings wrapper before moving it.
 if(options.contains(cloud))options.removeChild(cloud);
 const technicalTitle=document.createElement('summary');technicalTitle.textContent='Advanced settings · Cloud and webhooks';technical.append(technicalTitle,cloud);library.append(technical);
 const homeHeader=document.createElement('div');homeHeader.className='flux-home-header';
 const homeIntro=document.createElement('p');homeIntro.textContent='Create and manage automations. Open one to edit its workflow.';
 const start=document.createElement('button');start.type='button';start.className='primary';start.textContent='+ Create automation';
 start.addEventListener('click',()=>{window.dispatchEvent(new Event('flux:guided-blank'));activate('editor');});
 homeHeader.append(homeIntro,start);library.prepend(homeHeader);
 const hero=document.createElement('section');hero.className='flux-prototype-hero';
 const eyebrow=document.createElement('span');eyebrow.className='flux-hero-eyebrow';eyebrow.textContent='YOUR AUTOMATIONS · TEST';
 const heroTitle=document.createElement('h3');heroTitle.textContent='Build something that works.';
 const heroDescription=document.createElement('p');heroDescription.textContent='Connect your tools, design each step and follow what happens. Start simple. Grow without limits.';
 const heroActions=document.createElement('div');heroActions.className='flux-hero-actions';
 const heroCreate=document.createElement('button');heroCreate.type='button';heroCreate.textContent='+ New automation';heroCreate.addEventListener('click',()=>start.click());
 const heroEditor=document.createElement('button');heroEditor.type='button';heroEditor.textContent='Open canvas';heroEditor.addEventListener('click',()=>activate('editor'));
 heroActions.append(heroCreate,heroEditor);hero.append(eyebrow,heroTitle,heroDescription,heroActions);
 library.insertBefore(hero,homeHeader);
 const quickLinks=document.createElement('div');quickLinks.className='flux-quick-links';
 for(const [heading,description,fn] of [
  ['Visual builder','Arrange as many blocks and branches as you need.',()=>activate('editor')],
  ['Execution history','Inspect completed runs and errors.',()=>activate('logs')],
  ['Connections','Connect your apps once and reuse them in every automation.',()=>{[...document.querySelectorAll('.workspace-bar button')].find(button=>button.textContent==='My connections')?.click();}]
 ]){const button=document.createElement('button');button.type='button';const title=document.createElement('strong');title.textContent=heading;const sub=document.createElement('small');sub.textContent=description;button.append(title,sub);button.addEventListener('click',fn);quickLinks.append(button);}
 library.insertBefore(quickLinks,technical);
 const creditNote=document.createElement('p');creditNote.className='flux-credit-note';creditNote.textContent='FluxCoins · Usage is recorded by the execution service. Purchases are not enabled in TEST.';library.insertBefore(creditNote,technical);
 const style=document.createElement('style');style.textContent='.flux-guide{padding:18px;margin:10px 0 20px;border:1px solid #4a6587;border-radius:14px;background:#f7faff;color:#18314d}.flux-guide h3,.flux-guide label{color:#18314d}.flux-guide p{color:#52657d}.flux-guide[hidden]{display:none}.flux-guide label{display:flex;flex-direction:column;gap:8px;margin:14px 0;font-weight:650}.flux-guide select{width:100%;padding:12px;border:1px solid #bfd0e4;border-radius:8px;background:#fff;color:#18314d}.flux-guide-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.flux-guide-actions button{padding:11px 16px;border-radius:8px;cursor:pointer}.flux-guide-actions .primary{background:#176baf;color:white;border:0}.flux-technical{margin-top:24px;border:1px solid #d4dfed;border-radius:10px;padding:12px;background:#f7faff;color:#18314d}.flux-technical>summary{cursor:pointer;font-weight:650;padding:5px}.flux-technical:not([open]) #canvas-cloud{display:none}.flux-technical + #canvas-cloud{display:none}.flux-home-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 0 18px}.flux-home-header p{margin:0}.flux-home-header button{background:#176baf;color:#fff;border:0;border-radius:9px;padding:12px 16px;font-weight:700;cursor:pointer}@media(max-width:600px){.flux-home-header{align-items:stretch;flex-direction:column}.flux-home-header button{width:100%}}';document.head.append(style);
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
