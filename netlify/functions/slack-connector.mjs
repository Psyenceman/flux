// Personal bot credentials only; no graph-controlled URLs or automatic retries.
const channelPattern=/^[CG][A-Z0-9]{8,24}$/;
const errors={invalid_auth:'Reconnect Slack in My connections',token_revoked:'Reconnect Slack in My connections',account_inactive:'Reconnect Slack in My connections',missing_scope:'Slack permission missing. Add channels:read and chat:write to your bot app, then reconnect',not_in_channel:'Invite your Slack bot to the selected channel first',channel_not_found:'Slack channel unavailable. Refresh channels and choose again',is_archived:'Choose an active Slack channel',restricted_action:'Slack workspace policy does not allow this action',ratelimited:'Slack request limit reached. Try again later'};
async function request(method,token,query,body){
 if(!token?.startsWith('xoxb-'))throw Error('Connect a Slack bot token in My connections');
 const url=new URL('https://slack.com/api/'+method);
 for(const [key,value] of Object.entries(query||{}))if(value)url.searchParams.set(key,value);
 let response;try{response=await fetch(url,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json; charset=utf-8'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error(body?'Slack delivery could not be confirmed. Check the channel before retrying.':'Slack is temporarily unavailable. Try again.');}
 if(!response.ok)throw Error(response.status===429?errors.ratelimited:'Slack request failed (HTTP '+response.status+')');
 let data;try{data=await response.json();}catch{throw Error('Slack returned an invalid response');}
 if(data?.ok!==true)throw Error(errors[data?.error]||'Slack rejected the request. Check bot permissions and channel access.');
 return data;
}
export function validateSlackConfig(config){
 const operation=config.operation||'send';
 if(!['send','list_channels'].includes(operation))throw Error('Slack: unsupported action');
 if(operation==='send'){
  if(!channelPattern.test(String(config.channel||'')))throw Error('Slack: choose an available channel');
  if(typeof config.message!=='string'||!config.message.trim()||config.message.length>4000)throw Error('Slack: message must contain 1–4000 characters');
 }
}
export async function listSlackChannels(token,cursor=''){
 if(typeof cursor!=='string'||cursor.length>500||/[\r\n]/.test(cursor))throw Error('Invalid Slack page');
 const data=await request('conversations.list',token,{types:'public_channel',exclude_archived:'true',limit:'100',cursor});
 if(!Array.isArray(data.channels))throw Error('Slack returned an invalid channel list');
 const items=data.channels.filter(c=>c&&channelPattern.test(c.id)&&typeof c.name==='string'&&c.is_member===true&&!c.is_archived&&!c.is_private).map(c=>({id:c.id,name:c.name.slice(0,100)}));
 const nextCursor=typeof data.response_metadata?.next_cursor==='string'?data.response_metadata.next_cursor.trim():'';
 if(nextCursor.length>500)throw Error('Slack returned an invalid page');
 return {source:'slack',operation:'list_channels',items,count:items.length,nextCursor,hasMore:Boolean(nextCursor)};
}
export async function checkSlackChannel(token,channel){
 if(!channelPattern.test(String(channel||'')))throw Error('Slack: choose an available channel');
 const data=await request('conversations.info',token,{channel});
 if(data.channel?.id!==channel||data.channel.is_member!==true||data.channel.is_archived||data.channel.is_im||data.channel.is_mpim||data.channel.is_private)throw Error('Choose an active public channel your Slack bot has joined');
 return {id:channel,name:String(data.channel.name||'').slice(0,100)};
}
export async function sendSlackMessage(config,token){
 validateSlackConfig(config);
 const selected=await checkSlackChannel(token,config.channel);
 // Plain text: suppress mentions and link previews generated from upstream data.
 const text=config.message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const data=await request('chat.postMessage',token,null,{channel:config.channel,text,mrkdwn:false,parse:'none',link_names:false,unfurl_links:false,unfurl_media:false});
 if(data.channel!==config.channel||typeof data.ts!=='string'||!/^\d+\.\d+$/.test(data.ts))throw Error('Slack delivery response incomplete. Check the channel before retrying.');
 return {source:'slack',operation:'send',channel:data.channel,channelName:selected.name,messageId:data.ts,delivered:true};
}
