/* UX-03 preserves the graph and existing handlers; no alternate application state. */
window.addEventListener('DOMContentLoaded',()=>{
 const css=document.createElement('link');css.rel='stylesheet';css.href='./canvas-experience.css';document.head.append(css);
 const internal=new Set(['manual','filter','mapper','router','flux','merge','log']);
 const connected=new Set(['trello','airtable','hubspot','sheets','supabase','telegram','resend','http']);
 const mark=()=>{
  for(const button of document.querySelectorAll('#flux-block-results button')){
   const type=button.dataset.type||[...document.querySelectorAll('#palette button')].find(x=>x.textContent.includes(button.textContent.trim()))?.dataset.type;
   if(!type)continue;
   let note=button.querySelector('.fx-availability');if(!note){note=document.createElement('small');note.className='fx-availability';button.append(note);}
   note.textContent=internal.has(type)?'Built-in · runs in Flux':connected.has(type)?'App · connection required':type==='schedule'?'Scheduled runs · setup required':type==='delay'?'Built-in · bounded wait':'Integration in development';
  }
 };
 const results=document.getElementById('flux-block-results');if(results)new MutationObserver(mark).observe(results,{childList:true});mark();
 const toolbar=document.querySelector('.compact-actions');
 if(toolbar){const blank=document.createElement('button');blank.type='button';blank.textContent='Blank canvas';blank.title='Create a workflow from scratch';blank.onclick=()=>{if(!confirm('Start a blank canvas? Save your current work first.'))return;window.dispatchEvent(new CustomEvent('flux:canvas-restore-request',{detail:{version:1,nodes:[],edges:[]}}));window.dispatchEvent(new Event('flux:guided-build-complete'));};toolbar.prepend(blank);}
});
