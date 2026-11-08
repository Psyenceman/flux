// Cursor pagination and stale-response protection independent of the DOM.
export function resourceChoiceController({draft,load,render,key="channel",nameKey="channelName",invalidMessage="Choose an available Slack channel. Connect your bot and refresh channels first."}){
 let revision=0,disposed=false;
 let state={items:[],selected:draft[key]||'',loading:false,error:'',cursor:'',more:false,ready:false};
 const publish=()=>{if(!disposed)render({...state});};
 async function refresh(more=false){
  if(disposed||more&&(state.loading||!state.more))return;
  const version=++revision,cursor=more?state.cursor:'';
  state={...state,loading:true,error:'',ready:false,...(more?{}:{items:[],cursor:'',more:false})};publish();
  try{
   const data=await load(cursor);if(disposed||version!==revision)return;
   const items=[...new Map([...state.items,...data.items].map(x=>[x.id,x])).values()];
   const match=items.find(x=>x.id===state.selected);
   state={...state,items,cursor:data.nextCursor||'',more:Boolean(data.nextCursor),loading:false,ready:Boolean(match)};
   if(match)draft[nameKey]=match.name;
   publish();
  }catch(error){if(!disposed&&version===revision){state={...state,loading:false,error:error.message,ready:false};publish();}}
 }
 function select(id){
  if(disposed||state.loading)return;
  const item=state.items.find(x=>x.id===id);
  if(!item){draft[key]='';draft[nameKey]='';state={...state,selected:'',ready:false};publish();return;}
  draft[key]=item.id;draft[nameKey]=item.name;state={...state,selected:id,ready:true};publish();
 }
 return {refresh,more:()=>refresh(true),select,validate:()=>state.ready?'':invalidMessage,dispose:()=>{disposed=true;revision++;}};
}
