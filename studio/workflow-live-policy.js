// Shared by the editor and authenticated TEST endpoint. API/webhook/scheduler remain unchanged.
export function liveWorkflowKind(graph){
 const nodes=graph?.nodes,edges=graph?.edges;
 if(!Array.isArray(nodes)||!Array.isArray(edges)||nodes.some(n=>!n||typeof n!=='object'))return null;
 if(nodes.length===1&&edges.length===0&&nodes[0].type==='trello'&&nodes[0].config?.operation==='create_card')return 'trello';
 const local=new Set(['manual','mapper','filter','router','merge','log','flux']);
 const reads={trello:'read_list',github:'list_issues',notion:'search_pages',airtable:'find_records',hubspot:'search_contacts',miro:'find_items'};
 let sends=0,external=0,kind='';
 for(const n of nodes){
  if(local.has(n.type))continue;
  external++;
  if(n.type==='slack'&&['send','list_channels'].includes(n.config?.operation||'send')){if((n.config?.operation||'send')==='send'){sends++;kind='slack';}continue;}
  if(n.type==='github'&&n.config?.operation==='create_issue'){sends++;kind='github';continue;}
  if(n.type==='miro'&&['create_card','update_item'].includes(n.config?.operation)){sends++;kind='miro';continue;}
  if(!reads[n.type]||(n.config?.operation||reads[n.type])!==reads[n.type])return null;
 }
 return sends===1&&external<=3?kind:null;
}
