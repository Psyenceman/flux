// Flux graph executor v0.1. No eval, arbitrary code execution or user-defined outbound URLs.
export function validateGraph(graph){
 if(!graph||graph.version!==1||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Invalid graph');
 if(graph.nodes.length>80||graph.edges.length>300)throw Error('Graph exceeds execution limits');
 const ids=new Set();
 const allowed=new Set(['webhook','filter','flux','log','merge','http','airtable','trello','miro','slack','email','database','delay','manual','schedule','router','mapper','loop','sheets','drive','github','wordpress']);
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
function resolveTemplate(template,outputs,input,allowed){
 if(typeof template!=='string'||template.length>4000)throw Error('Invalid mapping expression');
 const exact=template.match(/^\{\{(input|[a-zA-Z][\w]{0,79})\.([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*){0,5})\}\}$/);
 const resolve=(id,path)=>{if(id!=='input'&&!allowed.has(id))throw Error('Mapping references an unconnected block: '+id);const source=id==='input'?input:outputs[id];return get(source,path)??null;};
 if(exact)return resolve(exact[1],exact[2]);
 return template.replace(/\{\{(input|[a-zA-Z][\w]{0,79})\.([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*){0,5})\}\}/g,(_,id,path)=>String(resolve(id,path)??''));
}
function applyMapping(mapping,outputs,input,allowed){
 let spec;try{spec=JSON.parse(mapping);}catch{throw Error('Data Mapper expects a JSON object mapping fields to values');}
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||Object.keys(spec).length>30)throw Error('Invalid Data Mapper object');
 const result={};for(const [key,val] of Object.entries(spec)){if(!/^[a-zA-Z_][\w]{0,63}$/.test(key)||typeof val!=='string')throw Error('Invalid Data Mapper field');result[key]=resolveTemplate(val,outputs,input,allowed);}
 return result;
}
export async function executeGraph(graph,input,{dryRun=true,notificationUrl,trelloKey,trelloToken}={}){
 const {order,adj}=validateGraph(graph),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const received=new Map(),trace=[],outputs={};let calls=0;const ancestors=new Map();for(const id of order){const set=new Set();for(const e of graph.edges.filter(e=>e.to===id)){set.add(e.from);for(const a of ancestors.get(e.from)||[])set.add(a);}ancestors.set(id,set);}
 for(const id of order){
  const n=byId.get(id),incoming=received.get(id)||[];
  if(incoming.length===0 && graph.edges.some(e=>e.to===id)){trace.push({id,type:n.type,status:'skipped',reason:'No active incoming branch'});continue;}
  const value=incoming.length>1?{items:incoming}:incoming.length===1?incoming[0]:input;
  const config=n.config||{};let output=value,active=true,status='completed',reason;
  switch(n.type){
   case 'webhook':case 'manual':break;
   case 'mapper':output=applyMapping(String(config.mapping||'{}'),outputs,input,ancestors.get(id));break;
   case 'filter':{
    if(config.field){
      const field=String(config.field),op=String(config.operator||'equals'),expected=String(config.value??'');
      const actual=get(value,field);
      if(actual===undefined&&op!=='exists')throw Error('Condition field not found at '+id);
      if(op==='equals')active=String(actual)===expected;
      else if(op==='not_equals')active=String(actual)!==expected;
      else if(op==='contains')active=String(actual).includes(expected);
      else if(op==='exists')active=actual!==undefined&&actual!==null;
      else if(op==='greater_than'||op==='less_than'){
        const a=Number(actual),b=Number(expected);
        if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Condition requires numeric values at '+id);
        active=op==='greater_than'?a>b:a<b;
      }else throw Error('Unsupported comparison at '+id);
      output=value;break;
    }
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
   case 'trello':{
    const listId=String(config.connection||'').trim();
    if(!/^[a-f0-9]{24}$/i.test(listId))throw Error('Trello block '+id+': enter a valid Trello list ID in Connection reference');
    if(dryRun){output={source:'trello',listId,items:[],count:0,simulated:true};status='simulated';reason='Dry run: Trello was not contacted';break;}
    if(!trelloKey||!trelloToken){status='skipped';reason='Trello credentials not configured on server';break;}
    if(++calls>3)throw Error('External action limit exceeded');
    const url=new URL('https://api.trello.com/1/lists/'+listId+'/cards');
    url.searchParams.set('fields','id,name,url,closed,due,idList');
    url.searchParams.set('limit','20');
    url.searchParams.set('key',trelloKey);url.searchParams.set('token',trelloToken);
    const response=await fetch(url,{method:'GET',signal:AbortSignal.timeout(5000),redirect:'error'});
    if(!response.ok)throw Error('Trello read failed at '+id+' (HTTP '+response.status+')');
    const cards=await response.json();
    if(!Array.isArray(cards))throw Error('Unexpected Trello response at '+id);
    output={source:'trello',listId,count:cards.length,items:cards.map(c=>({id:c.id,name:c.name,url:c.url,due:c.due,idList:c.idList}))};
    break;
   }
   case 'merge':output={items:incoming};break;
   case 'schedule':status='simulated';reason='Schedule configuration saved; automatic scheduling requires a server scheduler';break;
   case 'delay':status='simulated';reason='Delay configuration saved; execution is not paused';break;
   case 'log':break;
   case 'http':{
    // Only a preconfigured server-side destination; never trust URL from graph.
    if(!notificationUrl){status='skipped';reason='Server HTTP destination not configured';break;}
    if(config.method&&String(config.method).toUpperCase()!=='POST')throw Error('HTTP block '+id+': only POST is supported by the server');
    if(config.url&&String(config.url)!==notificationUrl)throw Error('HTTP block '+id+': URL must match the server-configured destination');
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
