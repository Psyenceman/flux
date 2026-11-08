// Stable v2 APIs. No graph-supplied URLs, credentials, retries or arbitrary item writes.
const boardPattern=/^[A-Za-z0-9_+=-]{6,100}$/;
const cardPattern=/^[0-9]{1,30}$/;
const plain=value=>String(value||'').replace(/<[^>]*>/g,'').slice(0,2000);
const html=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function request(path,token,{query={},method='GET',body}={}){
 if(!token)throw Error('Connect Miro in My connections first');
 const url=new URL('https://api.miro.com/v2/'+path);
 for(const [key,value] of Object.entries(query))if(value!==undefined&&value!=='')url.searchParams.set(key,String(value));
 let response;try{response=await fetch(url,{method,headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error(method==='GET'?'Miro is temporarily unavailable. Try again.':'Miro action could not be confirmed. Check the board before retrying.');}
 if(!response.ok)throw Error(response.status===401?'Reconnect Miro in My connections':response.status===403?'Miro access denied. Check board access and boards:read / boards:write permissions':response.status===404?'Miro board or card is no longer available. Refresh your selection':response.status===429?'Miro request limit reached. Try again later':'Miro request failed (HTTP '+response.status+')');
 let data;try{data=await response.json();}catch{throw Error('Miro returned an invalid response');}
 if(!data||typeof data!=='object')throw Error('Miro returned an invalid response');
 return data;
}
export function validateMiroConfig(config){
 const operation=config.operation||'find_items';
 if(!['find_items','create_card','update_item'].includes(operation))throw Error('Miro: unsupported action');
 if(!boardPattern.test(String(config.board||'')))throw Error('Miro: choose an available board');
 if(operation==='find_items'&&String(config.query||'').length>200)throw Error('Miro: title filter must be at most 200 characters');
 if(operation==='update_item'&&!cardPattern.test(String(config.itemId||'')))throw Error('Miro: choose an available card');
 if(operation!=='find_items'&&(typeof config.title!=='string'||!config.title.trim()||config.title.length>300))throw Error('Miro: card title must contain 1–300 characters');
 if(operation==='create_card'&&String(config.message||'').length>2000)throw Error('Miro: description must be at most 2000 characters');
}
export async function listMiroBoards(token,page='0'){
 if(!/^\d{1,5}$/.test(String(page))||Number(page)>9950)throw Error('Invalid Miro board page');
 const offset=Number(page),data=await request('boards',token,{query:{limit:50,offset}});
 if(!Array.isArray(data.data)||!Number.isFinite(data.total)||data.total<0)throw Error('Miro returned an invalid board list');
 const items=data.data.filter(x=>x&&typeof x.id==='string'&&boardPattern.test(x.id)&&typeof x.name==='string').slice(0,50).map(x=>({id:x.id,name:x.name.slice(0,150)}));
 const next=offset+50;
 return {items,nextCursor:next<data.total&&next<=9950?String(next):'',hasMore:next<data.total,truncated:next<data.total&&next>9950};
}
export async function listMiroCards(token,board,cursor=''){
 if(!boardPattern.test(String(board||''))||typeof cursor!=='string'||cursor.length>500||/[\r\n]/.test(cursor))throw Error('Invalid Miro resource selection');
 const data=await request('boards/'+encodeURIComponent(board)+'/items',token,{query:{type:'card',limit:50,cursor}});
 if(!Array.isArray(data.data))throw Error('Miro returned an invalid card list');
 const items=data.data.filter(x=>x?.type==='card'&&cardPattern.test(String(x.id||''))).slice(0,50).map(x=>({id:String(x.id),name:plain(x.data?.title).slice(0,150)||'Untitled card',title:plain(x.data?.title),description:plain(x.data?.description)}));
 const nextCursor=typeof data.cursor==='string'?data.cursor:'';
 if(nextCursor.length>500||/[\r\n]/.test(nextCursor))throw Error('Miro returned an invalid page');
 return {items,nextCursor,hasMore:Boolean(nextCursor)};
}
export async function checkMiroTarget(config,token){
 validateMiroConfig(config);
 const board=encodeURIComponent(config.board);
 const data=await request('boards/'+board+(config.operation==='update_item'?'/cards/'+config.itemId:''),token);
 if(config.operation==='update_item'){
  if(String(data.id)!==config.itemId||data.type!=='card')throw Error('Miro card is unavailable. Refresh your selection');
  return {id:config.itemId,name:plain(data.data?.title)};
 }
 if(data.id!==config.board)throw Error('Miro board is unavailable. Refresh your selection');
 return {id:data.id,name:String(data.name||'').slice(0,150)};
}
export async function executeMiro(config,token){
 validateMiroConfig(config);
 const operation=config.operation||'find_items';
 if(operation==='find_items'){
  const data=await listMiroCards(token,config.board),query=String(config.query||'').trim().toLowerCase();
  const items=data.items.filter(x=>!query||x.title.toLowerCase().includes(query));
  return {source:'miro',operation,board:config.board,items,count:items.length,hasMore:data.hasMore,nextCursor:data.nextCursor,scope:'First page of up to 50 cards'};
 }
 await checkMiroTarget(config,token);
 const card={title:html(config.title.trim()),...(operation==='create_card'?{description:html(String(config.message||''))}:{})};
 const data=await request('boards/'+encodeURIComponent(config.board)+'/cards'+(operation==='update_item'?'/'+config.itemId:''),token,{method:operation==='create_card'?'POST':'PATCH',body:{data:card}});
 if(!cardPattern.test(String(data.id||''))||data.type!=='card'||operation==='update_item'&&String(data.id)!==config.itemId)throw Error('Miro action response incomplete. Check the board before retrying.');
 return {source:'miro',operation,board:config.board,id:String(data.id),title:plain(data.data?.title||config.title),created:operation==='create_card',updated:operation==='update_item',url:'https://miro.com/app/board/'+encodeURIComponent(config.board)+'/'};
}
