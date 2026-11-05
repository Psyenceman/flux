const choices={flux:[['pass','Pass data through'],['pick','Select one field'],['count','Count items']],http:[['POST','Send data (POST)']],trello:[['read','Read cards']],database:[['select','Read rows'],['insert','Create row'],['update','Update row'],['delete','Delete row']]};
window.addEventListener('flux:configure-block',event=>{
 const {node,pane,tab}=event.detail;
 if(tab!=='Operation'||!choices[node.type])return;
 const section=document.createElement('section');section.className='flux-guided';
 const heading=document.createElement('h3');heading.textContent='Choose an action';section.append(heading);
 const select=document.createElement('select');
 const key=node.type==='http'?'method':'operation';
 for(const [value,label] of choices[node.type]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
 select.value=choices[node.type].some(([v])=>v===node.config[key])?node.config[key]:choices[node.type][0][0];
 if(!node.config[key])node.config[key]=select.value;
 section.append(select);
 const help=document.createElement('p');help.className='inspector-help';section.append(help);
 const field=document.createElement('label');field.className='field';field.textContent='Field path';const input=document.createElement('input');input.placeholder='customer.email';input.value=node.config.mapping||'';field.append(input);section.append(field);
 const extras={http:[['url','Destination URL']],trello:[['connection','Trello list ID']],database:[['table','Table'],['filter','Filter']]};
 for(const [name,label] of extras[node.type]||[]){const row=document.createElement('label');row.className='field';row.textContent=label;const control=document.createElement('input');control.placeholder=label;control.value=node.config[name]||'';control.oninput=()=>{node.config[name]=control.value;window.dispatchEvent(new Event('flux:canvas-changed'));};row.append(control);section.append(row);}
 input.oninput=()=>{node.config.mapping=input.value;window.dispatchEvent(new Event('flux:canvas-changed'));};
 function refresh(){
  field.style.display=node.type==='flux'&&select.value==='pick'?'block':'none';
  help.textContent=node.type==='flux'?'This transformation runs in the Flux test engine.':node.type==='http'?'Live sending is limited to the server-approved destination.':node.type==='trello'?'Live reading requires server credentials.':'Database execution is not available yet.';
 }
 select.onchange=()=>{node.config[key]=select.value;refresh();window.dispatchEvent(new Event('flux:canvas-changed'));};
 refresh();pane.prepend(section);
});
