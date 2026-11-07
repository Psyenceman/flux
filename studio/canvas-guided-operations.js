/* TEST: guided, non-secret block configuration; values match flux-graph-engine.mjs. */
(()=>{
 const actions={
  trello:[['read_list','Read cards from a list'],['create_card','Create a card']],
  airtable:[['find_records','Find records'],['create_record','Create record'],['update_record','Update record']],
  sheets:[['read_rows','Read spreadsheet rows'],['append_row','Append a row']],
  supabase:[['select_rows','Read rows'],['insert_row','Insert row']],
  hubspot:[['search_contacts','Find contact by email'],['create_contact','Create contact']],
  flux:[['pass','Pass data through'],['pick','Select a field'],['count','Count items']],
  http:[['POST','Send server-approved notification']]
 };
 const fields={
  trello:{read_list:[['list','Trello list ID','text','24-character list ID']],create_card:[['list','Destination list ID','text','24-character list ID'],['title','Card title','text','e.g. New request'],['description','Description','textarea','Optional details']]},
  airtable:{find_records:[['baseId','Base ID','text','app…'],['tableId','Table ID','text','tbl…']],create_record:[['baseId','Base ID','text','app…'],['tableId','Table ID','text','tbl…'],['fields','Record fields (JSON)','textarea','{"Name":"Example"}']],update_record:[['baseId','Base ID','text','app…'],['tableId','Table ID','text','tbl…'],['recordId','Record ID','text','rec…'],['fields','Updated fields (JSON)','textarea','{"Name":"Updated"}']]},
  sheets:{read_rows:[['spreadsheetId','Spreadsheet ID','text','From spreadsheet URL'],['range','A1 range','text','Sheet1!A1:B20']],append_row:[['spreadsheetId','Spreadsheet ID','text','From spreadsheet URL'],['range','A1 range','text','Sheet1!A1:B20'],['values','Row values (JSON array)','textarea','["Example",1]']]},
  supabase:{select_rows:[['table','Table name','text','approved_table']],insert_row:[['table','Table name','text','approved_table'],['fields','Row fields (JSON)','textarea','{"name":"Example"}']]},
  hubspot:{search_contacts:[['query','Contact email','email','person@example.com']],create_contact:[['properties','Contact properties (JSON)','textarea','{"email":"person@example.com"}']]},
  flux:{pick:[['mapping','Incoming field path','text','customer.email']]},
  http:{POST:[['url','Server-approved destination','url','Must match server configuration']]}
 };
 const notify=()=>window.dispatchEvent(new Event('flux:canvas-changed'));
 function control(node,pane,[key,label,kind,placeholder]){
  const wrap=document.createElement('label');wrap.className='field flux-guided-field';
  const title=document.createElement('span');title.textContent=label;wrap.append(title);
  const input=document.createElement(kind==='textarea'?'textarea':'input');
  if(kind!=='textarea')input.type=kind;
  input.placeholder=placeholder;input.value=node.config[key]||'';
  input.setAttribute('aria-label',label);
  const feedback=document.createElement('small');feedback.className='flux-field-feedback';
  const check=()=>{
   const v=input.value.trim();
   let error='';
   if(v){
    if(key==='fields'||key==='properties'||key==='values'){
     try{const parsed=JSON.parse(v);if(key==='values'?!Array.isArray(parsed):(!parsed||Array.isArray(parsed)||typeof parsed!=='object'))error='Check JSON format';}catch{error='Invalid JSON';}
    }
    if(key==='list'&&!/^[a-f0-9]{24}$/i.test(v))error='Expected 24 hexadecimal characters';
    if(key==='baseId'&&!/^app[a-zA-Z0-9]{14}$/.test(v))error='Expected Airtable base ID';
    if(key==='tableId'&&!/^tbl[a-zA-Z0-9]{14}$/.test(v))error='Expected Airtable table ID';
   }
   feedback.textContent=error;input.setAttribute('aria-invalid',String(Boolean(error)));
  };
  input.addEventListener('input',()=>{node.config[key]=input.value;check();notify();});
  input.addEventListener('blur',check);wrap.append(input,feedback);pane.append(wrap);check();
 }
 window.addEventListener('flux:configure-block',event=>{
  const {node,pane,tab}=event.detail||{};
  if(!node||!pane||tab!=='Operation'||!actions[node.type])return;
  const section=document.createElement('section');section.className='flux-guided';section.setAttribute('aria-label','Guided block configuration');
  const title=document.createElement('h3');title.textContent='1. Choose an action';section.append(title);
  const select=document.createElement('select');select.setAttribute('aria-label','Block action');
  for(const [value,label] of actions[node.type])select.add(new Option(label,value));
  const current=node.type==='http'?node.config.method:node.config.operation;
  select.value=actions[node.type].some(([v])=>v===current)?current:actions[node.type][0][0];
  const key=node.type==='http'?'method':'operation';
  if(!current||!actions[node.type].some(([v])=>v===current)){node.config[key]=select.value;notify();}
  section.append(select);
  const form=document.createElement('div');section.append(form);
  const hint=document.createElement('p');hint.className='inspector-help';
  hint.textContent='2. Enter the required non-secret settings. Credentials are managed in My connections. Test safely before enabling a workflow.';
  section.append(hint);
  const render=()=>{form.replaceChildren();for(const def of fields[node.type]?.[select.value]||[])control(node,form,def);};
  select.addEventListener('change',()=>{node.config[key]=select.value;render();notify();});
  render();pane.prepend(section);
 });
})();
