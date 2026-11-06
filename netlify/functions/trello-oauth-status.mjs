const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const clientId=process.env.TRELLO_CLIENT_ID;
 const clientSecret=process.env.TRELLO_CLIENT_SECRET;
 const configured=Boolean(clientId&&clientSecret);
 return json(200,{ok:true,provider:'trello',environment:'test',credentialsConfigured:configured,oauthAvailable:false,message:configured?'Trello application configured; secure OAuth flow is being implemented.':'Trello OAuth credentials missing on TEST.'});
}