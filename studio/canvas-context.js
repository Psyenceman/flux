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
 const heading=document.createElement('strong');heading.textContent='Insert between blocks';menu.append(heading);
 for(const [type,label] of [['filter','Condition'],['flux','Flux code'],['mapper','Data Mapper'],['http','HTTP API'],['schedule','Schedule'],['delay','Delay'],['log','Log'],['email','Email']]){
  item('+ '+label,()=>window.dispatchEvent(new CustomEvent('flux:insert-between',{detail:{from,to,type}})));
 }
 openAt(x,y);
});
document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();panel.classList.remove('context-open');}});
