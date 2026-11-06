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
/* TEST: searchable, categorized Add block dialog. Reuse original palette handlers. */
(()=>{
 const stage=document.getElementById('flux-editor-stage');
 const drawer=document.getElementById('flux-block-drawer');
 const palette=document.getElementById('palette');
 const main=document.querySelector('#canvas-shell > main');
 if(!palette||!main)return;
 document.getElementById('toggle-library')?.remove();
 const style=document.createElement('style');
 style.textContent=`
 #flux-editor-stage{display:block!important;min-width:0}
 #flux-block-drawer{display:none!important}
 #flux-editor-stage{position:relative}
 #flux-first-block{position:absolute;left:50%;top:35%;transform:translate(-50%,-50%);border:2px dashed #7da8c7;border-radius:16px;background:#fff;color:#163956;padding:25px 35px;font-weight:750;font-size:18px;cursor:pointer;z-index:3;box-shadow:0 6px 28px #133d531b}
 #flux-first-block[hidden]{display:none!important}
 #flux-add-block{border:0;border-radius:9px;background:#1674b9;color:#fff;padding:10px 16px;font-weight:700;cursor:pointer}
 #flux-block-dialog{border:1px solid #66819e;border-radius:16px;background:#f7fafd;color:#152943;width:min(650px,calc(100vw - 24px));max-height:85dvh;padding:20px;box-shadow:0 20px 80px #0008}
 #flux-block-dialog::backdrop{background:#071525a8}
 #flux-block-dialog input{width:100%;padding:13px;border:1px solid #94a8bc;border-radius:9px;margin:12px 0;background:white;color:#13263e}
 #flux-block-categories{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 14px}
 #flux-block-categories button{border:1px solid #a1b3c7;background:white;border-radius:20px;padding:8px 11px;cursor:pointer;color:#20354c}
 #flux-block-categories button[aria-pressed=true]{background:#173452;color:white}
 #flux-block-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;max-height:45dvh;overflow:auto}
 #flux-block-results button{display:flex;align-items:center;gap:10px;text-align:left;background:white;border:1px solid #c6d2df;border-radius:10px;padding:12px;color:#18304a;cursor:pointer}
 #flux-block-results button:hover{border-color:#1674b9;background:#eaf4ff}
 #flux-block-results .palette-icon{font-size:23px}
 #flux-block-results small{display:none}
 @media(max-width:550px){#flux-block-dialog{padding:14px}#flux-block-results{grid-template-columns:1fr}}
 `;
 document.head.append(style);
 const bar=document.getElementById('save')?.parentElement;
 const trigger=document.createElement('button');trigger.type='button';trigger.id='flux-add-block';trigger.textContent='+ Add block';
 if(bar)bar.prepend(trigger);else main.prepend(trigger);
 const dialog=document.createElement('dialog');dialog.id='flux-block-dialog';dialog.setAttribute('aria-label','Add block');
 dialog.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 style="margin:0;color:#152943">Add a block</h2><button type="button" id="flux-block-close" style="border:0;background:transparent;font-size:26px;cursor:pointer" aria-label="Close">×</button></div><input type="search" id="flux-block-query" placeholder="Search apps or actions…" aria-label="Search blocks"><div id="flux-block-categories" role="group" aria-label="Block categories"></div><div id="flux-block-results"></div><p id="flux-block-empty" role="status" style="color:#50657c"></p>';
 document.body.append(dialog);
 const search=dialog.querySelector('#flux-block-query'),results=dialog.querySelector('#flux-block-results'),categories=dialog.querySelector('#flux-block-categories'),empty=dialog.querySelector('#flux-block-empty');
 const groups=['All','Triggers','Logic','Communication','Data','Apps'];
 const classify=type=>{
  if(['manual','schedule','webhook'].includes(type))return 'Triggers';
  if(['router','mapper','loop','filter','condition','delay','merge','log','flux'].includes(type))return 'Logic';
  if(['slack','email','whatsapp','telegram','discord','resend'].includes(type))return 'Communication';
  if(['airtable','sheets','database','supabase','http'].includes(type))return 'Data';
  return 'Apps';
 };
 let active='All';
 for(const name of groups){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{active=name;render();});categories.append(b);}
 function render(){
  results.replaceChildren();let count=0;
  for(const b of palette.querySelectorAll('button[data-search]')){
   const type=b.querySelector('span:not(.palette-icon)')?.textContent?.trim().toLowerCase().replace(/\\s+/g,'-')||'';
   const category=classify(type);
   if(active!=='All'&&active!==category)continue;
   if(!b.dataset.search.includes(search.value.trim().toLowerCase()))continue;
   const item=document.createElement('button');item.type='button';
   const icon=b.querySelector('.palette-icon');if(icon)item.append(icon.cloneNode(true));
   const label=document.createElement('span');label.textContent=b.querySelector('span:not(.palette-icon)')?.textContent||type;item.append(label);
   item.addEventListener('click',()=>{b.click();dialog.close();});results.append(item);count++;
  }
  for(const b of categories.children)b.setAttribute('aria-pressed',String(b.textContent===active));
  empty.textContent=count?'': 'No matching blocks.';
 }
 const emptyButton=document.createElement('button');emptyButton.type='button';emptyButton.id='flux-first-block';emptyButton.textContent='+ Add your first block';document.getElementById('flux-editor-stage')?.append(emptyButton);
 emptyButton.addEventListener('click',()=>trigger.click());
 const updateEmpty=()=>{const count=document.querySelectorAll('#nodes .node').length;emptyButton.hidden=count>0;};
 window.addEventListener('flux:canvas-changed',updateEmpty);window.addEventListener('flux:automation-opened',updateEmpty);updateEmpty();
  trigger.addEventListener('click',()=>{active='All';search.value='';render();dialog.showModal();search.focus();});
 dialog.querySelector('#flux-block-close').addEventListener('click',()=>dialog.close());
 search.addEventListener('input',render);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();
