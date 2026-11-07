export function encodeFields(rows,array=false){
 if(array)return JSON.stringify(rows.map(r=>typed(r)));
 const result=Object.create(null);
 for(const row of rows){const key=row.key.trim();if(!key)throw Error('Name each field');if(Object.hasOwn(result,key))throw Error('Field names must be unique');result[key]=typed(row);}
 return JSON.stringify(result);
}
function typed(row){if(row.type==='number'){if(!row.value.trim()||!Number.isFinite(Number(row.value)))throw Error('Enter a valid number');return Number(row.value);}if(row.type==='boolean'){if(!['true','false'].includes(row.value))throw Error('Choose true or false');return row.value==='true';}if(row.type==='structured'){try{return JSON.parse(row.value);}catch{throw Error('Invalid advanced structured value');}}return row.value;}
export function structuredFields(parent,draft,key,label,array=false){
 const section=document.createElement('section');section.className='fx-structured-fields';const heading=document.createElement('strong');heading.textContent=label.replace(/\s*\(?JSON\)?/gi,'').trim();section.append(heading);
 const hint=document.createElement('p');hint.className='fm-help';hint.textContent=array?'Add the values in the order they should appear.':'Add field names and values. Incoming data can be inserted using {{input.name}}.';section.append(hint);
 const rows=[],root=document.createElement('div');section.append(root);let initialError='';
 function add(name='',value=''){
  const row=document.createElement('div');row.className='fx-structured-row';const k=document.createElement('input');k.placeholder='Field name';k.setAttribute('aria-label','Field name');k.value=name;if(array)k.hidden=true;
  const type=document.createElement('select');type.setAttribute('aria-label','Value type');for(const [id,text] of [['text','Text'],['number','Number'],['boolean','True / false'],['structured','Structured · advanced']])type.add(new Option(text,id));
  type.value=typeof value==='number'?'number':typeof value==='boolean'?'boolean':value&&typeof value==='object'?'structured':'text';
  const v=document.createElement('input');v.setAttribute('aria-label','Field value');v.placeholder='Value';v.value=typeof value==='string'?value:JSON.stringify(value);
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.className='fx-form-button';remove.setAttribute('aria-label','Remove value');const item={k,type,v};rows.push(item);remove.onclick=()=>{rows.splice(rows.indexOf(item),1);row.remove();};row.append(k,type,v,remove);root.append(row);
 }
 try{const data=JSON.parse(draft[key]|| (array?'[]':'{}'));if(array){if(!Array.isArray(data))throw Error();data.forEach(v=>add('',v));}else{if(!data||Array.isArray(data)||typeof data!=='object')throw Error();Object.entries(data).forEach(([k,v])=>add(k,v));}}catch{initialError='Existing configuration has an invalid format. Clear it explicitly to start again.';const warning=document.createElement('p');warning.textContent=initialError;const reset=document.createElement('button');reset.type='button';reset.textContent='Clear invalid fields';reset.onclick=()=>{initialError='';warning.remove();reset.remove();};section.append(warning,reset);}
 const plus=document.createElement('button');plus.type='button';plus.textContent=array?'+ Add value':'+ Add field';plus.className='fx-form-button';plus.onclick=()=>add();section.append(plus);parent.append(section);
 return ()=>{if(initialError)return initialError;try{draft[key]=encodeFields(rows.map(r=>({key:r.k.value,type:r.type.value,value:r.v.value})),array);return '';}catch(error){return error.message;}};
}
if(typeof window!=='undefined')window.FluxStructuredFields=structuredFields;
