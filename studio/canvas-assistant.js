/* Flux Assistant v0: rule-based workflow previews, no AI service. */
(()=>{
 const feedback=document.getElementById('flux-assistant-feedback');
 const request=document.getElementById('flux-assistant-request');
 const suggest=document.getElementById('flux-assistant-suggest');
 const repair=document.getElementById('flux-repair-check');
 if(!feedback||!request||!suggest||!repair)return;
 function snapshot(){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.removeEventListener('flux:canvas-snapshot',receive);reject(Error('Canvas unavailable'));},2500);function receive(event){clearTimeout(timeout);resolve(event.detail);}window.addEventListener('flux:canvas-snapshot',receive,{once:true});window.dispatchEvent(new Event('flux:canvas-snapshot-request'));});}
 let proposed=null;
 const apply=document.createElement('button');apply.type='button';apply.textContent='Create workflow from preview';apply.hidden=true;apply.className='flux-assistant-apply';suggest.insertAdjacentElement('afterend',apply);
 function buildTemplate(words){
  const blocks=[['manual','Manual Trigger',{}]];
  if(/webhook|incoming|ricev|chiamata/.test(words))blocks[0]=['webhook','Webhook',{}];
  if(/filter|approved|condition|filtr|condizion|approvat/.test(words))blocks.push(['filter','Condition',{field:'status',operator:'equals',value:'approved'}]);
  if(/map|field|email|camp|trasform/.test(words))blocks.push(['mapper','Data Mapper',{mapping:JSON.stringify({message:'{{input.message}}'})}]);
  if(/trello|schede/.test(words))blocks.push(['trello','Trello',{operation:'read_list'}]);
  if(/airtable/.test(words))blocks.push(['airtable','Airtable',{operation:'find_records'}]);
  if(/google sheets|spreadsheet|fogli google/.test(words))blocks.push(['sheets','Google Sheets',{operation:'read_rows'}]);
  if(/supabase/.test(words))blocks.push(['supabase','Supabase',{operation:'select_rows'}]);
  if(/hubspot/.test(words))blocks.push(['hubspot','HubSpot',{operation:'search_contacts'}]);
  if(/http|api|post/.test(words))blocks.push(['http','HTTP',{method:'POST'}]);
  if(/log|debug|tracci/.test(words))blocks.push(['log','Log',{message:'Workflow completed'}]);
  if(blocks.length===1)blocks.push(['mapper','Data Mapper',{mapping:JSON.stringify({message:'{{input.message}}'})}],['log','Log',{message:'Workflow completed'}]);
  const nodes=blocks.map(([type,label,config],i)=>({id:'assistant'+(i+1),type,label,x:110+i*235,y:160,config}));
  return {version:1,nodes,edges:nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id}))};
 }
 apply.addEventListener('click',async()=>{
  if(!proposed)return;
  try{
   const current=await snapshot();
   if(current.nodes?.length&&!window.confirm('Replace the current canvas with the suggested workflow? Unsaved changes may be lost.'))return;
   window.dispatchEvent(new CustomEvent('flux:canvas-restore-request',{detail:structuredClone(proposed)}));
   feedback.textContent='Template applied to the canvas. Configure credentials and block settings, validate, then test. No live execution has started.';
   apply.hidden=true;proposed=null;
   document.querySelector('.flux-mode-tabs button')?.click();
  }catch(error){feedback.textContent='Could not apply template: '+error.message;}
 });
 suggest.addEventListener('click',()=>{
  const goal=request.value.trim().slice(0,500);
  if(!goal){feedback.textContent='Describe what you want to automate first.';return;}
  proposed=buildTemplate(goal.toLowerCase());
  feedback.textContent='Rule-based assistant preview (not AI; no live connections):\\n'+proposed.nodes.map((n,i)=>(i+1)+'. '+n.label).join('\\n')+'\\n\\nReview the sequence and choose Create workflow from preview. Existing canvas will require confirmation before replacement.';
  apply.hidden=false;
 });
 repair.addEventListener('click',async()=>{
  try{
   const graph=await snapshot(),nodes=Array.isArray(graph.nodes)?graph.nodes:[],edges=Array.isArray(graph.edges)?graph.edges:[];
   const ids=new Set(nodes.map(n=>n.id)),issues=[];
   if(!nodes.length)issues.push('No blocks on canvas.');
   for(const edge of edges)if(!ids.has(edge.from)||!ids.has(edge.to))issues.push('Connection references a missing block.');
   const incoming=new Map(nodes.map(n=>[n.id,0])),outgoing=new Map(nodes.map(n=>[n.id,0]));
   for(const edge of edges){if(incoming.has(edge.to))incoming.set(edge.to,incoming.get(edge.to)+1);if(outgoing.has(edge.from))outgoing.set(edge.from,outgoing.get(edge.from)+1);}
   for(const node of nodes){if(nodes.length>1&&!incoming.get(node.id)&&!outgoing.get(node.id))issues.push('Unconnected block: '+node.id);if(['database','slack','drive','github','miro','wordpress','hubspot','airtable','sheets','supabase'].includes(node.type))issues.push('Connector '+node.type+' requires a configured server connection or may be unavailable for live execution.');}
   feedback.textContent=issues.length?'Flux Repair — checks:\n'+[...new Set(issues)].slice(0,30).map(x=>'• '+x).join('\n'):'No obvious disconnected or missing blocks found. Run Validate graph and a dry-run test for deeper checks.';
  }catch(error){feedback.textContent='Repair check failed: '+error.message;}
 });
})();
