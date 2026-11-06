/* Multi-block move mode: uses the canvas native group drag, keeps edges attached. */
(()=>{
 const bar=document.querySelector('#canvas-shell main .compact-actions');
 if(!bar)return;
 const button=document.createElement('button');
 button.type='button';button.className='flux-select-all';button.setAttribute('aria-pressed','false');
 button.title='Move the entire workflow: drag a block or empty canvas; use arrow keys for precise movement (Shift = 40px)';
 button.textContent='Move workflow';
 const activate=value=>{
  window.fluxMoveAll=value;
  button.setAttribute('aria-pressed',String(value));
  button.textContent=value?'✓ Move mode · arrows / drag':'Move workflow';
  document.getElementById('canvas-shell')?.classList.toggle('flux-group-mode',value);
  button.setAttribute('aria-label',value?'Exit workflow move mode':'Move entire workflow');
 };
 button.addEventListener('click',()=>activate(!window.fluxMoveAll));
 bar.append(button);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&window.fluxMoveAll)activate(false);
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){
   event.preventDefault();activate(true);
  }
 });
})();
