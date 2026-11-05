const bar=document.querySelector('main > .toolbar:not(#canvas-cloud)');
const undo=document.createElement('button'),redo=document.createElement('button');
undo.textContent='↶ Undo';redo.textContent='↷ Redo';
bar.prepend(redo);bar.prepend(undo);
const past=[],future=[];let busy=false;
function snapshot(){let value;const fn=e=>value=JSON.stringify(e.detail);window.addEventListener('flux:canvas-snapshot',fn,{once:true});window.dispatchEvent(new Event('flux:canvas-snapshot-request'));return value;}
function record(){if(busy)return;const value=snapshot();if(value&&past.at(-1)!==value){past.push(value);if(past.length>60)past.shift();future.length=0;}undo.disabled=past.length<2;redo.disabled=!future.length;}
function apply(value){busy=true;window.dispatchEvent(new CustomEvent('flux:canvas-restore-request',{detail:JSON.parse(value)}));busy=false;undo.disabled=past.length<2;redo.disabled=!future.length;}
function change(back){record();if(back){if(past.length<2)return;future.push(past.pop());apply(past.at(-1));}else{if(!future.length)return;const next=future.pop();past.push(next);apply(next);}}
undo.onclick=()=>change(true);redo.onclick=()=>change(false);
window.addEventListener('flux:canvas-changed',record);
record();
