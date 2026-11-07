// Uses the existing Studio client/session, never a second auth store.
export async function signInAccount(client,email,password){
 if(!client)throw Error('Account service is loading. Please try again.');
 if(!email.trim()||!password)throw Error('Enter your email and password.');
 const {error}=await client.auth.signInWithPassword({email:email.trim(),password});
 if(error)throw Error(error.message==='Invalid login credentials'?'Email or password is incorrect. Please try again.':error.message);
}
export function mountAccount(getClient){
 const button=document.createElement('button');button.type='button';button.id='flux-account-button';button.textContent='Sign in';button.className='fx-account-button';
 document.querySelector('.workspace-bar')?.append(button);
 const dialog=document.createElement('dialog');dialog.id='flux-account-dialog';dialog.setAttribute('aria-labelledby','flux-account-heading');
 const head=document.createElement('div');head.className='fx-account-head';const title=document.createElement('h2');title.id='flux-account-heading';title.textContent='Your account';
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>dialog.close());head.append(title,close);
 const status=document.createElement('p');status.setAttribute('role','status');status.className='fx-account-status';
 const form=document.createElement('form');form.className='fx-account-login';
 const intro=document.createElement('p');intro.textContent='Sign in to save your automations, manage connections and view your FluxCoins.';
 const label=(name,type,autocomplete)=>{const row=document.createElement('label');row.textContent=name;const input=document.createElement('input');input.type=type;input.autocomplete=autocomplete;input.required=true;row.append(input);form.append(row);return input;};
 form.append(intro);const email=label('Email','email','username'),password=label('Password','password','current-password');
 const submit=document.createElement('button');submit.type='submit';submit.className='fx-account-primary';submit.textContent='Sign in';form.append(submit);
 const privateArea=document.createElement('section');privateArea.className='fx-account-private';privateArea.hidden=true;
 const greeting=document.createElement('h3'),identity=document.createElement('p'),plan=document.createElement('p'),coins=document.createElement('p');
 const note=document.createElement('p');note.textContent='TEST workspace · subscriptions and purchases are not enabled.';
 const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';
 privateArea.append(greeting,identity,plan,coins,note,logout);dialog.append(head,status,form,privateArea);document.body.append(dialog);
 let revision=0,disposed=false;
 async function refresh(){
  const current=++revision;const client=getClient();if(!client){status.textContent='Account service is loading. Please try again shortly.';return;}
  const {data,error}=await client.auth.getUser();if(disposed||current!==revision)return;
  const user=data?.user;
  if(!user||error){form.hidden=false;privateArea.hidden=true;identity.textContent='';plan.textContent='';coins.textContent='';password.value='';button.textContent='Sign in';status.textContent='';return;}
  form.hidden=true;privateArea.hidden=false;button.textContent='My account';greeting.textContent='Account overview';identity.textContent=user.email||'Signed in';status.textContent='';
  plan.textContent='Loading plan…';coins.textContent='Loading balance…';
  const [entitlement,wallet]=await Promise.all([client.from('flux_user_plans').select('plan_id').eq('user_id',user.id).maybeSingle(),client.from('flux_credit_accounts').select('balance,lifetime_used').eq('user_id',user.id).maybeSingle()]);
  if(disposed||current!==revision)return;
  plan.textContent=entitlement.error?'Plan unavailable':entitlement.data?.plan_id?'Plan: '+entitlement.data.plan_id:'Plan not assigned';
  coins.textContent=wallet.error?'Balance unavailable':wallet.data?'FluxCoins: '+wallet.data.balance+' · Used: '+wallet.data.lifetime_used:'No wallet record available';
 }
 form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;status.textContent='Signing in…';try{await signInAccount(getClient(),email.value,password.value);await refresh();window.dispatchEvent(new Event('flux:coins-refresh'));}catch(error){status.textContent=error.message;}finally{password.value='';submit.disabled=false;}});
 logout.addEventListener('click',async()=>{logout.disabled=true;try{const client=getClient();if(!client)throw Error('Account service unavailable');const {error}=await client.auth.signOut();if(error)throw error;revision++;privateArea.hidden=true;identity.textContent='';plan.textContent='';coins.textContent='';form.hidden=false;button.textContent='Sign in';status.textContent='Signed out.';window.dispatchEvent(new Event('flux:coins-refresh'));}catch(error){status.textContent=error.message;}finally{logout.disabled=false;}});
 const open=()=>{if(!dialog.open)dialog.showModal();void refresh();};button.addEventListener('click',open);window.addEventListener('flux:account-open',open);
 dialog.addEventListener('close',()=>{password.value='';});
 return {refresh};
}
