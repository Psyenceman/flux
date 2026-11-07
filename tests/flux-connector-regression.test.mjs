import test from 'node:test';
import assert from 'node:assert/strict';
import {executeGraph,validateGraph} from '../netlify/functions/flux-graph-engine.mjs';

const graph=(type,config)=>({version:1,nodes:[{id:'step',type,config}],edges:[]});
test('dry-run Airtable create never writes',async()=>{
 const result=await executeGraph(graph('airtable',{operation:'create_record',baseId:'app12345678901234',tableId:'tbl12345678901234',fields:'{"Name":"Test"}'}),{},{dryRun:true});
 assert.equal(result.ok,true);assert.equal(result.trace[0].status,'simulated');
});
test('dry-run Airtable update never writes',async()=>{
 const result=await executeGraph(graph('airtable',{operation:'update_record',baseId:'app12345678901234',tableId:'tbl12345678901234',recordId:'rec12345678901234',fields:'{"Name":"Test"}'}),{},{dryRun:true});
 assert.equal(result.ok,true);assert.equal(result.trace[0].status,'simulated');
});
test('dry-run Google Sheets append never writes',async()=>{
 const result=await executeGraph(graph('sheets',{operation:'append_row',spreadsheetId:'1234567890123456789012345',range:'Sheet1!A1:B2',values:'["Test",1]'}),{},{dryRun:true});
 assert.equal(result.trace[0].status,'simulated');
});
test('dry-run Supabase insert never writes',async()=>{
 const result=await executeGraph(graph('supabase',{operation:'insert_row',table:'test_items',fields:'{"name":"Test"}'}),{},{dryRun:true});
 assert.equal(result.trace[0].status,'simulated');
});
test('missing connector tokens produce skipped, not success',async()=>{
 for(const [type,config] of [['airtable',{operation:'find_records',baseId:'app12345678901234',tableId:'tbl12345678901234'}],['sheets',{operation:'read_rows',spreadsheetId:'1234567890123456789012345',range:'Sheet1!A1:B2'}],['supabase',{operation:'select_rows',table:'test_items'}]]){
  const result=await executeGraph(graph(type,config),{},{dryRun:true});
  assert.equal(result.trace[0].status,'skipped');
 }
});
test('condition traces show executed, filtered and skipped paths',async()=>{
 const g={version:1,nodes:[{id:'start',type:'manual'},{id:'condition',type:'filter',config:{field:'status',operator:'equals',value:'approved'}},{id:'end',type:'log'}],edges:[{from:'start',to:'condition'},{from:'condition',to:'end'}]};
 const yes=await executeGraph(g,{status:'approved'},{dryRun:true});
 const no=await executeGraph(g,{status:'rejected'},{dryRun:true});
 assert.deepEqual(yes.trace.map(x=>x.status),['completed','completed','completed']);
 assert.deepEqual(no.trace.map(x=>x.status),['completed','filtered','skipped']);
});
test('cycles are rejected',()=>assert.throws(()=>validateGraph({version:1,nodes:[{id:'a',type:'manual'},{id:'b',type:'log'}],edges:[{from:'a',to:'b'},{from:'b',to:'a'}]}),/Cycles/));

test('HubSpot create contact is simulated without credentials',async()=>{
 const result=await executeGraph(graph('hubspot',{operation:'create_contact',properties:'{"email":"demo@example.com","firstname":"Demo"}'}),{},{dryRun:true});
 assert.equal(result.ok,true);assert.equal(result.trace[0].status,'simulated');
});
test('HubSpot create contact rejects missing email',async()=>{
 const result=await executeGraph(graph('hubspot',{operation:'create_contact',properties:'{"firstname":"Demo"}'}),{},{dryRun:true});
 assert.equal(result.ok,false);assert.equal(result.trace[0].status,'failed');
});
test('HubSpot search without credentials is skipped',async()=>{
 const result=await executeGraph(graph('hubspot',{operation:'search_contacts',query:'demo@example.com'}),{},{dryRun:true});
 assert.equal(result.trace[0].status,'skipped');
});

test('Trello read feeds Airtable create preview without Airtable writes',async()=>{
 const originalFetch=globalThis.fetch;
 const requests=[];
 globalThis.fetch=async(url,options={})=>{
  requests.push({url:String(url),method:options.method||'GET'});
  assert.match(String(url),/^https:\/\/api\.trello\.com\/1\/lists\//);
  return {ok:true,json:async()=>[{id:'0123456789abcdef01234567',name:'TEST card',url:'https://trello.com/c/test',idList:'0123456789abcdef01234567'}]};
 };
 try{
  const workflow={version:1,nodes:[
   {id:'trello1',type:'trello',config:{operation:'read_list',list:'0123456789abcdef01234567'}},
   {id:'airtable1',type:'airtable',config:{operation:'create_record',baseId:'app12345678901234',tableId:'tbl12345678901234',fields:'{"Name":"Preview only"}'}}
  ],edges:[{from:'trello1',to:'airtable1'}]};
  const result=await executeGraph(workflow,{},{dryRun:true,trelloAccessToken:'mock-token'});
  assert.equal(result.ok,true);
  assert.deepEqual(result.trace.map(x=>x.status),['completed','simulated']);
  assert.equal(result.outputs.trello1.items[0].name,'TEST card');
  assert.equal(result.outputs.airtable1.simulated,true);
  assert.equal(requests.length,1);
  assert.equal(requests[0].method,'GET');
 }finally{globalThis.fetch=originalFetch;}
});
