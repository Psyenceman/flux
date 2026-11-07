// TEST-only scheduled runner. No external connector writes until credentials and idempotency are verified.
import {db} from './trello-shared.mjs';
import {executeGraph,validateGraph} from './flux-graph-engine.mjs';
const SAFE=new Set(['manual','schedule','webhook','filter','router','mapper','merge','flux','log']);
export const config={schedule:'*/5 * * * *'};
export async function handler(){
 let claims;
 try{claims=await db('rpc/flux_claim_scheduled_test','POST',{p_limit:5});}
 catch{return {statusCode:503,body:'Scheduler claim unavailable'};}
 let success=0,failed=0;
 for(const job of claims||[]){
  let ok=false,error=null;
  try{
   const graph=job.graph;
   validateGraph(graph);
   if(graph.nodes.some(n=>!SAFE.has(n.type)))throw Error('Unattended external connectors not approved');
   const result=await executeGraph(graph,{trigger:'schedule',runId:job.run_id},{dryRun:true});
   ok=result.ok===true&&!result.trace.some(x=>x.status==='skipped'||x.status==='simulated');
   if(!ok)error='Scheduled internal workflow failed';
  }catch{error='Invalid or unsupported scheduled workflow';}
  try{const finished=await db('rpc/flux_finish_scheduled_test','POST',{p_run_id:job.run_id,p_ok:ok,p_error:error});if(finished!==true){failed++;continue;}}
  catch{failed++;continue;}
  if(ok)success++;else failed++;
 }
 return {statusCode:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true,claimed:(claims||[]).length,success,failed})};
}
