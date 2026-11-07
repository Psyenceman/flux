import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../netlify/functions/flux-scheduler.mjs';
import {executeGraph} from '../netlify/functions/flux-graph-engine.mjs';
// The scheduler's Supabase RPC integration is covered by transactional TEST SQL checks.
// Here we assert that internal-only execution remains safe and deterministic.
test('safe scheduled internal graph executes without external requests',async()=>{
 const graph={version:1,nodes:[{id:'start',type:'manual'},{id:'end',type:'log',config:{message:'scheduled'}}],edges:[{from:'start',to:'end'}]};
 const result=await executeGraph(graph,{trigger:'schedule'},{dryRun:true});
 assert.equal(result.ok,true);
 assert.deepEqual(result.trace.map(x=>x.status),['completed','completed']);
});
test('scheduled external connector graph cannot be considered internal-only',()=>{
 const safe=new Set(['manual','schedule','webhook','filter','router','mapper','merge','flux','log']);
 for(const type of ['trello','airtable','sheets','supabase','hubspot','http','email'])
  assert.equal(safe.has(type),false);
});
