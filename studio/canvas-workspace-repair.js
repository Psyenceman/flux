/* TEST-only workspace repair: make block library and webhook controls discoverable. */
(()=>{
 const shell=document.getElementById('canvas-shell');
 const main=shell?.querySelector(':scope > main');
 const library=document.getElementById('library-panel');
 const cloud=document.getElementById('canvas-cloud');
 const automations=document.getElementById('flux-automation-library');
 const tabs=main?.querySelector('.flux-mode-tabs');
 if(!main||!library||!cloud||!automations||!tabs)return;
 // Move the library into the editor area, not after the entire workspace.
 const editor=main.querySelector('.flux-main-view');
 const blockDrawer=document.createElement('section');
 blockDrawer.id='flux-block-drawer';
 blockDrawer.setAttribute('aria-label','Block library');
 blockDrawer.append(library);
 main.insertBefore(blockDrawer,editor);
 const toggle=document.getElementById('toggle-library');
 const update=()=>{const hidden=blockDrawer.hidden; if(toggle){toggle.textContent=hidden?'Show blocks':'Hide blocks';toggle.setAttribute('aria-expanded',String(!hidden));}};
 blockDrawer.hidden=false;
 if(toggle){toggle.addEventListener('click',e=>{e.stopImmediatePropagation();blockDrawer.hidden=!blockDrawer.hidden;update();},true);}
 update();
 // Cloud controls, including webhook management, belong to Automations.
 const settings=cloud.closest('.flux-settings');
 if(settings)settings.open=false;
 automations.append(cloud);
 cloud.hidden=false;
 const tabButtons=[...tabs.querySelectorAll('button')];
 const showCloud=()=>{const active=tabButtons.find(b=>b.getAttribute('aria-current')==='true');cloud.hidden=active?.textContent?.trim()!=='Automations';blockDrawer.hidden=active?.textContent?.trim()!=='Editor';update();};
 for(const b of tabButtons)b.addEventListener('click',()=>queueMicrotask(showCloud));
 showCloud();
})();