const logos={trello:['trello','0052CC'],airtable:['airtable','FCB400'],sheets:['googlesheets','34A853'],drive:['googledrive','4285F4'],github:['github','FFFFFF'],wordpress:['wordpress','21759B'],miro:['miro','FFD02F'],slack:['slack','E01E5A']};
const local={manual:'▶',schedule:'◷',filter:'◇',mapper:'⇄',log:'≡',flux:'ƒ',http:'↔',webhook:'◎',delay:'◷',router:'⑂',loop:'↻',merge:'⋈',database:'▤',email:'✉'};
function decorate(root){
 for(const el of root.querySelectorAll('.block-icon')){
  const type=el.dataset.type;if(!type)continue;
  if(logos[type]){el.querySelectorAll('.app-logo').forEach(icon=>icon.remove());
   const img=document.createElement('img');img.alt='';img.width=25;img.height=25;img.loading='lazy';img.referrerPolicy='no-referrer';img.src='https://cdn.simpleicons.org/'+logos[type][0]+'/'+logos[type][1];
   img.onerror=()=>{img.remove();el.textContent=type.charAt(0).toUpperCase();};el.replaceChildren(img);
  }else if(local[type])el.textContent=local[type];
 }
}
const observer=new MutationObserver(()=>{observer.disconnect();decorate(document);observer.observe(document.getElementById('nodes'),{childList:true});});
observer.observe(document.getElementById('nodes'),{childList:true});
decorate(document);

function decoratePalette(){
 for(const button of document.querySelectorAll('#palette button')){
  const type=Object.keys(logos).find(key=>button.dataset.search?.includes(key==='sheets'?'google sheets':key==='drive'?'google drive':key));
  if(!type)continue;
  const slot=button.querySelector('.palette-icon');if(!slot||slot.querySelector('.brand-logo'))continue;
  slot.querySelectorAll('img').forEach(img=>img.remove());
  const img=document.createElement('img');img.className='brand-logo';img.alt='';img.width=25;img.height=25;
  img.src='https://cdn.simpleicons.org/'+logos[type][0]+'/'+logos[type][1];
  img.onerror=()=>img.remove();slot.replaceChildren(img);
 }
}
decoratePalette();
const paletteObserver=new MutationObserver(()=>{paletteObserver.disconnect();decoratePalette();paletteObserver.observe(document.getElementById('palette'),{childList:true,subtree:false});});
paletteObserver.observe(document.getElementById('palette'),{childList:true,subtree:false});
