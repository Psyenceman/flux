import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../studio/trello-connect.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function setup({blocked=false,fail=false}={}){
 const events=new Map(),clicks=new Map(),intervals=new Set(),calls=[];
 const button={dataset:{},setAttribute(){},addEventListener:(n,f)=>clicks.set(n,f),removeEventListener:n=>clicks.delete(n)};
 const title={},status={};let saved=false;
 const popup={document:{body:{}},closed:false,focus(){},close(){this.closed=true;},location:{replace(url){calls.push(['navigate-popup',url]);}}};
 const window={dispatchEvent(event){calls.push(['event',event.type]);},open(){calls.push(['open']);return blocked?null:popup;},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const context={window,Event,location:{origin:'https://flux-studio-test.netlify.app'},URL,Date,Error,setInterval:f=>{intervals.add(f);return f;},clearInterval:f=>intervals.delete(f),fetch:async url=>{
  calls.push(['fetch',url]);
  return {ok:!fail,json:async()=>url.endsWith('start')?{authorizeUrl:'https://auth.atlassian.com/authorize?test=1'}:{connections:saved?[{status:'connected',provider_account_label:'Test account'}]:[]}};
 }};
 vm.runInNewContext(source,context);
 const dispose=window.FluxTrelloConnect({button,title,status,getToken:async()=>'test-session'});
 return {button,status,popup,calls,events,intervals,dispose,click:()=>clicks.get('click')(),save:()=>saved=true,message:(extra={})=>events.get('message')({origin:context.location.origin,source:popup,data:{type:'flux:trello-oauth',status:'connected'},...extra})};
}
test('popup opens before async auth and callback refreshes actual connection',async()=>{
 const s=setup();await flush();s.calls.length=0;await s.click();assert.equal(s.calls[0][0],'open');assert.equal(s.button.dataset.state,'connecting');
 s.save();s.message({origin:'https://untrusted.example'});assert.equal(s.button.disabled,true);
 s.message({source:{}});assert.equal(s.button.disabled,true);
 s.message();await flush();assert.equal(s.button.dataset.state,'connected');assert.match(s.button.textContent,/Trello connected/);assert.equal(s.status.textContent,'Test account');assert.equal(s.intervals.size,0);s.dispose();assert.equal(s.events.size,0);
});
test('closing popup refreshes status when opener message is unavailable',async()=>{
 const s=setup();await flush();await s.click();s.save();s.popup.closed=true;[...s.intervals][0]();await flush();assert.equal(s.button.dataset.state,'connected');s.dispose();
});
test('blocked popup leaves Flux usable',async()=>{
 const s=setup({blocked:true});await flush();await s.click();assert.equal(s.button.disabled,false);assert.match(s.status.textContent,/Allow pop-ups/);s.dispose();
});
test('failed request closes popup and restores button',async()=>{
 const s=setup({fail:true});await flush();await s.click();assert.equal(s.popup.closed,true);assert.equal(s.button.disabled,false);assert.equal(s.intervals.size,0);s.dispose();
});
