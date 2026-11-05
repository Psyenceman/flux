import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGraph,validateGraph} from '../netlify/functions/flux-graph-engine.mjs';

const workflow=(nodes,edges=[])=>({version:1,nodes:nodes.map(([id,type,config={}])=>({id,type,config})),edges:edges.map(([from,to])=>({from,to}))});

test('rejects repeated connection',()=>{
 assert.throws(()=>validateGraph(workflow([['a','manual'],['b','log']],[['a','b'],['a','b']])),/Duplicate edge/);
});

test('rejects disconnected cycles',()=>{
 assert.throws(()=>validateGraph(workflow([['a','manual'],['b','log'],['c','log']],[['b','c'],['c','b']])),/Cycles/);
});

test('records skipped downstream blocks when filter does not match',async()=>{
 const result=await executeGraph(workflow([['a','manual'],['b','filter',{field:'status',operator:'equals',value:'yes'}],['c','log']],[['a','b'],['b','c']]),{status:'no'});
 assert.equal(result.trace.find(entry=>entry.id==='b').status,'filtered');
 assert.equal(result.trace.find(entry=>entry.id==='c').status,'skipped');
});

test('dry-run HTTP does not make outbound request',async()=>{
 const result=await executeGraph(workflow([['a','manual'],['b','http',{method:'POST'}]],[['a','b']]),{hello:'world'},{dryRun:true,notificationUrl:'https://example.com/notify'});
 assert.equal(result.trace.find(entry=>entry.id==='b').status,'simulated');
});

test('mapper blocks references outside its upstream ancestry',async()=>{
 const graph=workflow([['a','manual'],['b','manual'],['c','mapper',{mapping:JSON.stringify({email:'{{b.email}}'})}]],[['a','c']]);
 const result=await executeGraph(graph,{email:'sample@example.com'});
 assert.equal(result.ok,false);
 assert.equal(result.failedBlock,'c');
 assert.match(result.error,/unconnected block/);
});
