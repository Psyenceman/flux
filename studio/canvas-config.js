const schemas={
 schedule:[['frequency','Frequency','select','hourly,daily,weekly,monthly'],['time','Time (HH:MM)','time'],['days','Days (Mon,Tue,Wed...)','text'],['timezone','Time zone','text']],
 http:[['method','HTTP method','select','GET,POST,PUT,PATCH,DELETE'],['url','Destination URL','url'],['headers','Headers (JSON)','textarea'],['body','Request body (JSON)','textarea']],
 filter:[['field','Field to check','text'],['operator','Comparison','select','equals,not_equals,contains,greater_than,less_than,exists'],['value','Expected value','text']],
 webhook:[['event','Event name','text'],['path','Webhook path','text']],
 email:[['recipient','Recipient','email'],['subject','Subject','text'],['message','Message','textarea']],
 slack:[['channel','Channel','text'],['message','Message','textarea']],
 delay:[['duration','Duration','number'],['unit','Unit','select','seconds,minutes,hours,days']],
 flux:[['source','Flux code','textarea']],
 mapper:[],
 database:[['table','Table','text'],['operation','Action','select','select,insert,update,delete'],['filter','Filter','text']],
 trello:[['board','Board ID','text'],['list','List ID','text']],
 airtable:[['base','Base ID','text'],['table','Table','text']],
 sheets:[['spreadsheet','Spreadsheet ID','text'],['range','Range','text']],
 drive:[['folder','Folder ID','text'],['query','Search query','text']],
 github:[['repository','Repository (owner/name)','text'],['branch','Branch','text']],
 wordpress:[['site','Site URL','url'],['postType','Post type','text']],
 miro:[['board','Board ID','text'],['title','Card title','text']],
 log:[['message','Log message','textarea']],
 router:[['route','Route expression','text']],
 loop:[['items','Items expression','text']]
};
window.addEventListener('flux:configure-block',event=>{
 const {node,pane,tab,upstream=[]}=event.detail;
 if(tab!=='Operation')return;
 const section=document.createElement('section');section.className='block-specific';
 if(['flux','http','trello','database'].includes(node.type))return;
 const heading=document.createElement('h3');heading.textContent='Configure this block';section.append(heading);
 for(const [key,label,type,choices] of schemas[node.type]||[]){
  const row=document.createElement('label');row.className='field';row.textContent=label;
  let input;
  if(type==='select'){input=document.createElement('select');for(const option of choices.split(',')){const item=document.createElement('option');item.value=option;item.textContent=option;input.append(item);}}
  else input=document.createElement(type==='textarea'?'textarea':'input');
  if(type!=='textarea'&&type!=='select')input.type=type;
  input.value=node.config[key]??(key==='timezone'?'Europe/Rome':'');
  input.addEventListener('input',()=>{node.config[key]=input.value;window.dispatchEvent(new Event('flux:canvas-changed'));});
  row.append(input);section.append(row);
  if(node.type==='filter'&&key==='value')row.dataset.conditional='value';
  if(node.type==='flux'&&key==='source')row.dataset.advanced='source';
 }
 if(node.type==='filter'){const choice=section.querySelector('select');const value=section.querySelector('[data-conditional=value]');if(choice&&value){const update=()=>{value.hidden=choice.value==='exists';};choice.addEventListener('change',update);update();}}
 if(node.type==='mapper')buildMappingEditor(section,node,upstream);
 const info=document.createElement('p');info.className='inspector-help';info.textContent='Settings are saved in the graph. Execution requires a supported backend connector; no external action is triggered by editing.';
 section.append(info);pane.prepend(section);
});

function buildMappingEditor(section,node,upstream=[]){
 const intro=document.createElement('p');intro.className='inspector-help';intro.textContent='Choose the output fields. Use {{input.field}} to reuse data from the trigger.';section.append(intro);
 const list=document.createElement('div');section.append(list);
 const add=document.createElement('button');add.type='button';add.textContent='+ Add field';section.append(add);
 let mapping={};try{const value=JSON.parse(node.config.mapping||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))mapping=value;}catch{}
 const entries=Object.entries(mapping);
 if(!entries.length)entries.push(['message','{{input.message}}']);
 const persist=()=>{const output={};for(const row of list.querySelectorAll('[data-picker-row]')){const name=row.querySelector('[data-name]').value.trim(),value=row.querySelector('[data-value]').value;if(name&&/^[a-zA-Z_][\w]{0,63}$/.test(name))output[name]=value;}node.config.mapping=JSON.stringify(output);window.dispatchEvent(new Event('flux:canvas-changed'));};
 function addRow(name='',value=''){
  const row=document.createElement('div');row.className='mapping-row';row.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin:8px 0;align-items:center';
  const key=document.createElement('input');key.dataset.name='';key.placeholder='Output field';key.value=name;key.setAttribute('aria-label','Output field name');
  const val=document.createElement('input');val.dataset.value='';val.placeholder='Value or {{input.field}}';val.value=value;val.setAttribute('aria-label','Output field value');
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove field';remove.onclick=()=>{row.nextElementSibling?.remove();row.remove();persist();};
  const picker=document.createElement('select');picker.setAttribute('aria-label','Insert data reference');picker.title='Choose a previous block';const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose data…';picker.append(placeholder);
  for(const source of [{id:'input',label:'Workflow input'},...upstream.map(item=>({id:item.id,label:item.label+' ('+item.id+')'}))]){
   for(const field of ['message','status','email','customer.email','items','count']){
    const option=document.createElement('option');option.value='{{'+source.id+'.'+field+'}}';option.textContent=source.label+' · '+field;picker.append(option);
   }
  }
  picker.onchange=()=>{if(!picker.value)return;val.value=picker.value;picker.value='';persist();};
  key.oninput=persist;val.oninput=persist;row.append(key,val,remove);list.append(row);
  const pickRow=document.createElement('div');pickRow.style.cssText='margin:0 0 10px';pickRow.append(picker);row.after(pickRow);row.dataset.pickerRow='';
 }
 entries.forEach(([key,value])=>addRow(key,String(value)));
 if(!node.config.mapping)persist();
 add.onclick=()=>{if(list.querySelectorAll('[data-picker-row]').length>=30)return;addRow();};
}
