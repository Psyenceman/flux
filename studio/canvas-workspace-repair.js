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
 const toggle=document.getElementById('toggle-library');
 const buttons=[...tabs.querySelectorAll('button')];
 let open=true;
 const mode=()=>buttons.find(b=>b.getAttribute('aria-current')==='true')?.textContent?.trim()||'Editor';
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
 sync();
})();