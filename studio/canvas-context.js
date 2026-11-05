const panel=document.getElementById('inspector-panel');
const menu=document.createElement('div');
menu.className='canvas-context-menu';
menu.hidden=true;
document.body.append(menu);
function close(){menu.hidden=true;menu.replaceChildren();}
function openAt(x,y){menu.hidden=false;menu.style.left=Math.min(x,innerWidth-230)+'px';menu.style.top=Math.min(y,innerHeight-310)+'px';}
function item(text,action){const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>{close();action();};menu.append(button);}
window.addEventListener('flux:block-menu',event=>{
 const {id,label,x,y}=event.detail;menu.replaceChildren();
 const heading=document.createElement('strong');heading.textContent=label;menu.append(heading);
 item('Configure block',()=>{panel.classList.add('context-open');document.getElementById('canvas-shell').classList.remove('inspector-closed');document.getElementById('toggle-inspector').setAttribute('aria-expanded','true');});
 item('Delete block',()=>window.dispatchEvent(new CustomEvent('flux:delete-block',{detail:id})));
 openAt(x,y);
});
window.addEventListener('flux:edge-insert-menu',event=>{
 const {from,to,x,y}=event.detail;menu.replaceChildren();
 const heading=document.createElement('strong');heading.textContent='Connection options';menu.append(heading);
 item('Disconnect blocks',()=>window.dispatchEvent(new CustomEvent('flux:disconnect-edge',{detail:{from,to}})));
 const separator=document.createElement('strong');separator.textContent='Insert a block between them';menu.append(separator);
 const search=document.createElement('input');search.type='search';search.placeholder='Search blocks…';search.setAttribute('aria-label','Search blocks to insert');menu.append(search);
 const options=document.createElement('div');options.className='edge-block-options';options.style.cssText='max-height:210px;overflow-y:auto;display:flex;flex-direction:column';menu.append(options);
 const blocks=[['manual','Manual trigger'],['schedule','Schedule'],['webhook','Webhook'],['filter','Condition'],['router','Router'],['mapper','Data Mapper'],['flux','Flux code'],['http','HTTP API'],['delay','Delay'],['loop','Loop'],['merge','Merge'],['log','Log'],['email','Email'],['slack','Slack'],['trello','Trello'],['airtable','Airtable'],['sheets','Google Sheets'],['drive','Google Drive'],['github','GitHub'],['wordpress','WordPress'],['miro','Miro'],['database','Database']];
 function renderOptions(){
  options.replaceChildren();
  for(const [type,label] of blocks.filter(([type,label])=>label.toLowerCase().includes(search.value.toLowerCase()))){
   const button=document.createElement('button');button.type='button';button.textContent='+ '+label;button.onclick=()=>{close();window.dispatchEvent(new CustomEvent('flux:insert-between',{detail:{from,to,type}}));};options.append(button);
  }
  if(!options.children.length){const empty=document.createElement('p');empty.textContent='No matching blocks';options.append(empty);}
 }
 search.oninput=renderOptions;renderOptions();openAt(x,y);
});
document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();panel.classList.remove('context-open');}});
