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

/* TEST: single-click compact module editor, inspired by simple automation dialogs. */
(()=>{
 const modal=document.createElement('dialog');modal.id='flux-module-config';modal.setAttribute('aria-label','Configure Flux module');
 document.body.append(modal);
 const css=document.createElement('style');
 css.textContent=`
 #flux-module-config{position:fixed!important;inset:auto!important;margin:0!important;width:min(408px,calc(100vw - 20px))!important;max-height:min(76dvh,650px)!important;overflow:auto!important;border:1px solid #d6e0ed!important;border-radius:15px!important;background:#fff!important;color:#142b45!important;padding:0!important;box-shadow:0 18px 55px #0a243d44!important;z-index:9999!important}
 #flux-module-config::backdrop{background:rgba(14,30,48,.17)!important}
 #flux-module-config{left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important}
 #flux-module-config[open]{display:block!important}
 #canvas-shell > #inspector-panel,#canvas-shell > #inspector-panel.context-open{display:none!important;visibility:hidden!important;pointer-events:none!important}
 #flux-module-config:not([open]){display:none!important}
 #flux-module-config .fm-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 17px;border-bottom:1px solid #e1e8ef}
 #flux-module-config h2{color:#19344f;font-size:18px;line-height:1.2;margin:0}
 #flux-module-config .fm-close{background:transparent;border:0;font-size:24px;color:#506782;cursor:pointer;padding:0 5px}
 #flux-module-config .fm-body{padding:16px 17px}
 #flux-module-config .fm-row{display:block;margin:0 0 14px;font-size:13px;font-weight:650;color:#344d66}
 #flux-module-config .fm-row select,#flux-module-config .fm-row input,#flux-module-config .fm-row textarea{margin-top:7px;display:block;width:100%;min-height:42px;box-sizing:border-box;border:1px solid #c0cddd;background:white;color:#203750;border-radius:9px;padding:9px 11px;font:14px system-ui,sans-serif}
 #flux-module-config .fm-row input:focus,#flux-module-config .fm-row select:focus{outline:2px solid #569dcc;outline-offset:1px}
 #flux-module-config .fm-help{font-size:12px;line-height:1.5;color:#627890;margin:0 0 14px}
 #flux-module-config .fm-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 17px;border-top:1px solid #e5ebf1}
 #flux-module-config .fm-actions button{border:1px solid #c5d2df;border-radius:8px;padding:9px 15px;background:#f6f8fb;color:#203750;cursor:pointer;font-weight:650}
 #flux-module-config .fm-actions button.fm-primary{background:#166fa6;color:#fff;border-color:#166fa6}
 #flux-module-config details{border-top:1px solid #e8edf3;padding-top:11px;font-size:12px;color:#577085}
 #flux-module-config summary{cursor:pointer}
 #flux-module-config .fm-connect{background:#f6f8fb;border:1px solid #e2e8ef;border-radius:10px;padding:11px 12px;margin:10px 0 16px;display:flex;flex-direction:column;gap:5px}
 #flux-module-config .fm-connect strong{font-size:12px;color:#294663}
 #flux-module-config .fm-connect small{color:#5c7188;line-height:1.45}
 #flux-module-config .fm-connect button{align-self:flex-start;padding:7px 9px;border:1px solid #d6e0e8;border-radius:7px;background:#eaeef2;color:#7d8c9f;margin-top:6px}
 #flux-module-config .fm-connect .flux-trello-connect{background:linear-gradient(115deg,#1767b4,#168ac9);color:#fff;border:1px solid #168ac9;border-radius:9px;padding:11px 18px;font-weight:700;cursor:pointer;box-shadow:0 3px 9px #1767b430;transition:box-shadow .22s ease,transform .22s ease,filter .22s ease}
 #flux-module-config .fm-connect .flux-trello-connect:hover:not(:disabled),#flux-module-config .fm-connect .flux-trello-connect:focus-visible{filter:brightness(1.18);box-shadow:0 0 0 3px #38bdf833,0 0 24px #168ac980;transform:translateY(-2px);outline:2px solid #38bdf8;outline-offset:3px}
 #flux-module-config .fm-connect .flux-trello-connect[data-state=connected]{background:linear-gradient(115deg,#174e87,#5467cf);border-color:#7787e1;box-shadow:0 0 0 2px #7787e126}
 #flux-module-config .fm-connect .flux-trello-connect:disabled{cursor:wait;opacity:.75}
 @media(prefers-reduced-motion:reduce){#flux-module-config .fm-connect .flux-trello-connect{transition:none;transform:none!important}}
 @media(max-width:600px){#flux-module-config{width:calc(100vw - 24px)!important;max-height:82dvh!important}}
 `;
 document.head.append(css);
 // The retired sidebar must never compete with this dialog.
 const legacy=document.getElementById('inspector-panel');
 if(legacy){legacy.classList.remove('context-open');legacy.setAttribute('aria-hidden','true');legacy.style.setProperty('display','none','important');legacy.style.setProperty('pointer-events','none','important');}
 const legacyToggle=document.getElementById('toggle-inspector');
 if(legacyToggle){legacyToggle.hidden=true;legacyToggle.style.setProperty('display','none','important');}
 const hideLegacy=()=>{legacy?.classList.remove('context-open');legacy?.style.setProperty('display','none','important');};
 const shell=document.getElementById('canvas-shell');
 shell?.addEventListener('click',hideLegacy);
 const labelize=value=>String(value).replace(/[_-]/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
 const field=(parent,label,type,value,options)=>{
  const row=document.createElement('label');row.className='fm-row';row.textContent=label;
  const el=document.createElement(options?'select':'input');
  if(options){for(const [v,text] of options)el.add(new Option(text,v));}
  else el.type=type||'text';
  el.value=value??'';
  row.append(el);parent.append(row);return {row,el};
 };

 // Action-aware configuration schemas. These are UI forms, not account integrations.
 const f=(key,label,type='text',required=false)=>({key,label,type,required});
 const schemas={
 manual:{start:[]},
 schedule:{},
 webhook:{receive:[f('event','Event label')]},
 trello:{read_list:[f('list','List ID','text',true)],create_card:[f('list','Destination list ID','text',true),f('title','Card title','text',true),f('description','Card description','textarea')]},
 airtable:{find_records:[f('base','Base ID','text',true),f('table','Table','text',true),f('filter','Search filter')],create_record:[f('base','Base ID','text',true),f('table','Table','text',true),f('body','Fields (JSON)','textarea',true)],update_record:[f('base','Base ID','text',true),f('table','Table','text',true),f('recordId','Record ID','text',true),f('body','Changes (JSON)','textarea',true)]},
 miro:{create_card:[f('board','Board ID','text',true),f('title','Card title','text',true),f('message','Description','textarea')],find_items:[f('board','Board ID','text',true),f('query','Search')],update_item:[f('board','Board ID','text',true),f('itemId','Item ID','text',true),f('title','New title')]},
 sheets:{read_rows:[f('spreadsheet','Spreadsheet ID','text',true),f('range','Range','text',true)],append_row:[f('spreadsheet','Spreadsheet ID','text',true),f('range','Range','text',true),f('body','Row (JSON)','textarea',true)]},
 drive:{find_file:[f('query','File name / query','text',true),f('folder','Folder ID')],create_file:[f('title','File name','text',true),f('folder','Folder ID')]},
 github:{list_issues:[f('repository','Repository (owner/name)','text',true)],create_issue:[f('repository','Repository (owner/name)','text',true),f('title','Issue title','text',true),f('message','Description','textarea')]},
 wordpress:{read_posts:[f('site','Website URL','url',true)],create_post:[f('site','Website URL','url',true),f('title','Post title','text',true),f('message','Post content','textarea',true)]},
 filter:{always:[],approved:[f('field','Approval field')],rejected:[f('field','Approval field')],'status=approved':[f('field','Status field')]},
 flux:{pass:[],pick:[f('mapping','Field to select','text',true)],count:[f('mapping','Items field')]},
 mapper:{map:[f('mapping','Input field','text',true),f('target','Output field','text',true)]},
 router:{branch:[f('route','Branch rule','text',true)]},
 loop:{iterate:[f('items','Collection field','text',true)]},
 merge:{combine:[]},log:{record:[f('message','Log message','textarea')]},
 delay:{wait:[f('duration','Duration','number',true),f('unit','Unit')]},
 http:{post:[f('url','Destination URL','url',true),f('body','JSON body','textarea')]},
 email:{send:[f('recipient','To','email',true),f('subject','Subject','text',true),f('message','Body','textarea',true)]},
 resend:{send_email:[f('recipient','To','email',true),f('subject','Subject','text',true),f('message','Body','textarea',true)]},
 slack:{send:[f('channel','Channel','text',true),f('message','Message','textarea',true)]},
 database:{select:[f('table','Table','text',true),f('filter','Filter')],insert:[f('table','Table','text',true),f('body','Row JSON','textarea',true)],update:[f('table','Table','text',true),f('filter','Filter','text',true),f('body','Changes JSON','textarea',true)],delete:[f('table','Table','text',true),f('filter','Filter','text',true)]},
 whatsapp:{send_template:[f('recipient','Phone number','tel',true),f('template','Approved template','text',true)],receive_message:[]},
 telegram:{send_message:[f('chatId','Chat ID','text',true),f('message','Message','textarea',true)],receive_update:[]},
 discord:{send_message:[f('channel','Channel ID','text',true),f('message','Message','textarea',true)]},
 notion:{search_pages:[f('query','Search query','text',true)],create_page:[f('databaseId','Database ID','text',true),f('title','Page title','text',true)]},
 calendar:{list_events:[f('calendarId','Calendar ID','text',true)],create_event:[f('calendarId','Calendar ID','text',true),f('title','Event title','text',true),f('start','Start','datetime-local',true),f('end','End','datetime-local',true)]},
 stripe:{payment_event:[f('event','Event name')],create_checkout:[f('priceId','Price ID','text',true)]},
 hubspot:{search_contacts:[f('property','Search field','text',true),f('value','Search value','text',true)],create_contact:[f('body','Contact JSON','textarea',true)]},
 shopify:{order_event:[f('store','Store domain','text',true)],list_orders:[f('store','Store domain','text',true),f('orderStatus','Status')]},
 openai:{generate_text:[f('model','Model'),f('prompt','Prompt','textarea',true)],classify_text:[f('prompt','Text','textarea',true),f('categories','Categories','text',true)]},
 supabase:{select_rows:[f('table','Table','text',true),f('filter','Filter')],insert_row:[f('table','Table','text',true),f('body','Row JSON','textarea',true)]},
 cloudflare:{trigger_worker:[f('worker','Worker name','text',true),f('event','Event')] }
 };
 const actions={
 manual:[['start','Start manually']],trello:[['read_list','Read list cards'],['create_card','Create card (TEST preview)']],airtable:[['find_records','Find records'],['create_record','Create record'],['update_record','Update record']],miro:[['create_card','Create card'],['find_items','Find items'],['update_item','Update item']],
 filter:[['always','Always'],['compare','Compare incoming data'],['approved','Only approved'],['rejected','Only rejected'],['status=approved','Status approved']],
 flux:[['pass','Pass through'],['pick','Pick field'],['count','Count items']],database:[['select','Read rows'],['insert','Create row'],['update','Update row'],['delete','Delete row']],
 router:[['branch','Choose branch']],loop:[['iterate','For each item']],mapper:[['map','Map fields']],merge:[['combine','Combine']],delay:[['wait','Wait']],log:[['record','Record event']],
 http:[['post','Send POST']],webhook:[['receive','Receive event']],email:[['send','Send email']],slack:[['send','Send message']],
 sheets:[['read_rows','Read rows'],['append_row','Append row']],drive:[['find_file','Find file'],['create_file','Create file']],github:[['list_issues','List issues'],['create_issue','Create issue']],
 wordpress:[['read_posts','Read posts'],['create_post','Create post']],whatsapp:[['send_template','Send template'],['receive_message','Receive message']],telegram:[['send_message','Send message'],['receive_update','Receive update']],
 discord:[['send_message','Send message']],notion:[['search_pages','Search pages'],['create_page','Create page']],calendar:[['list_events','List events'],['create_event','Create event']],
 stripe:[['payment_event','Payment event'],['create_checkout','Create checkout']],hubspot:[['search_contacts','Find contacts'],['create_contact','Create contact']],shopify:[['order_event','Order trigger'],['list_orders','List orders']],
 openai:[['generate_text','Generate text'],['classify_text','Classify text']],resend:[['send_email','Send email']],supabase:[['select_rows','Read rows'],['insert_row','Insert row']],cloudflare:[['trigger_worker','Call Worker']]
 };
 const connectedLocal=new Set(['manual','filter','flux','merge','log']);
 const limited=new Set(['trello','http','webhook']);
 const internal=new Set(['manual','filter','flux','merge','log','delay','mapper','router','loop','schedule','webhook']);
 const close=()=>{if(modal.open)modal.close();};
 modal.addEventListener('click',event=>{if(event.target===modal)close();});
 window.addEventListener('flux:automation-opened',close);
 // Capture the interaction before canvas redraw destroys the clicked DOM element.
 const graphNodes=document.getElementById('nodes');
 let down=null;
 graphNodes?.addEventListener('pointerdown',event=>{
  const element=event.target.closest('.node');
  if(!element||event.button!==0||event.target.closest('button,.port')||event.target.closest('[role="menu"],.flux-block-menu')){down=null;return;}
  down={id:element.dataset.nodeId,x:event.clientX,y:event.clientY};
 },true);
 graphNodes?.addEventListener('pointerup',event=>{
  if(!down)return;
  const saved=down;down=null;
  if(event.button!==0||event.target.closest('button,.port,[role="menu"],.flux-block-menu'))return;
  if(Math.hypot(event.clientX-saved.x,event.clientY-saved.y)>7)return;
  queueMicrotask(()=>{if(document.querySelector('[role="menu"]:not([hidden]),.flux-block-menu:not([hidden])'))return;window.fluxOpenBlockConfig?.(saved.id);});
 },true);
 graphNodes?.addEventListener('pointercancel',()=>{down=null;},true);
 graphNodes?.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const element=event.target.closest('.node');
  if(!element||event.target.closest('button,.port'))return;
  event.preventDefault();window.fluxOpenBlockConfig?.(element.dataset.nodeId);
 },true);
 let lastOpenId=null,lastOpenAt=0;
 window.addEventListener('flux:open-block-config',event=>{
  const {node,id}=event.detail||{};if(!node||!id)return;
  const now=performance.now();if(modal.open&&lastOpenId===id&&now-lastOpenAt<500)return;lastOpenId=id;lastOpenAt=now;
  hideLegacy();
  const draft={...node.config,schedule:{...(node.config.schedule||{})}};
  modal.replaceChildren();
  const header=document.createElement('div');header.className='fm-head';
  const heading=document.createElement('h2');heading.textContent=node.label;
  const x=document.createElement('button');x.className='fm-close';x.type='button';x.textContent='×';x.setAttribute('aria-label','Close');x.addEventListener('click',close);
  header.append(heading,x);modal.append(header);
  const body=document.createElement('div');body.className='fm-body';modal.append(body);
  const help=document.createElement('p');help.className='fm-help';help.setAttribute('role','status');help.textContent='Choose an action and enter the essential information.';body.append(help);
  const validate=[];
  if(node.type==='schedule'){
   const repeat=field(body,'Repeat','',draft.schedule.frequency||'once',[['once','One time'],['daily','Every day'],['weekly','Every week']]);
   const date=field(body,'Date','date',draft.schedule.date||'');
   const time=field(body,'Time','time',draft.schedule.time||'09:00');
   const day=field(body,'Day','',draft.schedule.day||'1',[['1','Monday'],['2','Tuesday'],['3','Wednesday'],['4','Thursday'],['5','Friday'],['6','Saturday'],['0','Sunday']]);
   const tz=field(body,'Time zone','',draft.schedule.timezone||'Europe/Rome',[['Europe/Rome','Europe/Rome'],['UTC','UTC']]);
   const sync=()=>{date.row.hidden=repeat.el.value!=='once';day.row.hidden=repeat.el.value!=='weekly';};
   repeat.el.addEventListener('change',sync);sync();
   validate.push(()=>{if(!time.el.value||(repeat.el.value==='once'&&!date.el.value))return 'Choose a date and time';draft.schedule={frequency:repeat.el.value,date:date.el.value,time:time.el.value,day:day.el.value,timezone:tz.el.value};draft.operation=repeat.el.value;return '';});
  }else{
   const choices=actions[node.type]||[];
   const action=choices.length?field(body,'Action','',choices.some(c=>c[0]===draft.operation)?draft.operation:choices[0][0],choices):null;
   const inputs=document.createElement('div');body.append(inputs);
   function drawFields(){
    inputs.replaceChildren();
    const fields=schemas[node.type]?.[action?.el.value]||[];
    for(const spec of fields){
     const row=document.createElement('label');row.className='fm-row';row.textContent=spec.label+(spec.required?' *':'');
     const input=document.createElement(spec.type==='textarea'?'textarea':'input');if(spec.type!=='textarea')input.type=spec.type;
     if(spec.type==='textarea')input.rows=3;
     input.value=draft[spec.key]??'';input.placeholder=spec.label;
     input.addEventListener('input',()=>{draft[spec.key]=input.value;});
     row.append(input);inputs.append(row);
    }
   }
   if(action){draft.operation=action.el.value;action.el.addEventListener('change',()=>{draft.operation=action.el.value;drawFields();});}
   drawFields();
   if(node.type==='filter'){
    const conditionFields=document.createElement('div');conditionFields.className='fm-condition-fields';body.append(conditionFields);
    const updateConditionFields=()=>{
     conditionFields.replaceChildren();
     if(action?.el.value!=='compare')return;
     const hint=document.createElement('p');hint.className='fm-help';hint.textContent='Compare a field received from the previous block. Example: count greater than 5.';conditionFields.append(hint);
     const fieldRow=field(conditionFields,'Incoming field','',draft.field||'count');
     const operatorRow=field(conditionFields,'Comparison','',draft.operator||'greater_than',[['greater_than','Greater than (>)'],['less_than','Less than (<)'],['equals','Equals (=)'],['not_equals','Does not equal'],['contains','Contains'],['exists','Exists']]);
     const valueRow=field(conditionFields,'Compare with','',draft.value??'5');
     valueRow.el.placeholder='e.g. 5';
     const sync=()=>{draft.field=fieldRow.el.value.trim();draft.operator=operatorRow.el.value;draft.value=valueRow.el.value;};
     for(const el of [fieldRow.el,operatorRow.el,valueRow.el])el.addEventListener('input',sync);
     sync();
    };
    action?.el.addEventListener('change',updateConditionFields);
    updateConditionFields();
    validate.push(()=>{if(action?.el.value==='compare'&&!draft.field?.trim())return 'Choose an incoming field';return '';});
   }
   if(node.type==='trello'){
    const picker=document.createElement('div');picker.className='fm-trello-picker';
    const boardLabel=document.createElement('label');boardLabel.className='fm-row';boardLabel.textContent='Board';
    const boardSelect=document.createElement('select');boardSelect.setAttribute('aria-label','Choose Trello board');
    const listLabel=document.createElement('label');listLabel.className='fm-row';listLabel.textContent='List';
    const listSelect=document.createElement('select');listSelect.setAttribute('aria-label','Choose Trello list');
    const feedback=document.createElement('small');feedback.setAttribute('role','status');
    const setOptions=(select,items,placeholder)=>{select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=placeholder;select.append(empty);for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);}};
    setOptions(boardSelect,[],'Loading boards…');setOptions(listSelect,[],'Choose a board first');
    boardLabel.append(boardSelect);listLabel.append(listSelect);picker.append(boardLabel,listLabel,feedback);
    inputs.after(picker);
    let request=0;
    const getToken=()=>new Promise(resolve=>{const handler=e=>{window.removeEventListener('flux:session-response',handler);clearTimeout(timer);resolve(e.detail);};const timer=setTimeout(()=>{window.removeEventListener('flux:session-response',handler);resolve(null);},5000);window.addEventListener('flux:session-response',handler);window.dispatchEvent(new Event('flux:session-request'));});
    const load=async(kind,board)=>{
     const current=++request;feedback.textContent='Loading Trello '+kind+'…';
     try{
      const token=await getToken();if(!token)throw Error('Sign in to Flux Studio first');
      const params=new URLSearchParams({kind});if(board)params.set('board',board);
      const response=await fetch('/.netlify/functions/trello-resources?'+params,{headers:{authorization:'Bearer '+token},cache:'no-store'});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load Trello '+kind);
      if(current!==request||!modal.open)return;
      if(kind==='boards'){setOptions(boardSelect,data.items,'Choose a board');if(draft.board&&data.items.some(x=>x.id===draft.board)){boardSelect.value=draft.board;await load('lists',draft.board);return;}}
      else{setOptions(listSelect,data.items,'Choose a list');if(draft.list&&data.items.some(x=>x.id===draft.list))listSelect.value=draft.list;}
      feedback.textContent=data.items.length?'Select a '+(kind==='boards'?'board':'list')+' to continue.':'No available '+kind+'.';
     }catch(error){if(current===request)feedback.textContent=error.message;}
    };
    boardSelect.addEventListener('change',()=>{draft.board=boardSelect.value;draft.list='';setOptions(listSelect,[],'Choose a board first');if(draft.board)void load('lists',draft.board);});
    listSelect.addEventListener('change',()=>{draft.list=listSelect.value;const input=inputs.querySelector('input');if(input)input.value=draft.list;});
    const onConnected=()=>void load('boards');window.addEventListener('flux:trello-connected',onConnected);modal.addEventListener('close',()=>window.removeEventListener('flux:trello-connected',onConnected),{once:true});
    void load('boards');
   }
   validate.push(()=>{
    const fields=schemas[node.type]?.[action?.el.value]||[];
    for(const spec of fields){const v=String(draft[spec.key]??'').trim();if(spec.required&&!v)return 'Required: '+spec.label;
      if(spec.type==='url'&&v&&!v.startsWith('https://'))return 'Use a secure https:// URL';
      if(spec.key==='body'&&v&&spec.label.includes('JSON')){try{JSON.parse(v)}catch{return 'Invalid JSON in '+spec.label;}}
    }
    return '';
   });
  }
  const connection=document.createElement('div');connection.className='fm-connect';
  const cTitle=document.createElement('strong'),cText=document.createElement('small');
  if(connectedLocal.has(node.type)){cTitle.textContent='Local TEST module';cText.textContent='Settings are saved in the graph. Some actions may be supported in the TEST engine.';}
  else if(limited.has(node.type)){cTitle.textContent='Server connection required';cText.textContent=node.type==='trello'?'Trello reading needs server credentials. ChatGPT plugin access does not transfer to Flux.':node.type==='webhook'?'Generate the webhook key in Automations. This form alone does not activate it.':'Live HTTP destinations must be explicitly enabled on the server.';}
  else if(internal.has(node.type)){cTitle.textContent='Execution not enabled';cText.textContent='You can design the module now; automatic execution is still in development.';}
  else{cTitle.textContent='Account not connected';cText.textContent='Secure OAuth / server authorization for '+node.label+' is not yet available in Flux Studio.';}
  connection.append(cTitle,cText);
  if(node.type==='trello'){
   cTitle.textContent='Trello account · TEST';
   cText.textContent='Connect once, then reuse your account in your automations.';
   const btn=document.createElement('button');btn.type='button';btn.className='flux-trello-connect';btn.textContent='Connect Trello';
   const getToken=()=>new Promise(resolve=>{const handler=e=>{window.removeEventListener('flux:session-response',handler);clearTimeout(timer);resolve(e.detail);};const timer=setTimeout(()=>{window.removeEventListener('flux:session-response',handler);resolve(null);},5000);window.addEventListener('flux:session-response',handler);window.dispatchEvent(new Event('flux:session-request'));});
   const dispose=window.FluxTrelloConnect({button:btn,title:cTitle,status:cText,getToken});
   modal.addEventListener('close',dispose,{once:true});
   connection.append(btn);
  }else if(!internal.has(node.type)){const btn=document.createElement('button');btn.type='button';btn.textContent='Connect account · coming soon';btn.disabled=true;connection.append(btn);}
  body.append(connection);
  const more=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Advanced information';more.append(summary);
  const detail=document.createElement('p');detail.className='fm-help';detail.textContent='Module type: '+node.type+'. Never paste account passwords or API tokens into this form. Settings are saved with the Flux graph; provider authorization is managed separately.';more.append(detail);body.append(more);
  const footerActions=document.createElement('div');footerActions.className='fm-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',close);
  const save=document.createElement('button');save.type='button';save.className='fm-primary';save.textContent='Save';
  save.addEventListener('click',()=>{
   let error='';for(const check of validate){error=check();if(error)break;}if(error){help.textContent=error;help.style.color='#bc3030';return;}if(node.type==='filter'&&draft.operation!=='compare'){delete draft.field;delete draft.operator;delete draft.value;const previous={...node.config};delete previous.field;delete previous.operator;delete previous.value;node.config={...previous,...draft};}else node.config={...node.config,...draft};
   window.dispatchEvent(new Event('flux:canvas-changed'));
   const status=document.getElementById('status');if(status)status.textContent=node.label+' configured. Save your Flux to keep the changes.';
   close();
  });
  if(node.type==='trello'){
   const createReal=document.createElement('button');createReal.type='button';createReal.textContent='Create Trello card';createReal.className='fm-create-trello';
   createReal.style.cssText='padding:10px 15px;background:#a83a23;color:white;border:0;border-radius:9px;font-weight:700;cursor:pointer';
   const updateCreate=()=>{const enabled=(draft.operation==='create_card');createReal.hidden=!enabled;createReal.disabled=!enabled;};
   updateCreate();
   body.addEventListener('change',updateCreate);
   createReal.addEventListener('click',()=>{
    save.click();
    if(modal.open)return; // validation failed: keep configuration visible
    const run=document.getElementById('flux-trello-live');
    if(run)run.click();
    else alert('Trello execution is unavailable. Refresh Flux Studio TEST.');
   });
   footerActions.append(createReal);
  }
  footerActions.append(cancel,save);modal.append(footerActions);
  if(modal.open)modal.close();
  // Stable centered positioning: independent of canvas zoom, scroll and node location.
  modal.style.setProperty('position','fixed','important');
  modal.style.setProperty('left','50%','important');
  modal.style.setProperty('top','50%','important');
  modal.style.setProperty('right','auto','important');
  modal.style.setProperty('bottom','auto','important');
  modal.style.setProperty('transform','translate(-50%,-50%)','important');
  if(!modal.open){try{modal.showModal();}catch(error){console.error('Flux module dialog:',error);modal.setAttribute('open','');}}
 });
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
/* TEST: distinguish add-next from insert-between controls. */
(()=>{
 const style=document.createElement('style');
 style.textContent=`
 #nodes .node .flux-next-plus{width:26px!important;height:26px!important;top:37px!important;right:-46px!important;background:#7853ce!important;color:#fff!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #7853ce!important;font-size:17px!important;line-height:1!important}
 #nodes .node .flux-next-plus:hover{background:#5f36b8!important}
 #nodes .flux-edge-plus{width:20px!important;height:20px!important;min-width:20px!important;min-height:20px!important;border-radius:6px!important;background:#e6f5fb!important;color:#11799c!important;border:1px solid #8bd0e4!important;font-size:14px!important;box-shadow:none!important}
 #nodes .flux-edge-plus:hover{background:#c9edf9!important}
 `;
 document.head.append(style);
})();
