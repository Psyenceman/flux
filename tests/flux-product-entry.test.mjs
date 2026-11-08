import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountAccount} from '../studio/canvas-account.js';

test('product entry routes to automations while developer tools remain separate',()=>{
 const root=readFileSync('studio/index.html','utf8'),rules=readFileSync('studio/_redirects','utf8'),canvas=readFileSync('studio/flow-canvas.html','utf8');
 assert.match(root,/location\.replace\('\.\/flow-canvas\.html'\+location.search\+location.hash\)/);
 assert.doesNotMatch(root,/id="code"|workflow-lab|webhook-test/);
 assert.match(rules,/^\/ \/flow-canvas.html 302!$/m);assert.match(rules,/^\/index.html \/flow-canvas.html 302!$/m);assert.doesNotMatch(rules,/^\/flow-canvas/m);
 const header=canvas.match(/<body><header>(.*?)<\/header>/s)[1];assert.doesNotMatch(header,/workflow-lab|developer-lab|webhook-test/);assert.match(header,/Flux automations/);
 const lab=readFileSync('studio/developer-lab.html','utf8');assert.match(lab,/id="code"/);assert.match(lab,/src="\.\/app.js"/);assert.match(lab,/noindex,nofollow/);
});

function accountHarness(t,auth){
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attrs={};this.value='';this.disabled=false;this.hidden=false;}
  append(...items){this.children.push(...items);}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}
  showModal(){this.open=true;}
  close(){this.open=false;void this.fire('close');}
  async fire(k){await Promise.all((this.listeners[k]||[]).map(fn=>fn({preventDefault(){}})));}
 }
 const oldDocument=globalThis.document,oldWindow=globalThis.window,body=new Element('body'),bar=new Element('nav');
 globalThis.document={body,createElement:tag=>new Element(tag),querySelector:()=>bar};globalThis.window=new EventTarget();
 t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;});
 const mounted=mountAccount(()=>({auth:typeof auth==='function'?{signUp:auth}:auth}));
 const all=[];function walk(n){all.push(n);n.children?.forEach(walk);}walk(body);
 return {mounted,openButton:bar.children[0],dialog:all.find(x=>x.tag==='dialog'),title:all.find(x=>x.tag==='h2'),form:all.find(x=>x.tag==='form'),toggle:all.find(x=>x.textContent==='Create account'),submit:all.find(x=>x.type==='submit'),password:all.find(x=>x.type==='password'),email:all.find(x=>x.type==='email'),status:all.find(x=>x.attrs.role==='status')};
}
test('canvas account registration uses existing duplicate-email handling and returns to sign-in',async t=>{
 let received;const h=accountHarness(t,async data=>{received=data;return {data:{user:{identities:[]},session:null},error:null};});await h.toggle.fire('click');assert.equal(h.submit.textContent,'Create account');assert.equal(h.password.autocomplete,'new-password');h.email.value=' OWNER@EXAMPLE.TEST ';h.password.value='password-unmodified';await h.form.fire('submit');assert.equal(received.email,'owner@example.test');assert.equal(h.submit.textContent,'Sign in');assert.match(h.status.textContent,/already exists/);assert.equal(h.password.value,'');
});
test('canvas pending registration blocks double submission and clearly requests email confirmation',async t=>{
 let finish,calls=0;const h=accountHarness(t,()=>{calls++;return new Promise(resolve=>finish=resolve);});await h.toggle.fire('click');h.email.value='user@example.test';h.password.value='test-password';const pending=h.form.fire('submit');await h.form.fire('submit');assert.equal(calls,1);assert.equal(h.toggle.disabled,true);finish({data:{user:{identities:[{provider:'email'}]},session:null},error:null});await pending;assert.match(h.status.textContent,/Check your email/);assert.equal(h.submit.textContent,'Sign in');assert.equal(h.password.value,'');assert.equal(h.toggle.disabled,false);
});

test('password-manager fields have stable names, ids and login semantics',t=>{
 const h=accountHarness(t,{});assert.equal(h.form.id,'flux-signin-form');assert.equal(h.form.method,'post');assert.equal(h.email.name,'email');assert.equal(h.email.id,'flux-account-email');assert.equal(h.password.name,'password');assert.equal(h.password.id,'flux-account-password');assert.equal(h.password.autocomplete,'current-password');assert.equal(h.email.autocapitalize,'none');
});
test('late guest session check preserves credentials entered or autofilled while loading',async t=>{
 let finish;const h=accountHarness(t,{getUser:()=>new Promise(resolve=>finish=resolve)});const pending=h.mounted.refresh();h.email.value='fixture@example.test';h.password.value='fixture-filled-while-loading';finish({data:{user:null},error:null});await pending;assert.equal(h.password.value,'fixture-filled-while-loading');assert.equal(h.email.value,'fixture@example.test');assert.equal(h.form.hidden,false);
});
test('reopening account always starts in sign-in and late closed-dialog refresh is ignored',async t=>{
 let finish;const h=accountHarness(t,{getUser:()=>new Promise(resolve=>finish=resolve)});await h.toggle.fire('click');assert.equal(h.title.textContent,'Create your account');await h.openButton.fire('click');assert.equal(h.title.textContent,'Sign in to Flux');assert.equal(h.password.autocomplete,'current-password');h.password.value='fixture';h.dialog.close();assert.equal(h.password.value,'');finish({data:{user:null},error:null});await Promise.resolve();assert.equal(h.title.textContent,'Sign in to Flux');
});
