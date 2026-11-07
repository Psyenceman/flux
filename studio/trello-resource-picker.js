/* UX-02: race-safe resource selection. No credentials or provider IDs are rendered as labels. */
window.FluxTrelloResources = function ({draft, load, render}) {
 let revision=0, disposed=false, desiredList=draft.list||'';
 let state={boards:[],lists:[],board:draft.board||'',list:draft.list||'',loading:false,error:'',ready:false};
 const publish=()=>{if(!disposed)render({...state});};
 async function selectBoard(board,restore=''){
  const request=++revision;
  desiredList=restore;
  state={...state,board,list:'',lists:[],loading:Boolean(board),error:'',ready:false};
  draft.board=board;draft.list='';draft.connection='';publish();
  if(!board)return;
  try{
   const items=await load('lists',board);
   if(disposed||request!==revision)return;
   const list=items.some(x=>x.id===restore)?restore:'';
   state={...state,lists:items,list,loading:false,ready:Boolean(list)};
   draft.list=list;draft.connection=list;publish();
  }catch(error){if(!disposed&&request===revision){state={...state,loading:false,error:error.message};publish();}}
 }
 async function refresh(){
  const request=++revision,previous=desiredList;
  state={...state,loading:true,error:'',ready:false};publish();
  try{
   const boards=await load('boards');
   if(disposed||request!==revision)return;
   state={...state,boards,loading:false};
   const board=boards.some(x=>x.id===state.board)?state.board:'';
   await selectBoard(board,previous);
  }catch(error){if(!disposed&&request===revision){state={...state,loading:false,error:error.message};publish();}}
 }
 function selectList(list){
  if(disposed||state.loading||!state.lists.some(x=>x.id===list))return;
  desiredList=list;state={...state,list,ready:true};draft.list=list;draft.connection=list;publish();
 }
 return {refresh,selectBoard,selectList,validate:()=>state.ready?'':'Choose an available Trello board and list before saving.',dispose:()=>{disposed=true;revision++;}};
};
