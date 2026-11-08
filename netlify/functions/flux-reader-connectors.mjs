import {githubRepository} from './github-connector.mjs';
// Fixed provider endpoints; graph data never supplies request URLs or credentials.
export async function readGithubIssues(config,token){
 const repository=githubRepository(config.repository);
 if(config.operation&&config.operation!=='list_issues')throw Error('GitHub: only reading issues is enabled');
 const response=await fetch('https://api.github.com/repos/'+repository+'/issues?state=open&per_page=20',{headers:{...(token?{authorization:'Bearer '+token}:{}),accept:'application/vnd.github+json','User-Agent':'Flux-Studio-TEST','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(response.status===404?'GitHub: repository not found or access denied':response.status===403||response.status===429?'GitHub: request limit reached. Try again later.':'GitHub read failed (HTTP '+response.status+')');
 const rows=await response.json();if(!Array.isArray(rows))throw Error('GitHub: invalid issues response');
 const items=rows.filter(x=>!x.pull_request).slice(0,20).map(x=>({id:x.id,number:x.number,title:String(x.title||'').slice(0,500),state:x.state,url:x.html_url}));
 return {source:'github',operation:'list_issues',repository,items,count:items.length,hasMore:response.headers.get('link')?.includes('rel="next"')||false};
}
export async function searchNotionPages(config,token){
 if(!token)throw Error('Connect Notion in My connections before running this step');
 if(config.operation&&config.operation!=='search_pages')throw Error('Notion: only page search is enabled');
 const query=String(config.query||'').trim();if(query.length>200)throw Error('Notion: search must be at most 200 characters');
 const response=await fetch('https://api.notion.com/v1/search',{method:'POST',headers:{authorization:'Bearer '+token,'Notion-Version':'2022-06-28','content-type':'application/json'},body:JSON.stringify({query,page_size:20,filter:{value:'page',property:'object'}}),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(response.status===401||response.status===403?'Notion: reconnect your integration and share the required pages':'Notion search failed (HTTP '+response.status+')');
 const data=await response.json();if(!Array.isArray(data.results))throw Error('Notion: invalid search response');
 const items=data.results.slice(0,20).map(page=>{const title=Object.values(page.properties||{}).find(p=>p?.type==='title');return {id:page.id,title:(title?.title||[]).map(t=>t.plain_text||t.text?.content||'').join('').slice(0,500),url:page.url};});
 return {source:'notion',operation:'search_pages',items,count:items.length,hasMore:data.has_more===true};
}
