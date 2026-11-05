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
 const tabs=[['editor','Editor'],['automations','Automations'],['assistant','Assistant'],['logs','History']];
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
 if(workspaceActions){workspaceActions.append(options);options.addEventListener('toggle',()=>{if(options.open)workspaceActions.querySelector('#toggle-library')?.blur();});}
 else main.insertBefore(options,actions);
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
 if(inspectorToggle)overflow.append(inspectorToggle);
 overflow.append(options);
 actions.append(overflow);
 actions.classList.add('compact-actions');
 for(const view of Object.values(views))body.append(view);
 const footer=main.querySelector('#status');
 const logsOpen=()=>activate('logs');
 window.addEventListener('flux:run-summary',logsOpen);
 function activate(id){
  for(const [key,view] of Object.entries(views))view.hidden=key!==id;
  actions.hidden=id!=='editor';navigation.hidden=id!=='editor';
  if(runner)runner.hidden=id!=='editor';
  for(const [key,button] of buttons){button.setAttribute('aria-current',String(key===id));}
  body.dataset.view=id;
 }
 // Remove obsolete stacked drawers, while preserving their content.
 for(const details of main.querySelectorAll('.flux-drawer'))details.remove();
 activate('editor');
 window.addEventListener('flux:automation-opened',()=>activate('editor'));
 const inspector=document.getElementById('inspector-panel');
 const libraryPanel=document.getElementById('library-panel');
 // A closed sidebar is available through the existing toolbar toggle.
 if(libraryPanel)libraryPanel.classList.add('flux-library-compact');
 if(inspector)inspector.classList.add('flux-inspector-context');
})();
