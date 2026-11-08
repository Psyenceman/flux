import test from 'node:test';import assert from 'node:assert/strict';
import {workflowDialog,confirmWorkflow} from '../studio/canvas-dialogs.js';
function harness(t){
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.isConnected=true;}
  setAttribute(){} append(...es){this.children.push(...es);} addEventListener(k,f){(this.listeners[k]||=[]).push(f);}
  fire(k){for(const f of this.listeners[k]||[])f({preventDefault(){}});} focus(){this.focused=true;} select(){} showModal(){this.open=true;} close(){this.open=false;this.fire('close');} remove(){this.isConnected=false;} setCustomValidity(x){this.validity=x;} reportValidity(){this.reported=true;}
 }
 const old=globalThis.document,body=new Element('body'),previous=new Element('button');globalThis.document={body,activeElement:previous,createElement:x=>new Element(x)};
 t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
 const find=tag=>{const all=[];function walk(n){all.push(n);n.children.forEach(walk);}walk(body);return all.filter(x=>x.tag===tag).at(-1);};return {find,previous};
}
test('workflow name cancellation never supplies a value and restores focus',async t=>{const h=harness(t),pending=workflowDialog({title:'Save',value:'My automation'});h.find('dialog').close();assert.equal(await pending,null);assert.equal(h.previous.focused,true);});
test('workflow name validates whitespace and submits a trimmed name without interpreting HTML',async t=>{const h=harness(t),pending=workflowDialog({title:'Save',value:'My automation'});const input=h.find('input');input.value='   ';h.find('form').fire('submit');assert.equal(input.reported,true);assert.equal(h.find('dialog').open,true);input.value='  <script>literal name</script>  ';h.find('form').fire('submit');assert.equal(await pending,'<script>literal name</script>');});
test('confirmation is false on Escape/close and concurrent requests cannot replace a pending decision',async t=>{const h=harness(t),pending=confirmWorkflow({title:'Open?'});assert.equal(await workflowDialog({title:'Other'}),null);h.find('dialog').close();assert.equal(await pending,false);});
test('explicit submit confirms a workflow decision',async t=>{const h=harness(t),pending=confirmWorkflow({title:'Start?'});h.find('form').fire('submit');assert.equal(await pending,true);});
