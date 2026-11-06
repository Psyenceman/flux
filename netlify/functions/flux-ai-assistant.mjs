import {validateGraph} from './flux-graph-engine.mjs';
const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
const SUPABASE_URL='https://sgxinvmfkznzoueqjzop.supabase.co';
const SUPABASE_PUBLIC_KEY='sb_publishable_vcqHLVzTy3u1Ozk9N1YBiQ_iuIhsOHu';
const allowed=['manual','webhook','filter','mapper','flux','log','merge','delay','trello','airtable','sheets','supabase','hubspot','http','telegram','resend'];
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 if(process.env.FLUX_AI_ENABLED!=='true')return json(503,{ok:false,error:'Flux AI is not active. AI generation will be enabled after billing controls are ready.',code:'AI_DISABLED'});
 if(event.isBase64Encoded||String(event.body||'').length>12000)return json(413,{ok:false,error:'Request too large'});
 const authorization=event.headers?.authorization||event.headers?.Authorization||'';
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(authorization))return json(401,{ok:false,error:'Sign in to use Flux AI Assistant'});
 let authenticated=false;
 try{
  const response=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_PUBLIC_KEY,authorization},signal:AbortSignal.timeout(5000)});
  if(response.ok){const user=await response.json();authenticated=Boolean(user?.id&&user?.aud==='authenticated');}
 }catch{return json(503,{ok:false,error:'Authentication temporarily unavailable'});}
 if(!authenticated)return json(401,{ok:false,error:'Session expired'});
 let request;try{request=JSON.parse(event.body||'{}');}catch{return json(400,{ok:false,error:'Invalid JSON'});}
 const goal=String(request?.goal||'').trim();
 if(goal.length<10||goal.length>1500)return json(422,{ok:false,error:'Describe your automation in 10–1500 characters'});
 const key=process.env.FLUX_AI_API_KEY;
 if(!key)return json(503,{ok:false,error:'Flux AI is not configured on the TEST server yet',code:'AI_NOT_CONFIGURED'});
 const model=process.env.FLUX_AI_MODEL||'gpt-4o-mini';
 const system='You are Flux Studio workflow planner. Return ONLY a JSON object with keys explanation (short string),warnings (array of strings),graph. graph must have version 1, nodes array and edges array. Each node: id (n1,n2...),type,label,x,y,config. Allowed types: '+allowed.join(', ')+'. Build a safe directed acyclic workflow with 2–12 nodes. x begins at 120 and increments by 230; y starts at 180. Do not invent connection IDs, tokens, passwords, URLs, record IDs, base IDs, spreadsheet IDs, tables or destinations. Leave missing settings empty and explain them in warnings. Use a manual trigger if no supported trigger exists. Never include credentials. No execution. No unsafe operations. Respond in the language of the user.';
 let response;
 try{response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({model,temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:goal}],max_tokens:2200}),redirect:'error',signal:AbortSignal.timeout(20000)});}
 catch{return json(502,{ok:false,error:'AI provider temporarily unavailable'});}
 if(!response.ok)return json(502,{ok:false,error:'AI provider request failed (HTTP '+response.status+')'});
 let proposal;
 try{const data=await response.json();proposal=JSON.parse(data.choices?.[0]?.message?.content||'');}catch{return json(502,{ok:false,error:'AI response could not be parsed'});}
 try{
  const graph=proposal.graph;
  if(!graph||graph.nodes.length<1||graph.nodes.length>12||graph.nodes.some(n=>!allowed.includes(n.type)))throw Error('Unsupported AI-generated blocks');
  validateGraph(graph);
  for(const node of graph.nodes){
   if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(node.id)||typeof node.label!=='string'||node.label.length>80||!Number.isFinite(node.x)||!Number.isFinite(node.y))throw Error('Invalid block fields');
   if(!node.config||typeof node.config!=='object'||Array.isArray(node.config))throw Error('Invalid configuration');
   for(const [k,v] of Object.entries(node.config)){if(/token|secret|password|api.?key/i.test(k)||typeof v!=='string'&&typeof v!=='number'&&typeof v!=='boolean'||typeof v==='string'&&v.length>2000)throw Error('Unsafe configuration');}
  }
  return json(200,{ok:true,graph,explanation:String(proposal.explanation||'Workflow preview').slice(0,1000),warnings:Array.isArray(proposal.warnings)?proposal.warnings.slice(0,12).map(v=>String(v).slice(0,240)):[],mode:'ai-preview',executed:false});
 }catch{return json(422,{ok:false,error:'AI proposed an invalid workflow. Please try a more specific request.'});}
}
