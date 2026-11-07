export const TOKEN_PROVIDERS=Object.freeze(['airtable','hubspot','notion','github','miro','slack','openai','cloudflare','resend']);
export async function verifyCredential(provider,token){
 const destinations={airtable:'https://api.airtable.com/v0/meta/whoami',hubspot:'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',notion:'https://api.notion.com/v1/users/me',github:'https://api.github.com/user',miro:'https://api.miro.com/v2/boards?limit=1',slack:'https://slack.com/api/auth.test',openai:'https://api.openai.com/v1/models',cloudflare:'https://api.cloudflare.com/client/v4/user/tokens/verify',resend:'https://api.resend.com/domains'};
 if(!TOKEN_PROVIDERS.includes(provider))throw Error('Unsupported provider');
 const response=await fetch(destinations[provider],{method:provider==='slack'?'POST':'GET',headers:{authorization:'Bearer '+token,...(provider==='notion'?{'Notion-Version':'2022-06-28'}:{}),...(provider==='github'?{accept:'application/vnd.github+json','User-Agent':'Flux-Studio-TEST','X-GitHub-Api-Version':'2022-11-28'}:{})},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)return false;
 const data=await response.json();
 if(provider==='slack')return data.ok===true;
 if(provider==='cloudflare')return data.success===true&&data.result?.status==='active';
 if(provider==='github')return typeof data.login==='string'&&typeof data.id==='number';
 if(['miro','openai','resend'].includes(provider))return Array.isArray(data.data);
 if(provider==='notion')return data.object==='user';
 if(provider==='airtable')return typeof data.id==='string';
 return Array.isArray(data.results);
}
