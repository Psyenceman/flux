// Flux graph executor v0.1. No eval, arbitrary code execution or user-defined outbound URLs.
export function validateGraph(graph){
 if(!graph||graph.version!==1||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error('Invalid graph');
 if(graph.nodes.length>80||graph.edges.length>300)throw Error('Workflow exceeds execution limits');
 if(JSON.stringify(graph).length>120000)throw Error('Workflow payload exceeds execution limits');
 const ids=new Set();
 const allowed=new Set(['webhook','filter','flux','log','merge','http','airtable','trello','miro','slack','email','database','delay','manual','schedule','router','mapper','loop','sheets','drive','github','wordpress','telegram','resend','discord','whatsapp','notion','calendar','stripe','hubspot','shopify','openai','supabase','cloudflare']);
 for(const n of graph.nodes){if(!n||typeof n.id!=='string'||n.id.length>80||ids.has(n.id)||!allowed.has(n.type))throw Error('Invalid or duplicate block');if(n.config!==undefined&&(!n.config||typeof n.config!=='object'||Array.isArray(n.config)))throw Error('Invalid configuration at '+n.id);ids.add(n.id);}
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
export async function executeGraph(graph,input,{dryRun=true,notificationUrl,trelloAccessToken,telegramToken,telegramChatId,resendApiKey,resendFrom}={}){
 const {order,adj}=validateGraph(graph),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const received=new Map(),trace=[],outputs={};let calls=0;const ancestors=new Map();for(const id of order){const set=new Set();for(const e of graph.edges.filter(e=>e.to===id)){set.add(e.from);for(const a of ancestors.get(e.from)||[])set.add(a);}ancestors.set(id,set);}
 for(const id of order){
  const n=byId.get(id),incoming=received.get(id)||[];
  if(incoming.length===0 && graph.edges.some(e=>e.to===id)){trace.push({id,type:n.type,status:'skipped',reason:'No active incoming branch'});continue;}
  const value=incoming.length>1?{items:incoming}:incoming.length===1?incoming[0]:input;
  const config=n.config||{};let output=value,active=true,status='completed',reason;
  try{switch(n.type){
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
    const listId=String(config.list||config.connection||'').trim();
    if(!/^[a-f0-9]{24}$/i.test(listId))throw Error('Trello block '+id+': choose a Trello list first');
    if(!trelloAccessToken){status='skipped';reason='Connect your Trello account to read cards';output={source:'trello',listId,items:[],count:0,simulated:true};break;}
    if(++calls>3)throw Error('External read limit exceeded');
    const url=new URL('https://api.trello.com/1/lists/'+listId+'/cards');
    url.searchParams.set('fields','id,name,url,closed,due,idList');
    url.searchParams.set('limit','20');
    const response=await fetch(url,{method:'GET',headers:{authorization:'Bearer '+trelloAccessToken},signal:AbortSignal.timeout(10000),redirect:'error'});
    if(!response.ok)throw Error('Trello read failed at '+id+' (HTTP '+response.status+')');
    const cards=await response.json();
    if(!Array.isArray(cards))throw Error('Unexpected Trello response at '+id);
    output={source:'trello',listId,count:cards.length,items:cards.map(c=>({id:c.id,name:c.name,url:c.url,due:c.due,idList:c.idList}))};
    reason=dryRun?'Read-only TEST: Trello cards fetched; no external changes made':'';
    break;
   }
   case 'telegram':{
    const chatId=String(config.chatId||telegramChatId||'').trim();
    const message=String(config.message||'').trim();
    if(!message||message.length>4000)throw Error('Telegram: message must contain 1–4000 characters');
    if(!chatId||!/^-?[0-9]{5,20}$/.test(chatId))throw Error('Telegram: valid numeric chat ID required');
    if(!telegramChatId||chatId!==String(telegramChatId))throw Error('Telegram: chat ID must match the server-approved destination');
    if(dryRun){status='simulated';reason='Dry run: Telegram message not sent';break;}
    if(!telegramToken){status='skipped';reason='Telegram bot token not configured on server';break;}
    if(++calls>3)throw Error('External action limit exceeded');
    const response=await fetch('https://api.telegram.org/bot'+encodeURIComponent(telegramToken)+'/sendMessage',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message}),
      redirect:'error',signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)throw Error('Telegram send failed (HTTP '+response.status+')');
    const result=await response.json();if(!result.ok)throw Error('Telegram rejected the message');
    output={delivered:true,provider:'telegram'};break;
   }
   case 'resend':{
    const recipient=String(config.recipient||'').trim(),subject=String(config.subject||'').trim(),message=String(config.message||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||recipient.length>254)throw Error('Resend: valid recipient email required');
    if(!subject||subject.length>200||!message||message.length>12000)throw Error('Resend: subject (1–200) and message (1–12000) required');
    if(dryRun){status='simulated';reason='Dry run: email not sent';break;}
    if(!resendApiKey||!resendFrom){status='skipped';reason='Resend credentials not configured on server';break;}
    if(++calls>3)throw Error('External action limit exceeded');
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{authorization:'Bearer '+resendApiKey,'content-type':'application/json'},
      body:JSON.stringify({from:resendFrom,to:[recipient],subject,text:message}),
      redirect:'error',signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)throw Error('Resend send failed (HTTP '+response.status+')');
    output={delivered:true,provider:'resend'};break;
   }
   case 'merge':output={items:incoming};break;
   case 'schedule':status='skipped';reason='Automatic scheduling requires a server scheduler';break;
   case 'delay':{
    const ms=Number(config.milliseconds??config.duration??0);
    if(!Number.isInteger(ms)||ms<0||ms>2000)throw Error('Delay block '+id+': duration must be 0–2000 milliseconds');
    if(dryRun){status='simulated';reason='Dry run: would wait '+ms+' ms';}
    else {await new Promise(resolve=>setTimeout(resolve,ms));reason='Waited '+ms+' ms';}
    break;
   }
   case 'log':{
    const message=String(config.message||'').slice(0,500);
    output={...((value&&typeof value==='object'&&!Array.isArray(value))?value:{value}),logMessage:message};
    break;
   }
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
  }catch(error){
   const message=error instanceof Error?error.message:'Unknown execution error';
   trace.push({id,type:n.type,status:'failed',reason:message.slice(0,240)});
   return {ok:false,dryRun,failedBlock:id,error:message.slice(0,240),trace,outputs};
  }
  trace.push({id,type:n.type,status:active?status:'filtered',...(reason?{reason}:{})});
  if(!active||status==='skipped')continue;
  outputs[id]=output;
  for(const next of adj.get(id))received.set(next,[...(received.get(next)||[]),output]);
 }
 return {ok:true,dryRun,trace,outputs};
}
