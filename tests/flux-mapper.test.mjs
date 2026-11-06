import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
const make=(nodes,edges)=>({version:1,nodes:nodes.map(([id,type,config={}])=>({id,type,config})),edges:edges.map(([from,to])=>({from,to}))});
test('mapper resolves actual fields from connected upstream blocks',async()=>{
 const g=make([['start','manual'],['pick','flux',{operation:'pick',mapping:'customer'}],['map','mapper',{mapping:JSON.stringify({email:'{{pick.email}}',name:'{{pick.name}}',greeting:'Hello {{pick.name}}'})}]],[['start','pick'],['pick','map']]);
 const r=await executeGraph(g,{customer:{email:'person@example.org',name:'Alex'}});
 assert.deepEqual(r.outputs.map,{email:'person@example.org',name:'Alex',greeting:'Hello Alex'});
});
test('mapper refuses data from unconnected blocks',async()=>{
 const g=make([['start','manual'],['other','manual'],['map','mapper',{mapping:JSON.stringify({private:'{{other.secret}}'})}]],[['start','map']]);
 {const result=await executeGraph(g,{secret:'private'});assert.equal(result.ok,false);assert.match(result.error,/unconnected block/);assert.equal(result.trace.at(-1).status,'failed');}
});
test('mapper preserves structured values in exact references',async()=>{
 const g=make([['start','manual'],['map','mapper',{mapping:JSON.stringify({customer:'{{input.customer}}'})}]],[['start','map']]);
 const r=await executeGraph(g,{customer:{name:'Alex',active:true}});
 assert.deepEqual(r.outputs.map.customer,{name:'Alex',active:true});
});
test('mapper refuses malformed JSON',async()=>{
 const g=make([['start','manual'],['map','mapper',{mapping:'{broken'}]],[['start','map']]);
 {const result=await executeGraph(g,{});assert.equal(result.ok,false);assert.match(result.error,/JSON object/);assert.equal(result.trace.at(-1).status,'failed');}
});
