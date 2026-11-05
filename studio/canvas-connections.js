/* Connection references are convenience metadata only: never store credentials in the browser. */
const providers={trello:{name:'Trello',fields:[['list','List ID']],status:'server'},slack:{name:'Slack',fields:[['channel','Channel']],status:'planned'},airtable:{name:'Airtable',fields:[['base','Base ID'],['table','Table']],status:'planned'},sheets:{name:'Google Sheets',fields:[['spreadsheet','Spreadsheet ID']],status:'planned'},drive:{name:'Google Drive',fields:[['folder','Folder ID']],status:'planned'},github:{name:'GitHub',fields:[['repository','Repository']],status:'planned'},miro:{name:'Miro',fields:[['board','Board ID']],status:'planned'},wordpress:{name:'WordPress',fields:[['site','Site URL']],status:'planned'},email:{name:'Email',fields:[['recipient','Recipient']],status:'planned'}};
const storageKey='flux-studio-connection-references-v1';
const read=()=>{try{const data=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(data)?data.filter(x=>providers[x.provider]&&typeof x.id==='string'):[];}catch{return [];}};
const write=entries=>localStorage.setItem(storageKey,JSON.stringify(entries));
function connectionPanel(node,section){
 const provider=providers[node.type];if(!provider)return;
 const wrap=document.createElement('div');wrap.className='flux-connections';
 const heading=document.createElement('h3');heading.textContent='Connection';wrap.append(heading);
 const explanation=document.createElement('p');explanation.className='inspector-help';explanation.textContent=provider.status==='server'?'Trello reading is supported only when server credentials are configured. This reference does not sign you in.':'Connector execution is not available yet. Save a reusable reference without entering any passwords or tokens.';wrap.append(explanation);
 const select=document.createElement('select');select.setAttribute('aria-label','Saved connection reference');wrap.append(select);
 const fields=document.createElement('div');wrap.append(fields);
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:8px 0';wrap.append(buttons);
 const save=document.createElement('button');save.type='button';save.textContent='Save reference';
 const remove=document.createElement('button');remove.type='button';remove.textContent='Delete reference';buttons.append(save,remove);
 const status=document.createElement('p');status.className='inspector-help';wrap.append(status);
 const controls={};
 for(const [key,label] of provider.fields){
  const row=document.createElement('label');row.className='field';row.textContent=label;
  const input=document.createElement('input');input.placeholder=label;input.value=node.config[key]||'';input.addEventListener('input',()=>{node.config[key]=input.value;window.dispatchEvent(new Event('flux:canvas-changed'));});
  row.append(input);fields.append(row);controls[key]=input;
 }
 function refresh(){
  const options=read().filter(x=>x.provider===node.type);select.replaceChildren();
  const blank=document.createElement('option');blank.value='';blank.textContent='Select a saved reference';select.append(blank);
  for(const entry of options){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;select.append(option);}
  select.value=options.some(x=>x.id===node.config.connectionRef)?node.config.connectionRef:'';
  remove.disabled=!select.value;
 }
 select.onchange=()=>{const entry=read().find(x=>x.id===select.value);node.config.connectionRef=entry?.id||'';if(entry){for(const [key] of provider.fields){controls[key].value=entry.values[key]||'';node.config[key]=controls[key].value;}}window.dispatchEvent(new Event('flux:canvas-changed'));refresh();};
 save.onclick=()=>{
  const values=Object.fromEntries(provider.fields.map(([key])=>[key,controls[key].value.trim()]));
  if(!Object.values(values).some(Boolean)){status.textContent='Enter at least one reference value.';return;}
  const name=prompt('Name this connection reference',provider.name+' connection');if(!name?.trim())return;
  const entries=read(),id='ref_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  entries.push({id,provider:node.type,name:name.trim().slice(0,70),values});write(entries);
  node.config.connectionRef=id;window.dispatchEvent(new Event('flux:canvas-changed'));refresh();status.textContent='Reference saved in this browser only. No account has been connected.';
 };
 remove.onclick=()=>{
  if(!select.value||!confirm('Delete this saved reference from this browser?'))return;
  const id=select.value;write(read().filter(x=>x.id!==id));node.config.connectionRef='';window.dispatchEvent(new Event('flux:canvas-changed'));refresh();status.textContent='Reference deleted.';
 };
 refresh();section.prepend(wrap);
}
window.addEventListener('flux:configure-block',event=>{if(event.detail.tab==='Operation')connectionPanel(event.detail.node,event.detail.pane);});
