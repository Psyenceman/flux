const schemas={
 schedule:[['frequency','Frequency','select','hourly,daily,weekly,monthly'],['time','Time (HH:MM)','time'],['days','Days (Mon,Tue,Wed...)','text'],['timezone','Time zone','text']],
 http:[['method','HTTP method','select','GET,POST,PUT,PATCH,DELETE'],['url','Destination URL','url'],['headers','Headers (JSON)','textarea'],['body','Request body (JSON)','textarea']],
 filter:[['field','Field to check','text'],['operator','Comparison','select','equals,not_equals,contains,greater_than,less_than,exists'],['value','Expected value','text']],
 webhook:[['event','Event name','text'],['path','Webhook path','text']],
 email:[['recipient','Recipient','email'],['subject','Subject','text'],['message','Message','textarea']],
 slack:[['channel','Channel','text'],['message','Message','textarea']],
 delay:[['duration','Duration','number'],['unit','Unit','select','seconds,minutes,hours,days']],
 flux:[['source','Flux code','textarea']],
 mapper:[['mapping','Field mapping (JSON)','textarea']],
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
 const {node,pane,tab}=event.detail;
 if(tab!=='Operation')return;
 const section=document.createElement('section');section.className='block-specific';
 const heading=document.createElement('h3');heading.textContent='Block settings';section.append(heading);
 for(const [key,label,type,choices] of schemas[node.type]||[]){
  const row=document.createElement('label');row.className='field';row.textContent=label;
  let input;
  if(type==='select'){input=document.createElement('select');for(const option of choices.split(',')){const item=document.createElement('option');item.value=option;item.textContent=option;input.append(item);}}
  else input=document.createElement(type==='textarea'?'textarea':'input');
  if(type!=='textarea'&&type!=='select')input.type=type;
  input.value=node.config[key]??(key==='timezone'?'Europe/Rome':'');
  input.addEventListener('input',()=>{node.config[key]=input.value;window.dispatchEvent(new Event('flux:canvas-changed'));});
  row.append(input);section.append(row);
 }
 const info=document.createElement('p');info.className='inspector-help';info.textContent='Settings are saved in the graph. Execution requires a supported backend connector; no external action is triggered by editing.';
 section.append(info);pane.prepend(section);
});
