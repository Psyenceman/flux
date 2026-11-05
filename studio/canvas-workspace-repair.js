/* TEST: structural editor layout, no floating overlays. */
(()=>{
 const main=document.querySelector('#canvas-shell > main');
 const library=document.getElementById('library-panel');
 const viewport=document.getElementById('viewport');
 const cloud=document.getElementById('canvas-cloud');
 const automations=document.getElementById('flux-automation-library');
 const tabs=main?.querySelector('.flux-mode-tabs');
 const body=main?.querySelector('.flux-main-view');
 if(!main||!library||!viewport||!cloud||!automations||!tabs||!body)return;
 const stage=document.createElement('div');
 stage.id='flux-editor-stage';
 body.insertBefore(stage,viewport);
 const drawer=document.createElement('aside');
 drawer.id='flux-block-drawer';
 drawer.setAttribute('aria-label','Block library');
 drawer.append(library);
 stage.append(drawer,viewport);
 const inspector=document.getElementById('inspector-panel');
 const shell=document.getElementById('canvas-shell');
 const inspectorToggle=document.getElementById('toggle-inspector');
 if(inspector){
  // Close the actual floating panel, not the toolbar toggle (which can reopen it).
  const closeButtons=[...inspector.querySelectorAll('.inspector-close')];
  const close=closeButtons[0]||document.createElement('button');
  close.type='button';close.className='inspector-close';close.textContent='× Close';
  close.setAttribute('aria-label','Close Inspector');
  close.style.cssText='float:right;padding:7px 11px;border-radius:8px;border:1px solid #8098b8;background:#263e5d;color:#fff;cursor:pointer';
  if(!close.isConnected)inspector.prepend(close);
  for(const extra of closeButtons.slice(1))extra.remove();
  close.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   inspector.classList.remove('context-open');
   shell?.classList.add('inspector-closed');
   inspectorToggle?.setAttribute('aria-expanded','false');
   if(inspectorToggle)inspectorToggle.textContent='Show inspector';
  },true);
 }
 const toggle=document.getElementById('toggle-library');
 const buttons=[...tabs.querySelectorAll('button')];
 let open=true;
 const mode=()=>body.dataset.view==='editor'?'Editor':body.dataset.view==='automations'?'Automations':body.dataset.view==='assistant'?'Assistant':body.dataset.view==='logs'?'History':(buttons.find(b=>b.getAttribute('aria-current')==='true')?.textContent?.trim()||'Editor');
 const sync=()=>{
  const editor=mode()==='Editor';
  stage.hidden=!editor;
  drawer.hidden=!editor||!open;
  cloud.hidden=mode()!=='Automations';
  stage.classList.toggle('blocks-closed',!open);
  if(toggle){toggle.hidden=!editor;toggle.textContent=open?'Hide blocks':'Show blocks';toggle.setAttribute('aria-expanded',String(editor&&open));}
 };
 if(toggle)toggle.addEventListener('click',e=>{e.stopImmediatePropagation();open=!open;sync();},true);
 const settings=cloud.closest('.flux-settings');
 if(settings)settings.open=false;
 automations.append(cloud);
 for(const b of buttons)b.addEventListener('click',()=>queueMicrotask(sync));
 // Opening a saved automation switches tabs programmatically, without a tab click.
 window.addEventListener('flux:automation-opened',()=>{queueMicrotask(sync);requestAnimationFrame(sync);});
 // Keep the stage in sync with programmatic view changes and restored workflows.
 new MutationObserver(()=>queueMicrotask(sync)).observe(body,{attributes:true,attributeFilter:['data-view']});
 sync();
})();