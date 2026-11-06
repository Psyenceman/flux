const shell=document.getElementById('canvas-shell');
const library=document.getElementById('toggle-library');
const inspector=document.getElementById('toggle-inspector');
const focus=document.getElementById('focus-canvas');
function render(){
  const l=shell.classList.contains('library-closed'),i=shell.classList.contains('inspector-closed');
  library.textContent=l?'Show blocks':'Hide blocks';
  inspector.textContent=i?'Show inspector':'Hide inspector';
  library.setAttribute('aria-expanded',String(!l));
  inspector.setAttribute('aria-expanded',String(!i));
  focus.setAttribute('aria-pressed',String(l&&i));
  focus.textContent=l&&i?'Exit focus mode':'Focus mode';
}
library.addEventListener('click',()=>{shell.classList.toggle('library-closed');render();});
inspector.addEventListener('click',()=>{shell.classList.toggle('inspector-closed');render();});
focus.addEventListener('click',()=>{
  const closed=shell.classList.contains('library-closed')&&shell.classList.contains('inspector-closed');
  shell.classList.toggle('library-closed',!closed);
  shell.classList.toggle('inspector-closed',!closed);
  render();
});
render();

const floatingInspector=document.getElementById('inspector-panel');
const closeInspector=document.createElement('button');
closeInspector.type='button';closeInspector.textContent='× Close';closeInspector.className='inspector-close';
floatingInspector.prepend(closeInspector);
closeInspector.onclick=()=>floatingInspector.classList.remove('context-open');
inspector.addEventListener('click',()=>floatingInspector.classList.toggle('context-open'));
focus.addEventListener('click',()=>floatingInspector.classList.remove('context-open'));
