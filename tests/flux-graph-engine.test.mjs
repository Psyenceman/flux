import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGraph,executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
const graph=(nodes,edges=[])=>({version:1,nodes:nodes.map(([id,type,config={}])=>({id,type,config})),edges:edges.map(([from,to])=>({from,to}))});
test('inserting a block preserves execution order and data',async()=>{
 const g=graph([['a','manual'],['b','flux',{operation:'pick',mapping:'customer.email'}],['c','log',{message:'done'}]],[['a','b'],['b','c']]);
 const r=await executeGraph(g,{customer:{email:'hello@example.org'}});
 assert.equal(r.outputs.b,'hello@example.org');
 assert.equal(r.outputs.c.value,'hello@example.org');
 assert.deepEqual(r.trace.map(x=>x.id),['a','b','c']);
});
test('disconnect leaves both blocks valid',()=>{
 const g=graph([['a','manual'],['b','log']]);
 assert.doesNotThrow(()=>validateGraph(g));
});
test('condition filters downstream blocks',async()=>{
 const g=graph([['a','manual'],['b','filter',{field:'status',operator:'equals',value:'approved'}],['c','log']],[['a','b'],['b','c']]);
 const r=await executeGraph(g,{status:'rejected'});
 assert.equal(r.outputs.c,undefined);
 assert.equal(r.trace.find(x=>x.id==='b').status,'filtered');
});
test('unsafe cycles are rejected',()=>{
 const g=graph([['a','manual'],['b','log']],[['a','b'],['b','a']]);
 assert.throws(()=>validateGraph(g),/Cycles/);
});
test('http does not contact an arbitrary user URL',async()=>{
 const g=graph([['a','manual'],['b','http',{method:'POST',url:'https://example.org'}]],[['a','b']]);
 const r=await executeGraph(g,{message:'test'});
 assert.equal(r.trace.find(x=>x.id==='b').status,'skipped');
});

test('delay dry-run simulates without waiting and forwards input',async()=>{
 const g=graph([['a','manual'],['b','delay',{milliseconds:1500}],['c','log']],[['a','b'],['b','c']]);
 const result=await executeGraph(g,{message:'hello'});
 assert.equal(result.trace[1].status,'simulated');
 assert.equal(result.outputs.c.message,'hello');
});
test('delay rejects excessive waiting',async()=>{
 const g=graph([['a','delay',{milliseconds:50000}]]);
 const result=await executeGraph(g,{});
 assert.equal(result.ok,false);
 assert.equal(result.failedBlock,'a');
 assert.match(result.error,/duration must be/);
 assert.equal(result.trace[0].status,'failed');
});

test('failed mapping produces a block-level trace without running successors',async()=>{
 const g=graph([['a','manual'],['b','mapper',{mapping:'invalid json'}],['c','log']],[['a','b'],['b','c']]);
 const result=await executeGraph(g,{message:'hello'});
 assert.equal(result.ok,false);
 assert.equal(result.failedBlock,'b');
 assert.equal(result.trace.find(entry=>entry.id==='b').status,'failed');
 assert.equal(result.trace.find(entry=>entry.id==='c'),undefined);
});
