const logos={trello:'trello',airtable:'airtable',sheets:'googlesheets',drive:'googledrive',github:'github',wordpress:'wordpress',miro:'miro',slack:'slack'};
const local={manual:'▶',schedule:'◷',filter:'◇',mapper:'⇄',log:'≡',flux:'ƒ',http:'↔',webhook:'◎',delay:'◷',router:'⑂',loop:'↻',merge:'⋈',database:'▤',email:'✉'};
function decorate(root){
 for(const el of root.querySelectorAll('.block-icon')){
  const type=el.dataset.type;if(!type)continue;
  if(logos[type]){
   const img=document.createElement('img');img.alt='';img.width=25;img.height=25;img.loading='lazy';img.referrerPolicy='no-referrer';img.src='https://cdn.simpleicons.org/'+logos[type];
   img.onerror=()=>{img.remove();el.textContent=type.charAt(0).toUpperCase();};el.replaceChildren(img);
  }else if(local[type])el.textContent=local[type];
 }
}
const observer=new MutationObserver(()=>{observer.disconnect();decorate(document);observer.observe(document.getElementById('nodes'),{childList:true});});
observer.observe(document.getElementById('nodes'),{childList:true});
decorate(document);
