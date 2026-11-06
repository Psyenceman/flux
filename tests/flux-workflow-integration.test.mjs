import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';

const graph={
 version:1,
 nodes:[
  {id:'n1',type:'manual',config:{}},
  {id:'n2',type:'filter',config:{field:'status',operator:'equals',value:'approved'}},
  {id:'n3',type:'mapper',config:{mapping:JSON.stringify({message:'{{input.message}}',status:'{{input.status}}'})}},
  {id:'n4',type:'log',config:{message:'Workflow completed'}}
 ],
 edges:[{from:'n1',to:'n2'},{from:'n2',to:'n3'},{from:'n3',to:'n4'}]
};
test('approved input executes manual condition mapper log',async()=>{
 const result=await executeGraph(graph,{status:'approved',message:'Hello'},{dryRun:true});
 assert.deepEqual(result.trace.map(x=>x.status),['completed','completed','completed','completed']);
 assert.equal(result.outputs.n3.message,'Hello');
 assert.equal(result.outputs.n4.logMessage,'Workflow completed');
});
test('rejected input skips downstream blocks',async()=>{
 const result=await executeGraph(graph,{status:'rejected',message:'Hello'},{dryRun:true});
 assert.equal(result.trace[1].status,'filtered');
 assert.equal(result.trace[2].status,'skipped');
 assert.equal(result.trace[3].status,'skipped');
});
test('HTTP cannot use an unapproved destination',async()=>{
 const unsafe={version:1,nodes:[{id:'n1',type:'http',config:{method:'POST',url:'https://example.invalid'}}],edges:[]};
 {const result=await executeGraph(unsafe,{},{dryRun:false,notificationUrl:'https://approved.invalid'});assert.equal(result.ok,false);assert.match(result.error,/URL must match/);assert.equal(result.trace.at(-1).status,'failed');}
});
test('schedule does not falsely claim to execute',async()=>{
 const result=await executeGraph({version:1,nodes:[{id:'n1',type:'schedule',config:{frequency:'daily'}}],edges:[]},{},{dryRun:true});
 assert.equal(result.trace[0].status,'skipped');
});
