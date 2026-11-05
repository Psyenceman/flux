/* TEST-only: side block drawer confined to Editor; webhook controls in Automations. */
(()=>{
 const shell=document.getElementById('canvas-shell');
 const main=shell?.querySelector(':scope > main');
 const library=document.getElementById('library-panel');
 const cloud=document.getElementById('canvas-cloud');
 const automations=document.getElementById('flux-automation-library');
 const tabs=main?.querySelector('.flux-mode-tabs');
 const editor=main?.querySelector('.flux-main-view');
 if(!main||!library||!cloud||!automations||!tabs||!editor)return;
 const drawer=document.createElement('aside');
 drawer.id='flux-block-drawer';
 drawer.setAttribute('aria-label','Block library');
 drawer.append(library);
 main.insertBefore(drawer,editor);
 const toggle=document.getElementById('toggle-library');
 const tabButtons=[...tabs.querySelectorAll('button')];
 let editorOpen=true;
 const current=()=>tabButtons.find(b=>b.getAttribute('aria-current')==='true')?.textContent?.trim()||'Editor';
 function sync(){
  const mode=current();
  drawer.hidden=mode!=='Editor'||!editorOpen;
  cloud.hidden=mode!=='Automations';
  if(toggle){
   toggle.hidden=mode!=='Editor';
   toggle.textContent=editorOpen?'Hide blocks':'Show blocks';
   toggle.setAttribute('aria-expanded',String(mode==='Editor'&&editorOpen));
  }
 }
 if(toggle)toggle.addEventListener('click',event=>{event.stopImmediatePropagation();editorOpen=!editorOpen;sync();},true);
 const settings=cloud.closest('.flux-settings');
 if(settings)settings.open=false;
 automations.append(cloud);
 for(const button of tabButtons)button.addEventListener('click',()=>queueMicrotask(sync));
 sync();
})();