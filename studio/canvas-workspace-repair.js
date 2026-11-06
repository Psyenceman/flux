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
 let active='All';let addAfter=null;
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
   item.addEventListener('click',()=>{if(addAfter){window.dispatchEvent(new CustomEvent('flux:append-connected-block',{detail:{from:addAfter,type:b.dataset.type||type}}));}else{b.click();}addAfter=null;dialog.close();});results.append(item);count++;
  }
  for(const b of categories.children)b.setAttribute('aria-pressed',String(b.textContent===active));
  empty.textContent=count?'': 'No matching blocks.';
 }
 const emptyButton=document.createElement('button');emptyButton.type='button';emptyButton.id='flux-first-block';emptyButton.textContent='+ Add your first block';document.getElementById('flux-editor-stage')?.append(emptyButton);
 emptyButton.addEventListener('click',()=>trigger.click());
 const updateEmpty=()=>{const count=document.querySelectorAll('#nodes .node').length;emptyButton.hidden=count>0;};
 window.addEventListener('flux:canvas-changed',updateEmpty);window.addEventListener('flux:automation-opened',updateEmpty);updateEmpty();
  trigger.addEventListener('click',()=>{addAfter=null;active='All';search.value='';render();dialog.showModal();search.focus();});
 window.addEventListener('flux:add-next-block',event=>{addAfter=event.detail?.from||null;active='All';search.value='';render();dialog.querySelector('h2').textContent='Choose next block';dialog.showModal();search.focus();});
 dialog.addEventListener('close',()=>{addAfter=null;dialog.querySelector('h2').textContent='Add a block';});
 dialog.querySelector('#flux-block-close').addEventListener('click',()=>dialog.close());
 search.addEventListener('input',render);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();

/* TEST: contextual Inspector in a real accessible modal. No graph state changes. */
(()=>{
 const inspector=document.getElementById('inspector-panel');
 const nodes=document.getElementById('nodes');
 if(!inspector||!nodes)return;
 const modal=document.createElement('dialog');modal.id='flux-inspector-dialog';modal.setAttribute('aria-label','Configure block');
 document.body.append(modal);modal.append(inspector);
 const style=document.createElement('style');
 style.textContent=`
 #flux-inspector-dialog{position:fixed!important;inset:0!important;margin:auto!important;width:min(510px,calc(100vw - 24px))!important;max-width:510px!important;max-height:min(85dvh,820px)!important;overflow:auto!important;padding:0!important;border:1px solid #d4dce7!important;border-radius:18px!important;background:#fff!important;color:#172b45!important;box-shadow:0 20px 90px #061a354f!important;z-index:9995!important}
 #flux-inspector-dialog::backdrop{background:rgba(7,20,35,.52)}
 #flux-inspector-dialog #inspector-panel{display:block!important;position:static!important;inset:auto!important;transform:none!important;visibility:visible!important;opacity:1!important;width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;min-height:0!important;overflow:visible!important;padding:24px!important;margin:0!important;border:0!important;box-shadow:none!important;background:#fff!important;color:#172b45!important}
 #flux-inspector-dialog #inspector-panel h2{font-size:20px!important;color:#172b45!important}
 #flux-inspector-dialog #inspector-panel p,#flux-inspector-dialog #selection{color:#566a80!important}
 #flux-inspector-dialog #inspector-panel label{color:#233c55!important}
 #flux-inspector-dialog #inspector-panel input,#flux-inspector-dialog #inspector-panel select,#flux-inspector-dialog #inspector-panel textarea{max-width:100%!important}
 #flux-inspector-dialog #inspector-panel .inspector-close{position:sticky;top:0;float:right}
 #flux-inspector-dialog #workflow-graph-tools{display:none!important}
 #flux-inspector-dialog #inspector-panel .inspector-tabs button{font-size:12px}
 @media(max-width:600px){#flux-inspector-dialog #inspector-panel{padding:16px!important}}
 `;
 document.head.append(style);
 const open=()=>{if(!modal.open)modal.showModal();};
 window.addEventListener('flux:open-block-config',open);
 nodes.addEventListener('click',event=>{
  if(!event.target.closest('.node')||event.target.closest('button,.port,.node-delete,.flux-node-resize'))return;
  queueMicrotask(open);
 });
 nodes.addEventListener('dblclick',event=>{
  if(!event.target.closest('.node')||event.target.closest('button,.port'))return;
  queueMicrotask(open);
 });
 modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('.inspector-close'))modal.close();});
 window.addEventListener('flux:automation-opened',()=>{if(modal.open)modal.close();});
})();

/* TEST: simple horizontal blocks, native branding and explicit next-block action. */
(()=>{
 const css=document.createElement('style');
 css.textContent=`
 #nodes .node{width:112px!important;height:112px!important;min-height:112px!important;border-radius:14px!important;border:1.5px solid #b3c9de!important;background:#fff!important;box-shadow:0 4px 18px #17395416!important;padding:0!important;overflow:visible!important}
 #nodes .node.selected{border-color:#1274b3!important;box-shadow:0 0 0 3px #1679bd25!important}
 #nodes .node .node-head{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:10px!important;width:100%!important;height:100%!important;padding:8px!important;background:transparent!important;border:0!important;border-radius:14px!important}
 #nodes .node .node-head .block-icon{display:flex!important;justify-content:center!important;align-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;background:transparent!important;color:#245d94!important;font-size:29px!important;border:0!important;border-radius:0!important;box-shadow:none!important;pointer-events:none!important;user-select:none!important}
 #nodes .node .node-head .block-icon img{width:35px!important;height:35px!important;max-width:35px!important;object-fit:contain!important;pointer-events:none!important;user-select:none!important;-webkit-user-drag:none!important}
 #nodes .node .node-head span:not(.block-icon){position:static!important;display:block!important;font-size:12px!important;line-height:1.2!important;font-weight:700!important;color:#1b354d!important;max-width:105px!important;white-space:normal!important;text-align:center!important}
 #nodes .node .node-meta,#nodes .node .flux-node-resize{display:none!important}
 #nodes .node .port{top:39px!important}
 #nodes .node .node-delete{opacity:0!important;right:-9px!important;top:-9px!important}
 #nodes .node:hover .node-delete,#nodes .node:focus-within .node-delete{opacity:1!important}
 #nodes .node .flux-next-plus{position:absolute!important;right:-49px!important;top:34px!important;width:30px!important;height:30px!important;display:grid!important;place-items:center!important;border:1.5px solid #1394c8!important;border-radius:50%!important;background:#fff!important;color:#0086b7!important;font-size:21px!important;font-weight:700!important;cursor:pointer!important;z-index:5!important}
 #nodes .node .flux-next-plus:hover{background:#e5f4fd!important}
 `;
 document.head.append(css);
})();
