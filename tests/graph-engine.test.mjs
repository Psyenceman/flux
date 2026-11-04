import test from 'node:test';import assert from 'node:assert/strict';
import {validateGraph,executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
const graph={version:1,nodes:[{id:'a',type:'webhook'},{id:'b',type:'filter',config:{operation:'approved'}},{id:'c',type:'flux',config:{operation:'pick',mapping:'message'}},{id:'d',type:'log'}],edges:[{from:'a',to:'b'},{from:'b',to:'c'},{from:'c',to:'d'}]};
test('approved branch propagates payload and mapped value',async()=>{const r=await executeGraph(graph,{status:'approved',message:'hello'});assert.equal(r.ok,true);assert.equal(r.outputs.c,'hello');assert.equal(r.trace.length,4);});
test('rejected branch stops downstream nodes',async()=>{const r=await executeGraph(graph,{status:'rejected',message:'hello'});assert.equal(r.trace[1].status,'filtered');assert.equal(r.trace[2].status,'skipped');assert.equal(r.outputs.c,undefined);});
test('cycle rejected',()=>assert.throws(()=>validateGraph({...graph,edges:[...graph.edges,{from:'d',to:'a'}]}),/Cycles/));
test('unknown block rejected',()=>assert.throws(()=>validateGraph({...graph,nodes:[...graph.nodes,{id:'x',type:'shell'}]}),/Invalid/));
test('unconfigured HTTP connector never calls external API',async()=>{const r=await executeGraph({version:1,nodes:[{id:'a',type:'http'}],edges:[]},{hello:'world'},{dryRun:false});assert.equal(r.trace[0].status,'skipped');});
test('dry run configured HTTP connector does not send',async()=>{const r=await executeGraph({version:1,nodes:[{id:'a',type:'http'}],edges:[]},{hello:'world'},{dryRun:true,notificationUrl:'https://example.org/'});assert.equal(r.trace[0].status,'simulated');});
