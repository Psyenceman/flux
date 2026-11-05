/* Flux Assistant v0: deterministic templates, no AI calls, no graph modifications. */
(()=>{
 const feedback=document.getElementById('flux-assistant-feedback');
 const request=document.getElementById('flux-assistant-request');
 const suggest=document.getElementById('flux-assistant-suggest');
 const repair=document.getElementById('flux-repair-check');
 if(!feedback||!request||!suggest||!repair)return;
 function snapshot(){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.removeEventListener('flux:canvas-snapshot',receive);reject(Error('Canvas unavailable'));},2500);function receive(event){clearTimeout(timeout);resolve(event.detail);}window.addEventListener('flux:canvas-snapshot',receive,{once:true});window.dispatchEvent(new Event('flux:canvas-snapshot-request'));});}
 suggest.addEventListener('click',()=>{
  const goal=request.value.trim().slice(0,500);
  if(!goal){feedback.textContent='Describe what you want to automate first.';return;}
  const words=goal.toLowerCase(),blocks=['Webhook'];
  if(/filter|approved|condition|filtr|condizion|approvat/.test(words))blocks.push('Filter');
  if(/map|field|email|camp|trasform/.test(words))blocks.push('Data Mapper');
  if(/log|debug|tracci/.test(words))blocks.push('Log');
  if(blocks.length===1)blocks.push('Data Mapper','Log');
  feedback.textContent='Suggested workflow (preview only):\n'+blocks.map((block,index)=>(index+1)+'. '+block).join('\n')+'\n\nConfigure each block, validate and test before live execution. No changes have been made.';
 });
 repair.addEventListener('click',async()=>{
  try{
   const graph=await snapshot(),nodes=Array.isArray(graph.nodes)?graph.nodes:[],edges=Array.isArray(graph.edges)?graph.edges:[];
   const ids=new Set(nodes.map(n=>n.id)),issues=[];
   if(!nodes.length)issues.push('No blocks on canvas.');
   for(const edge of edges)if(!ids.has(edge.from)||!ids.has(edge.to))issues.push('Connection references a missing block.');
   const incoming=new Map(nodes.map(n=>[n.id,0])),outgoing=new Map(nodes.map(n=>[n.id,0]));
   for(const edge of edges){if(incoming.has(edge.to))incoming.set(edge.to,incoming.get(edge.to)+1);if(outgoing.has(edge.from))outgoing.set(edge.from,outgoing.get(edge.from)+1);}
   for(const node of nodes){if(nodes.length>1&&!incoming.get(node.id)&&!outgoing.get(node.id))issues.push('Unconnected block: '+node.id);if(['database','slack','airtable','sheets','drive','github','miro','wordpress'].includes(node.type))issues.push('Connector '+node.type+' may not have a live backend executor.');}
   feedback.textContent=issues.length?'Flux Repair — checks:\n'+[...new Set(issues)].slice(0,30).map(x=>'• '+x).join('\n'):'No obvious disconnected or missing blocks found. Run Validate graph and a dry-run test for deeper checks.';
  }catch(error){feedback.textContent='Repair check failed: '+error.message;}
 });
})();
