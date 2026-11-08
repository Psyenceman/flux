export function miroResourceController({draft,needsCard,load,render}){
 let boardRevision=0,cardRevision=0,disposed=false,cardsFor='';
 let state={boards:[],cards:[],board:draft.board||'',card:draft.itemId||'',boardCursor:'',cardCursor:'',loadingBoards:false,loadingCards:false,error:''};
 const publish=()=>{if(!disposed)render({...state,ready:ready()});};
 function ready(){return !state.loadingBoards&&!state.loadingCards&&state.boards.some(x=>x.id===state.board)&&(!needsCard||state.cards.some(x=>x.id===state.card));}
 async function cards(more=false){
  if(disposed||!state.board||more&&(state.loadingCards||!state.cardCursor))return;
  const version=++cardRevision,board=state.board,cursor=more?state.cardCursor:'';
  cardsFor=board;state={...state,loadingCards:true,error:'',...(more?{}:{cards:[],cardCursor:''})};publish();
  try{
   const data=await load('cards',board,cursor);if(disposed||version!==cardRevision||board!==state.board)return;
   const items=[...new Map([...state.cards,...data.items].map(x=>[x.id,x])).values()];
   state={...state,cards:items,cardCursor:data.nextCursor||'',loadingCards:false};
   const match=items.find(x=>x.id===state.card);if(match)draft.cardName=match.name;publish();
  }catch(error){if(!disposed&&version===cardRevision){state={...state,loadingCards:false,error:error.message};publish();}}
 }
 async function boards(more=false){
  if(disposed||more&&(state.loadingBoards||!state.boardCursor))return;
  const version=++boardRevision,cursor=more?state.boardCursor:'';
  if(!more){cardRevision++;cardsFor='';state={...state,boards:[],cards:[],boardCursor:'',cardCursor:'',loadingCards:false};}
  state={...state,loadingBoards:true,error:''};publish();
  try{
   const data=await load('boards','',cursor);if(disposed||version!==boardRevision)return;
   const items=[...new Map([...state.boards,...data.items].map(x=>[x.id,x])).values()];
   state={...state,boards:items,boardCursor:data.nextCursor||'',loadingBoards:false,error:data.truncated?'Board list limit reached. Narrow access in your Miro integration.':''};
   const match=items.find(x=>x.id===state.board);if(match)draft.boardName=match.name;publish();
   if(match&&needsCard&&cardsFor!==state.board)await cards();
  }catch(error){if(!disposed&&version===boardRevision){state={...state,loadingBoards:false,error:error.message};publish();}}
 }
 async function selectBoard(id){
  if(disposed||state.loadingBoards)return;
  const match=state.boards.find(x=>x.id===id);cardRevision++;cardsFor='';
  draft.board=match?.id||'';draft.boardName=match?.name||'';draft.itemId='';draft.cardName='';
  state={...state,board:match?.id||'',card:'',cards:[],cardCursor:'',loadingCards:false,error:''};publish();
  if(match&&needsCard)await cards();
 }
 function selectCard(id){if(disposed||state.loadingCards)return;const match=state.cards.find(x=>x.id===id);draft.itemId=match?.id||'';draft.cardName=match?.name||'';state={...state,card:match?.id||''};publish();}
 return {refresh:()=>boards(),moreBoards:()=>boards(true),moreCards:()=>cards(true),selectBoard,selectCard,validate:()=>ready()?'':needsCard?'Choose an available Miro board and card before saving.':'Choose an available Miro board before saving.',dispose:()=>{disposed=true;boardRevision++;cardRevision++;}};
}
if(typeof window!=='undefined')window.FluxMiroResources=miroResourceController;
