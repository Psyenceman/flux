// Shared, accessible workflow dialogs. Never interpolates names as HTML.
let active=false;
export function workflowDialog({title,message,confirmLabel='Continue',value,nameLabel='Automation name'}={}){
 if(active)return Promise.resolve(null);
 active=true;
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='fx-workflow-dialog';dialog.setAttribute('aria-labelledby','flux-workflow-dialog-title');
  const heading=document.createElement('h2');heading.id='flux-workflow-dialog-title';heading.textContent=title;
  const description=document.createElement('p');description.textContent=message||'';
  const form=document.createElement('form');let input,result=null;
  if(value!==undefined){const label=document.createElement('label');label.textContent=nameLabel;input=document.createElement('input');input.name='automation-name';input.autocomplete='off';input.required=true;input.maxLength=100;input.value=value;label.append(input);form.append(label);}
  const actions=document.createElement('div');actions.className='fx-dialog-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
  const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent=confirmLabel;
  actions.append(cancel,submit);form.append(actions);dialog.append(heading,description,form);document.body.append(dialog);
  form.addEventListener('submit',event=>{event.preventDefault();if(input&&!input.value.trim()){input.setCustomValidity('Enter an automation name.');input.reportValidity();return;}result=input?input.value.trim():true;dialog.close();});
  input?.addEventListener('input',()=>input.setCustomValidity(''));
  dialog.addEventListener('close',()=>{dialog.remove();active=false;if(previous?.isConnected)previous.focus();resolve(result);},{once:true});
  dialog.showModal();if(input){input.focus();input.select();}else cancel.focus();
 });
}
export const confirmWorkflow=options=>workflowDialog(options).then(value=>value===true);
if(typeof window!=='undefined')window.FluxDialogs={confirm:confirmWorkflow,name:workflowDialog};
