export function githubRepository(value){
 const repository=String(value||'').trim().replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
 if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(repository)||['.','..'].includes(repository.split('/')[1]))throw Error('GitHub: enter a repository as owner/name or its GitHub URL');
 return repository;
}
export function validateGithubConfig(config){
 githubRepository(config.repository);
 if(!['list_issues','create_issue'].includes(config.operation||'list_issues'))throw Error('GitHub: unsupported action');
 if(config.operation==='create_issue'){
  if(typeof config.title!=='string'||!config.title.trim()||config.title.length>256)throw Error('GitHub: title must contain 1–256 characters');
  if(String(config.message||'').length>4000)throw Error('GitHub: description must be at most 4000 characters');
 }
}
async function request(path,token,body){
 if(!token)throw Error('Connect GitHub in My connections first');
 let response;try{response=await fetch('https://api.github.com/'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','User-Agent':'Flux-Studio-TEST','X-GitHub-Api-Version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error(body?'GitHub creation could not be confirmed. Check the repository before retrying.':'GitHub is temporarily unavailable. Try again.');}
 if(!response.ok)throw Error(response.status===401?'Reconnect GitHub in My connections':response.status===403?'GitHub access denied or request limit reached. Check repository permissions and try later':response.status===404?'GitHub repository unavailable. Check the repositories granted to your token':response.status===429?'GitHub request limit reached. Try again later':response.status===422?'GitHub rejected the issue. Check its fields and repository settings':'GitHub request failed (HTTP '+response.status+')');
 let data;try{data=await response.json();}catch{throw Error(body?'GitHub creation response incomplete. Check the repository before retrying.':'GitHub returned an invalid response');}return {data,response};
}
export async function listGithubRepositories(token,page='1'){
 if(!/^[1-9][0-9]{0,2}$/.test(String(page))||Number(page)>200)throw Error('Invalid GitHub repository page');
 const {data,response}=await request('user/repos?per_page=50&sort=full_name&direction=asc&page='+page,token);
 if(!Array.isArray(data))throw Error('GitHub returned an invalid repository list');
 const items=data.filter(r=>r&&typeof r.full_name==='string'&&r.has_issues===true&&!r.archived&&!r.disabled).slice(0,50).map(r=>({id:githubRepository(r.full_name),name:r.full_name,private:r.private===true}));
 const hasMore=response.headers.get('link')?.includes('rel="next"')||false;
 return {items,hasMore,nextCursor:hasMore&&Number(page)<200?String(Number(page)+1):'',truncated:hasMore&&Number(page)===200};
}
export async function checkGithubRepository(config,token){
 const repository=githubRepository(config.repository),{data}=await request('repos/'+repository,token);
 if(typeof data?.full_name!=='string'||data.full_name.toLowerCase()!==repository.toLowerCase()||data.has_issues!==true||data.archived||data.disabled)throw Error('Choose an active repository with issues enabled');
 return {repository:data.full_name,private:data.private===true};
}
export async function createGithubIssue(config,token){
 validateGithubConfig(config);const {repository}=await checkGithubRepository(config,token);
 const {data}=await request('repos/'+repository+'/issues',token,{title:config.title.trim(),body:String(config.message||'')});
 if(!Number.isSafeInteger(data?.number)||data.number<1||!Number.isSafeInteger(data.id))throw Error('GitHub creation response incomplete. Check the repository before retrying.');
 // Construct a trusted result URL; never navigate to provider-supplied redirects.
 return {source:'github',operation:'create_issue',repository,id:data.id,number:data.number,title:String(data.title||config.title).slice(0,256),url:'https://github.com/'+repository+'/issues/'+data.number,created:true};
}
