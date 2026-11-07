/* Flux TEST milestone UX-01: accessible guided workspace; no billing or executor changes. */
(()=>{
 const dictionary={
  en:{title:'Build your automation',subtitle:'Connect apps, choose actions, and test your workflow in a few clicks.',run:'Run once',add:'Add a step',automations:'Automations',editor:'Scenario builder',activity:'Run history',assistant:'Help',safe:'Safe test · no external changes',advanced:'Advanced test settings',unsupported:'Not available yet',supported:'Ready to configure',cost:'Estimated: 1 FCX per completed block · actual billing may differ in TEST',dismiss:'Dismiss'},
  it:{title:'Crea la tua automazione',subtitle:'Collega le app, scegli le azioni e prova il flusso in pochi clic.',run:'Esegui una volta',add:'Aggiungi un passaggio',automations:'Automazioni',editor:'Editor visuale',activity:'Cronologia',assistant:'Aiuto',safe:'Test sicuro · nessuna modifica esterna',advanced:'Impostazioni avanzate del test',unsupported:'Non ancora disponibile',supported:'Pronto da configurare',cost:'Stima: 1 FCX per blocco completato · addebito TEST ancora diverso',dismiss:'Chiudi'}
 };
 const stored=(()=>{try{return localStorage.getItem('flux.studio.locale')}catch{return null}})();
 let locale=stored==='it'?'it':'en';
 const bar=document.querySelector('.workspace-bar');
 const toolbar=document.querySelector('#canvas-shell .compact-actions');
 if(!bar||!toolbar)return;
 const intro=document.createElement('section');intro.className='flux-m1-intro';intro.setAttribute('aria-label','Workflow builder introduction');
 const eyebrow=document.createElement('span');eyebrow.className='flux-m1-eyebrow';eyebrow.textContent='FLUX STUDIO · TEST';
 const title=document.createElement('h2');const subtitle=document.createElement('p');
 intro.append(eyebrow,title,subtitle);
 const shell=document.querySelector('#canvas-shell main');
 shell?.insertBefore(intro,bar.nextSibling);
 const localeButton=document.createElement('button');localeButton.type='button';localeButton.className='flux-m1-language';localeButton.setAttribute('aria-label','Switch language / Cambia lingua');
 bar.append(localeButton);
 const safe=document.createElement('div');safe.className='flux-m1-safe';safe.setAttribute('role','status');
 const safeLabel=document.createElement('span');const cost=document.createElement('small');
 safe.append(safeLabel,cost);toolbar.after(safe);
 const runner=document.getElementById('runner'),input=document.getElementById('run-input'),dry=document.getElementById('run-dry');
 if(runner&&input&&dry){
  const advanced=document.createElement('details');advanced.className='flux-m1-advanced';
  const summary=document.createElement('summary');advanced.append(summary);
  const inputField=input.closest('.field');const dryLabel=dry.closest('label');
  if(inputField)advanced.append(inputField);
  if(dryLabel)advanced.append(dryLabel);
  const runButton=document.getElementById('run-now');
  runButton?.parentElement?.before(advanced);
  const renderAdvanced=()=>{summary.textContent=dictionary[locale].advanced;};
  localeButton.addEventListener('click',renderAdvanced);
  renderAdvanced();
 }
 const available=new Set(['manual','webhook','filter','mapper','flux','log','merge','trello','airtable','sheets','supabase','hubspot','telegram','resend','http','delay']);
 const picker=document.getElementById('flux-block-picker');
 const markPicker=()=>{
  if(!picker)return;
  for(const item of picker.querySelectorAll('.flux-picker-item')){
   const label=item.querySelector('strong')?.textContent?.trim().toLowerCase()||'';
   const source=[...document.querySelectorAll('#palette button[data-type]')].find(x=>(x.querySelector('span:not(.integration-status)')?.textContent||x.dataset.type).trim().toLowerCase()===label);
   const type=source?.dataset.type;
   if(!type)continue;
   const implemented=available.has(type);
   item.dataset.ready=implemented?'supported':'planned';
   const status=item.querySelector('small');
   if(status&&!implemented)status.textContent=dictionary[locale].unsupported;
   item.setAttribute('aria-label',(label||type)+' — '+(implemented?dictionary[locale].supported:dictionary[locale].unsupported));
  }
 };
 const observer=picker?new MutationObserver(markPicker):null;
 if(picker)observer.observe(picker,{childList:true,subtree:false});
 const tabs=bar.querySelectorAll('.flux-mode-tabs button');
 function render(){
  const d=dictionary[locale];document.documentElement.lang=locale;
  title.textContent=d.title;subtitle.textContent=d.subtitle;
  localeButton.textContent=locale==='en'?'IT / EN':'EN / IT';
  const run=document.getElementById('execute');if(run&&!run.disabled)run.textContent=d.run;
  const add=document.getElementById('flux-add-block');if(add)add.textContent='+ '+d.add;
  const labels=[d.automations,d.editor,d.activity,d.assistant];tabs.forEach((el,i)=>{if(labels[i])el.textContent=labels[i]});
  safeLabel.textContent=d.safe;cost.textContent=d.cost;
  const advanced=runner?.querySelector('.flux-m1-advanced summary');if(advanced)advanced.textContent=d.advanced;
  markPicker();
 }
 localeButton.addEventListener('click',()=>{locale=locale==='en'?'it':'en';try{localStorage.setItem('flux.studio.locale',locale)}catch{}render()});
 window.addEventListener('flux:run-completed',event=>{
  const data=event.detail||{};
  const trace=Array.isArray(data.trace)?data.trace:[];
  const completed=trace.filter(x=>x.status==='completed').length;
  const simulated=trace.filter(x=>x.status==='simulated').length;
  const skipped=trace.filter(x=>x.status==='skipped'||x.status==='filtered').length;
  const failed=trace.filter(x=>x.status==='failed').length;
  safeLabel.textContent=locale==='it'?('Risultato: '+completed+' completati · '+simulated+' simulati · '+skipped+' saltati · '+failed+' errori'):('Result: '+completed+' completed · '+simulated+' simulated · '+skipped+' skipped · '+failed+' failed');
  cost.textContent=(locale==='it'?'Stima':'Estimate')+': '+completed+' FCX · '+(locale==='it'?'verifica l’addebito effettivo nel portafoglio':'check actual wallet charge');
 });
 render();
})();