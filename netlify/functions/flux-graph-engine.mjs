// Flux graph executor v0.1. No eval, arbitrary code execution or user-defined outbound URLs.
export function validateGraph(graph){
 if(!graph||graph.version!==1||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Invalid graph');
 if(graph.nodes.length>80||graph.edges.length>300)throw Error('Graph exceeds execution limits');
 const ids=new Set();
 const allowed=new Set(['webhook','filter','flux','log','merge','http','airtable','miro','slack','email','database','delay']);
 for(const n of graph.nodes){if(!n||typeof n.id!=='string'||n.id.length>80||ids.has(n.id)||!allowed.has(n.type))throw Error('Invalid or duplicate block');ids.add(n.id);}
 for(const e of graph.edges){if(!e||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw Error('Invalid edge');}
 const indegree=new Map(graph.nodes.map(n=>[n.id,0])),adj=new Map(graph.nodes.map(n=>[n.id,[]]));
 for(const e of graph.edges){if(adj.get(e.from).includes(e.to))throw Error('Duplicate edge');adj.get(e.from).push(e.to);indegree.set(e.to,indegree.get(e.to)+1);}
 const queue=graph.nodes.filter(n=>indegree.get(n.id)===0).map(n=>n.id),order=[];
 while(queue.length){const id=queue.shift();order.push(id);for(const next of adj.get(id)){indegree.set(next,indegree.get(next)-1);if(indegree.get(next)===0)queue.push(next);}}
 if(order.length!==graph.nodes.length)throw Error('Cycles are not supported');
 return {order,adj};
}
const get=(value,path)=>{if(!/^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*){0,5}$/.test(path))return undefined;return path.split('.').reduce((v,k)=>v&&typeof v==='object'&&Object.hasOwn(v,k)?v[k]:undefined,value);};
export async function executeGraph(graph,input,{dryRun=true,notificationUrl}={}){
 const {order,adj}=validateGraph(graph),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const received=new Map(),trace=[],outputs={};let calls=0;
 for(const id of order){
  const n=byId.get(id),incoming=received.get(id)||[];
  if(incoming.length===0 && graph.edges.some(e=>e.to===id)){trace.push({id,type:n.type,status:'skipped',reason:'No active incoming branch'});continue;}
  const value=incoming.length>1?{items:incoming}:incoming.length===1?incoming[0]:input;
  const config=n.config||{};let output=value,active=true,status='completed',reason;
  switch(n.type){
   case 'webhook':break;
   case 'filter':{
    const rule=String(config.operation||'').trim();
    if(rule==='approved'||rule==='rejected')active=get(value,'status')===rule;
    else if(rule.startsWith('status='))active=get(value,'status')===rule.slice(7).trim();
    else if(rule && rule!=='always')throw Error('Unsupported condition at '+id+'. Use always, approved, rejected or status=value');
    output=value;break;
   }
   case 'flux':{
    // Safe declarative transforms, not execution of arbitrary Flux source.
    const rule=String(config.operation||'').trim();
    if(rule==='pick'){const path=String(config.mapping||'').trim();output=get(value,path);if(output===undefined)output=null;}
    else if(rule==='count')output={count:Array.isArray(value?.items)?value.items.length:1};
    else if(rule==='pass'||rule==='')output=value;
    else throw Error('Unsupported Flux transform at '+id+'. Use pass, pick or count');
    break;
   }
   case 'merge':output={items:incoming};break;
   case 'log':break;
   case 'http':{
    // Only a preconfigured server-side destination; never trust URL from graph.
    if(!notificationUrl){status='skipped';reason='Server HTTP destination not configured';break;}
    if(dryRun){status='simulated';reason='Dry run: HTTP POST not sent';break;}
    if(++calls>3)throw Error('HTTP action limit exceeded');
    const res=await fetch(notificationUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event:'flux.workflow.http',block:id,data:value}),signal:AbortSignal.timeout(4000),redirect:'error'});
    if(!res.ok)throw Error('HTTP action failed at '+id+' (HTTP '+res.status+')');
    output={delivered:true,status:res.status};break;
   }
   default:status='skipped';reason='Connector not implemented';
  }
  trace.push({id,type:n.type,status:active?status:'filtered',...(reason?{reason}:{})});
  if(!active||status==='skipped')continue;
  outputs[id]=output;
  for(const next of adj.get(id))received.set(next,[...(received.get(next)||[]),output]);
 }
 return {ok:true,dryRun,trace,outputs};
}
